import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';
import { DynamoService } from '../../common/dynamo/dynamo.service';

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(),
}));

function mockConfig(): ConfigService {
  const values: Record<string, string> = {
    EMAIL_FROM: 'noreply@test.local',
    EMAIL_FROM_NAME: 'Test Sender',
    FRONTEND_URL: 'https://app.test.local',
    PUBLIC_BRAND_NAME: 'TestBrand',
    TECHNICIAN_SUPPORT_EMAIL: 'tech-support@test.local',
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

describe('EmailService', () => {
  let sendMail: jest.Mock;
  let email: EmailService;
  let dynamo: DynamoService;

  beforeEach(() => {
    sendMail = jest.fn().mockResolvedValue({});
    (nodemailer.createTransport as jest.Mock).mockReturnValue({ sendMail });
    dynamo = mockDynamo();
    email = new EmailService(mockConfig(), dynamo);
  });

  function lastHtml(): string {
    expect(sendMail).toHaveBeenCalled();
    return sendMail.mock.calls[sendMail.mock.calls.length - 1][0].html as string;
  }

  function lastTrigger(): string {
    const args = (dynamo.put as jest.Mock).mock.calls.at(-1);
    return args?.[1]?.trigger_event as string;
  }

  it('sendAdminRegistered renders branded HTML', async () => {
    await email.sendAdminRegistered('super@test.local', {
      shopName: 'ACME',
      ownerName: 'Pat',
      email: 'a@b.com',
      phone: '+910000000000',
    });
    const html = lastHtml();
    expect(html).toContain('ACME');
    expect(html).toContain('super/shop-registrations');
    expect(html).toContain('<!DOCTYPE html>');
    expect(lastTrigger()).toBe('admin_registered');
  });

  it('sendAdminApproved', async () => {
    await email.sendAdminApproved('adm@test.local', {
      ownerName: 'Pat',
      shopName: 'ACME',
      storefrontUrl: 'https://app.test.local/',
      contactUrl: 'https://app.test.local/contact',
    });
    expect(lastHtml()).toContain('https://app.test.local/');
    expect(lastHtml()).toContain('https://app.test.local/contact');
    expect(lastTrigger()).toBe('admin_approved');
  });

  it('sendAdminRejected escapes reason', async () => {
    await email.sendAdminRejected('adm@test.local', {
      ownerName: 'Pat',
      shopName: 'ACME',
      reason: '<script>x</script>',
    });
    expect(lastHtml()).not.toContain('<script>');
    expect(lastHtml()).toContain('&lt;script&gt;');
  });

  it('sendElectricianRegistered with optional rows', async () => {
    await email.sendElectricianRegistered('super@test.local', {
      name: 'Eve',
      email: 'e@e.com',
      phone: '+911',
      skills: 'wiring',
      address: 'Sector 7',
      aadhar_url: 'https://s3/a.pdf',
      photo_url: 'https://s3/p.jpg',
    });
    const html = lastHtml();
    expect(html).toContain('wiring');
    expect(html).toContain('https://s3/a.pdf');
  });

  it('sendElectricianApproved', async () => {
    await email.sendElectricianApproved('e@test.local', { name: 'Eve' });
    expect(lastHtml()).toContain('TestBrand');
  });

  it('sendDealerGstVerified', async () => {
    await email.sendDealerGstVerified('d@test.local', { name: 'Dealer' });
    expect(lastHtml()).toContain('Dealer');
  });

  it('sendElectricianRejected', async () => {
    await email.sendElectricianRejected('e@test.local', { name: 'Eve', reason: 'bad' });
    expect(lastTrigger()).toBe('electrician_rejected');
  });

  it('sendNearbyOrderAlertToElectrician', async () => {
    await email.sendNearbyOrderAlertToElectrician('e@test.local', {
      electricianName: 'Eve',
      productName: 'Wire',
      distanceKm: 2.5,
    });
    expect(lastHtml()).toContain('2.50');
  });

  it('sendServiceBookingRequestToElectrician escapes issue', async () => {
    await email.sendServiceBookingRequestToElectrician('e@test.local', {
      electricianName: 'Eve',
      issue: '<b>hi</b>',
      expiresAt: 'soon',
    });
    expect(lastHtml()).toContain('&lt;b&gt;');
  });

  it('sendClientBookingPending', async () => {
    await email.sendClientBookingPending('c@test.local', { customerName: 'C', electricianName: 'E' });
    expect(lastTrigger()).toBe('service_booking_pending');
  });

  it('sendClientBookingAccepted', async () => {
    await email.sendClientBookingAccepted('c@test.local', {
      customerName: 'C',
      electricianName: 'E',
      electricianPhone: '+91',
    });
    expect(lastHtml()).toContain('+91');
  });

  it('sendClientBookingDeclined', async () => {
    await email.sendClientBookingDeclined('c@test.local', { customerName: 'C', electricianName: 'E' });
    expect(lastTrigger()).toBe('service_booking_declined');
  });

  it('sendClientBookingExpired', async () => {
    await email.sendClientBookingExpired('c@test.local', { customerName: 'C' });
    expect(lastTrigger()).toBe('service_booking_expired');
  });

  it('sendClientJobStatusUpdate', async () => {
    await email.sendClientJobStatusUpdate('c@test.local', {
      customerName: 'C',
      electricianName: 'E',
      status: 'completed',
    });
    expect(lastHtml()).toContain('completed');
  });

  it('sendClientReviewPrompt', async () => {
    await email.sendClientReviewPrompt('c@test.local', { customerName: 'C', electricianName: 'E' });
    expect(lastHtml()).toContain('/reviews');
  });

  it('sendElectricianReviewReceived', async () => {
    await email.sendElectricianReviewReceived('e@test.local', {
      electricianName: 'Eve',
      rating: 5,
      comment: 'Great',
    });
    expect(lastHtml()).toContain('5');
  });

  it('sendPaymentConfirmedCustomer', async () => {
    await email.sendPaymentConfirmedCustomer('c@test.local', {
      customerName: 'C',
      orderGroupId: 'og-1',
      amount: 99.5,
    });
    expect(lastHtml()).toContain('99.50');
    expect(lastTrigger()).toBe('payment_confirmed');
  });

  it('sendPaymentConfirmedAdmin uses shop template and trigger', async () => {
    await email.sendPaymentConfirmedAdmin('shop@test.local', {
      shopName: 'ACME',
      orderGroupId: 'og-2',
      amount: 10,
    });
    const html = lastHtml();
    expect(html).toContain('ACME');
    expect(html).toContain('New paid order');
    expect(html).toContain('admin/orders');
    expect(lastTrigger()).toBe('payment_confirmed_admin');
  });

  it('sendPaymentFailedCustomer', async () => {
    await email.sendPaymentFailedCustomer('c@test.local', {
      customerName: 'C',
      orderGroupId: 'og-3',
      reason: 'bank',
    });
    expect(lastTrigger()).toBe('payment_failed');
  });

  it('sendOrderCancelled', async () => {
    await email.sendOrderCancelled('c@test.local', 'customer', { recipientName: 'C', orderGroupId: 'og-4' });
    expect(lastTrigger()).toBe('order_cancelled');
  });

  it('sendOrderShipped', async () => {
    await email.sendOrderShipped('c@test.local', {
      customerName: 'C',
      orderId: 'sub-1',
      trackingNumber: 'TRK',
      courierName: 'Xpress',
      trackingUrl: 'https://track.example/t',
    });
    expect(lastHtml()).toContain('TRK');
  });

  it.each(['picked_up', 'in_transit', 'out_for_delivery', 'delivered'] as const)(
    'sendOrderStageUpdate %s',
    async (stage) => {
      await email.sendOrderStageUpdate('c@test.local', {
        customerName: 'C',
        orderId: 'sub-1',
        stage,
        trackingNumber: 'TRK',
        courierName: 'X',
      });
      expect(lastTrigger()).toBe(stage);
    },
  );

  it('sendInvoiceGenerated omits dealer/gst blocks when absent', async () => {
    await email.sendInvoiceGenerated(
      'c@test.local',
      {
        customerName: 'C',
        orderId: 'o1',
        invoiceNumber: 'INV-1',
        customerInvoiceUrl: 'https://inv/customer.pdf',
      },
      [{ filename: 'INV-1-customer.pdf', content: Buffer.from('%PDF'), contentType: 'application/pdf' }],
    );
    const html = lastHtml();
    expect(html).toContain('customer.pdf');
    expect(html).not.toContain('Dealer tax invoice');
    expect(html).not.toContain('GST tax invoice');
    expect(lastTrigger()).toBe('invoice_generated');
  });

  it('sendInvoiceGenerated includes dealer and gst blocks when present', async () => {
    await email.sendInvoiceGenerated(
      'c@test.local',
      {
        customerName: 'C',
        orderId: 'o1',
        invoiceNumber: 'INV-2',
        customerInvoiceUrl: 'https://inv/c.pdf',
        dealerInvoiceUrl: 'https://inv/d.pdf',
        gstInvoiceUrl: 'https://inv/g.pdf',
      },
      [],
    );
    const html = lastHtml();
    expect(html).toContain('Dealer tax invoice');
    expect(html).toContain('GST tax invoice');
    expect(html).toContain('https://inv/d.pdf');
  });
});
