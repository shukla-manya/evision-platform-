import { OrdersService } from './orders.service';
import { DynamoService } from '../../common/dynamo/dynamo.service';
import { EmailService } from '../emails/email.service';
import { ShiprocketService } from './shiprocket.service';
import { PushService } from '../push/push.service';
import { InvoicesService } from '../invoices/invoices.service';

describe('OrdersService', () => {
  describe('listGroupsForUser', () => {
    it('merges latest invoice PDF URLs onto each sub-order', async () => {
      const orderId = '11111111-1111-1111-1111-111111111111';
      const groupId = '22222222-2222-2222-2222-222222222222';
      const adminId = '33333333-3333-3333-3333-333333333333';

      const dynamo = {
        tableName: jest.fn((name: string) => `t_${name}`),
        query: jest.fn(),
        get: jest.fn(),
      } as unknown as DynamoService;

      const queryMock = dynamo.query as jest.Mock;
      queryMock
        .mockResolvedValueOnce([
          {
            id: groupId,
            user_id: 'u1',
            status: 'payment_confirmed',
            total_amount: 500,
            created_at: '2026-01-01T00:00:00.000Z',
          },
        ])
        .mockResolvedValueOnce([
          {
            id: orderId,
            group_id: groupId,
            user_id: 'u1',
            admin_id: adminId,
            status: 'delivered',
            total_amount: 500,
            created_at: '2026-01-01T00:00:00.000Z',
          },
        ])
        .mockResolvedValueOnce([
          {
            order_id: orderId,
            id: 'line-1',
            product_name: 'Widget',
            quantity: 1,
            unit_price: 500,
            line_total: 500,
          },
        ])
        .mockResolvedValueOnce([
          {
            id: 'inv-old',
            order_id: orderId,
            customer_invoice_url: 'https://old.example/c.pdf',
            dealer_invoice_url: null,
            gst_invoice_url: null,
            issued_at: '2026-01-02T00:00:00.000Z',
            created_at: '2026-01-02T00:00:00.000Z',
          },
          {
            id: 'inv-new',
            order_id: orderId,
            customer_invoice_url: 'https://new.example/c.pdf',
            dealer_invoice_url: 'https://new.example/d.pdf',
            gst_invoice_url: 'https://new.example/g.pdf',
            issued_at: '2026-01-03T00:00:00.000Z',
            created_at: '2026-01-03T00:00:00.000Z',
          },
        ]);

      (dynamo.get as jest.Mock).mockResolvedValue({
        id: adminId,
        shop_name: 'Test Shop',
      });

      const svc = new OrdersService(
        dynamo,
        {} as EmailService,
        {} as ShiprocketService,
        {} as S3Service,
        {} as PushService,
      );

      const rows = await svc.listGroupsForUser('u1');
      expect(rows).toHaveLength(1);
      const subs = (rows[0] as { sub_orders: Record<string, unknown>[] }).sub_orders;
      expect(subs).toHaveLength(1);
      expect(subs[0].customer_invoice_url).toBe('https://new.example/c.pdf');
      expect(subs[0].dealer_invoice_url).toBe('https://new.example/d.pdf');
      expect(subs[0].gst_invoice_url).toBe('https://new.example/g.pdf');
      expect(subs[0].shop_name).toBe('Test Shop');
    });
  });

  describe('handleShiprocketWebhook', () => {
    it('maps underscore and hyphen status strings to internal stages', async () => {
      const orderId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
      const sendStage = jest.fn().mockResolvedValue(undefined);
      const findAwb = jest.fn().mockResolvedValue({
        id: orderId,
        user_id: 'u1',
        status: 'shipment_created',
        courier_name: 'TestCourier',
      });
      const dynamo = {
        tableName: jest.fn((name: string) => `t_${name}`),
        update: jest.fn().mockResolvedValue({}),
        get: jest.fn().mockResolvedValue({ email: 'c@test.local', name: 'C' }),
        query: jest.fn(),
        queryOne: jest.fn(),
        put: jest.fn(),
      } as unknown as DynamoService;

      const svc = new OrdersService(
        dynamo,
        { sendOrderStageUpdate: sendStage } as unknown as EmailService,
        { findOrderByAwb: findAwb } as unknown as ShiprocketService,
        {} as S3Service,
        { sendToToken: jest.fn().mockResolvedValue(undefined) } as unknown as PushService,
      );

      const res = await svc.handleShiprocketWebhook({
        awb_code: 'AWB123',
        current_status: 'IN_TRANSIT',
      });
      expect(res).toMatchObject({ ok: true, order_id: orderId, status: 'in_transit' });
      expect(findAwb).toHaveBeenCalledWith('AWB123');
      expect(sendStage).toHaveBeenCalledWith(
        'c@test.local',
        expect.objectContaining({ stage: 'in_transit', orderId }),
      );
    });

    it('ignores statuses outside the actionable map', async () => {
      const dynamo = {
        tableName: jest.fn((name: string) => `t_${name}`),
        update: jest.fn(),
        get: jest.fn(),
      } as unknown as DynamoService;
      const svc = new OrdersService(
        dynamo,
        {} as EmailService,
        { findOrderByAwb: jest.fn() } as unknown as ShiprocketService,
        {} as S3Service,
        {} as PushService,
      );
      const res = await svc.handleShiprocketWebhook({
        awb_code: 'AWB123',
        current_status: 'manifested',
      });
      expect(res).toEqual(expect.objectContaining({ ok: true, ignored: true }));
      expect(dynamo.update).not.toHaveBeenCalled();
    });
  });
});
