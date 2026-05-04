/* eslint-disable @typescript-eslint/no-explicit-any */
jest.mock('@aws-sdk/client-sesv2', () => {
  const sendMock = jest.fn().mockResolvedValue({ MessageId: 'ses-test-message-id' });
  (globalThis as any).__evisionSesSendMock = sendMock;
  return {
    SESv2Client: jest.fn().mockImplementation(() => ({ send: sendMock })),
    SendEmailCommand: jest.fn().mockImplementation((input: object) => ({ input })),
  };
});

import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';
import { DynamoService } from '../../common/dynamo/dynamo.service';

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(),
}));

function sesSendMock(): jest.Mock {
  return (globalThis as any).__evisionSesSendMock as jest.Mock;
}

function mockConfigSes(): ConfigService {
  const values: Record<string, string> = {
    EMAIL_TRANSPORT: 'ses',
    EMAIL_FROM: 'noreply@test.local',
    EMAIL_FROM_NAME: 'Test Sender',
    FRONTEND_URL: 'https://app.test.local',
    PUBLIC_BRAND_NAME: 'TestBrand',
    TECHNICIAN_SUPPORT_EMAIL: 'tech-support@test.local',
    AWS_REGION: 'ap-south-1',
    SMTP_HOST: 'localhost',
    SMTP_PORT: '1025',
    SMTP_USER: 'u',
    SMTP_PASS: 'p',
  };
  return {
    get: (key: string, def?: string) => values[key] ?? def,
  } as unknown as ConfigService;
}

function mockDynamo(): DynamoService {
  return {
    put: jest.fn().mockResolvedValue(undefined),
    tableName: (name: string) => name,
  } as unknown as DynamoService;
}

describe('EmailService (EMAIL_TRANSPORT=ses)', () => {
  let sendMail: jest.Mock;
  let email: EmailService;

  beforeEach(() => {
    sendMail = jest.fn().mockResolvedValue({});
    (nodemailer.createTransport as jest.Mock).mockReturnValue({ sendMail });
    sesSendMock().mockReset();
    sesSendMock().mockResolvedValue({ MessageId: 'ses-test-message-id' });
    (SendEmailCommand as unknown as jest.Mock).mockClear();
    (SESv2Client as unknown as jest.Mock).mockClear();
    email = new EmailService(mockConfigSes(), mockDynamo());
  });

  it('sends auth OTP via SES SendEmailCommand (not SMTP)', async () => {
    const r = await email.sendAuthOtpEmail('user@example.com', { code: '123456', purpose: 'login' });
    expect(r.ok).toBe(true);
    expect(sesSendMock()).toHaveBeenCalledTimes(1);
    expect(sendMail).not.toHaveBeenCalled();
    expect(SendEmailCommand).toHaveBeenCalled();
    const input = (SendEmailCommand as unknown as jest.Mock).mock.calls[0][0] as {
      FromEmailAddress: string;
      Destination: { ToAddresses: string[] };
      Content: {
        Simple: {
          Subject: { Data: string };
          Body: { Html: { Data: string } };
        };
      };
    };
    expect(input.Destination.ToAddresses).toEqual(['user@example.com']);
    expect(input.FromEmailAddress).toContain('noreply@test.local');
    expect(input.Content.Simple.Body.Html.Data).toContain('123456');
    expect(input.Content.Simple.Subject.Data.length).toBeGreaterThan(0);
  });

  it('maps PDF attachments for SES Simple', async () => {
    const pdf = Buffer.from('%PDF-1.4 test');
    await email.sendInvoiceGenerated(
      'cust@test.local',
      {
        customerName: 'Pat',
        orderId: 'ORD-1',
        invoiceNumber: 'INV-9',
        customerInvoiceUrl: 'https://example.com/i.pdf',
      },
      [{ filename: 'inv.pdf', content: pdf, contentType: 'application/pdf' }],
    );
    expect(sesSendMock()).toHaveBeenCalled();
    const input = (SendEmailCommand as unknown as jest.Mock).mock.calls[0][0] as {
      Content: {
        Simple: { Attachments?: { FileName: string; RawContent: Uint8Array }[] };
      };
    };
    expect(input.Content.Simple.Attachments?.length).toBe(1);
    expect(input.Content.Simple.Attachments?.[0].FileName).toBe('inv.pdf');
    const raw = Buffer.from(input.Content.Simple.Attachments?.[0].RawContent || []);
    expect(raw.equals(pdf)).toBe(true);
  });

  it('returns failure when SES send rejects', async () => {
    sesSendMock().mockRejectedValueOnce(new Error('SES sandbox'));
    const r = await email.sendAuthOtpEmail('user@example.com', { code: '999999', purpose: 'signup' });
    expect(r.ok).toBe(false);
    expect(r.error).toContain('SES sandbox');
  });
});
