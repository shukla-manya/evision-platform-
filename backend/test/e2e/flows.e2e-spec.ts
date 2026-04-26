/**
 * Local E2E: Dynalite + Nest + supertest.
 * @see docs/qa/LOCAL-E2E.md
 */
import { createHmac } from 'crypto';
import * as http from 'http';
import * as net from 'net';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';

import { AppModule } from '../../src/app.module';
import { EmailService } from '../../src/modules/emails/email.service';
import { S3Service } from '../../src/common/s3/s3.service';
import { PushService } from '../../src/modules/push/push.service';
import { ServiceService } from '../../src/modules/service/service.service';
import { ensureEvisionDynamoTables } from '../../src/seeds/dynamo-tables.setup';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const dynalite = require('dynalite') as (o?: Record<string, unknown>) => net.Server;

function razorpayClientSignature(orderId: string, paymentId: string, secret: string): string {
  return createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');
}

function createEmailSpy(): { service: EmailService; triggers: string[] } {
  const triggers: string[] = [];
  const service = new Proxy(
    {},
    {
      get(_, prop: string | symbol) {
        if (typeof prop !== 'string' || prop === 'constructor') return undefined;
        return (...args: unknown[]) => {
          triggers.push(prop);
          return Promise.resolve();
        };
      },
    },
  ) as EmailService;
  return { service, triggers };
}

async function startPdfHttpServer(): Promise<{ baseUrl: string; close: () => Promise<void> }> {
  const body = Buffer.from('%PDF-1.1\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n', 'utf8');
  const server = http.createServer((_, res) => {
    res.writeHead(200, { 'Content-Type': 'application/pdf', 'Content-Length': body.length });
    res.end(body);
  });
  await new Promise<void>((resolve, reject) => {
    server.listen(0, '127.0.0.1', () => resolve());
    server.on('error', reject);
  });
  const addr = server.address() as net.AddressInfo;
  return {
    baseUrl: `http://127.0.0.1:${addr.port}`,
    close: () => new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve(undefined)))),
  };
}

describe('E2E flows (local)', () => {
  let dynServer: net.Server;
  let docClient: DynamoDBDocumentClient;
  let app: INestApplication;
  let moduleRef: TestingModule;
  let jwt: JwtService;
  let emailSpy: { service: EmailService; triggers: string[] };
  let pdfFixture: { baseUrl: string; close: () => Promise<void> };
  const JWT_SECRET = process.env.JWT_SECRET || 'e2e-jwt-secret-min-32-chars-long!!';
  const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'e2e-rzp-secret-32chars-minimum!!';

  beforeAll(async () => {
    process.env.JWT_SECRET = JWT_SECRET;
    process.env.RAZORPAY_KEY_SECRET = RAZORPAY_KEY_SECRET;
    process.env.SHIPROCKET_MOCK = 'true';
    process.env.SHIPROCKET_WEBHOOK_TOKEN = 'e2e-wh-token';
    process.env.SUPERADMIN_EMAIL = 'superadmin-notify@e2e.invalid';

    dynServer = dynalite({ createTableMs: 0 });
    await new Promise<void>((resolve, reject) => {
      dynServer.listen(0, '127.0.0.1', () => resolve());
      dynServer.on('error', reject);
    });
    const dPort = (dynServer.address() as net.AddressInfo).port;
    process.env.DYNAMODB_ENDPOINT = `http://127.0.0.1:${dPort}`;
    process.env.AWS_ACCESS_KEY_ID = 'local';
    process.env.AWS_SECRET_ACCESS_KEY = 'local';
    process.env.AWS_REGION = 'ap-south-1';

    const raw = new DynamoDBClient({
      region: 'ap-south-1',
      endpoint: process.env.DYNAMODB_ENDPOINT,
      credentials: { accessKeyId: 'local', secretAccessKey: 'local' },
    });
    await ensureEvisionDynamoTables(raw);
    docClient = DynamoDBDocumentClient.from(raw, { marshallOptions: { removeUndefinedValues: true } });

    pdfFixture = await startPdfHttpServer();
    let uploadSeq = 0;
    const s3Stub: Partial<S3Service> = {
      upload: jest.fn(async () => {
        uploadSeq += 1;
        return `${pdfFixture.baseUrl}/invoice-${uploadSeq}.pdf`;
      }),
      mapPublicImageUrls: (urls) => urls ?? undefined,
      rewriteToConfiguredCdn: (u) => u,
      delete: jest.fn(async () => undefined),
      getPresignedUrl: jest.fn(async () => `${pdfFixture.baseUrl}/presigned`),
    };

    emailSpy = createEmailSpy();
    const pushStub: Partial<PushService> = {
      sendToToken: jest.fn(async () => undefined),
    };

    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(EmailService)
      .useValue(emailSpy.service)
      .overrideProvider(S3Service)
      .useValue(s3Stub)
      .overrideProvider(PushService)
      .useValue(pushStub)
      .compile();

    app = moduleRef.createNestApplication({ rawBody: true });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    jwt = moduleRef.get(JwtService);
  });

  afterAll(async () => {
    await app?.close();
    await moduleRef?.close();
    await pdfFixture?.close();
    await new Promise<void>((resolve, reject) => {
      dynServer?.close((err) => (err ? reject(err) : resolve()));
    });
  });

  function customerToken(sub: string, email: string) {
    return jwt.sign({ sub, role: 'customer', email, phone: '+919000000000' });
  }

  function dealerToken(sub: string, email: string) {
    return jwt.sign({ sub, role: 'dealer', email, phone: '+919000000001' });
  }

  function adminToken(adminId: string, email: string) {
    return jwt.sign({ sub: adminId, role: 'admin', email, phone: '+919000000002' });
  }

  function superToken() {
    return jwt.sign({ sub: 'SUPERADMIN', role: 'superadmin', email: 'sa@e2e.invalid' });
  }

  function electricianToken(id: string, email: string) {
    return jwt.sign({ sub: id, role: 'electrician', email, phone: '+919000000003' });
  }

  it('multi-shop checkout → confirm → split sub-orders → ship → webhooks → invoice + emails', async () => {
    const categoryId = uuidv4();
    const adminA = uuidv4();
    const adminB = uuidv4();
    const productA = uuidv4();
    const productB = uuidv4();
    const customerId = uuidv4();
    const now = new Date().toISOString();

    await docClient.send(
      new PutCommand({
        TableName: 'evision_categories',
        Item: { id: categoryId, name: 'E2E Cat', parent_id: null, created_at: now },
      }),
    );
    for (const adm of [
      {
        id: adminA,
        shop_name: 'Shop A',
        owner_name: 'Owner A',
        email: `a-${adminA}@e2e.invalid`,
        phone: '+919111111001',
        status: 'approved',
        gst_no: '22AAAAA0000A1Z5',
        address: 'Addr',
        city: 'Faridabad',
        pincode: '121001',
        created_at: now,
      },
      {
        id: adminB,
        shop_name: 'Shop B',
        owner_name: 'Owner B',
        email: `b-${adminB}@e2e.invalid`,
        phone: '+919111111002',
        status: 'approved',
        gst_no: '22BBBBB0000B1Z5',
        address: 'Addr',
        city: 'Faridabad',
        pincode: '121001',
        created_at: now,
      },
    ]) {
      await docClient.send(new PutCommand({ TableName: 'evision_admins', Item: adm }));
    }

    await docClient.send(
      new PutCommand({
        TableName: 'evision_products',
        Item: {
          id: productA,
          admin_id: adminA,
          name: 'Widget A',
          description: 'd',
          price_customer: 100,
          price_dealer: 80,
          stock: 50,
          category_id: categoryId,
          active: true,
          images: [],
          created_at: now,
          updated_at: now,
        },
      }),
    );
    await docClient.send(
      new PutCommand({
        TableName: 'evision_products',
        Item: {
          id: productB,
          admin_id: adminB,
          name: 'Widget B',
          description: 'd',
          price_customer: 250,
          price_dealer: 200,
          stock: 40,
          category_id: categoryId,
          active: true,
          images: [],
          created_at: now,
          updated_at: now,
        },
      }),
    );

    await docClient.send(
      new PutCommand({
        TableName: 'evision_users',
        Item: {
          id: customerId,
          phone: '+919888877001',
          email: `cust-${customerId}@e2e.invalid`,
          role: 'customer',
          name: 'E2E Customer',
          created_at: now,
          address_book: [
            {
              is_default: true,
              lat: 28.5,
              lng: 77.3,
              city: 'TestCity',
              line1: '1 Road',
              pincode: '121001',
              state: 'Haryana',
            },
          ],
        },
      }),
    );

    const custJwt = customerToken(customerId, `cust-${customerId}@e2e.invalid`);
    await request(app.getHttpServer())
      .post('/cart/add')
      .set('Authorization', `Bearer ${custJwt}`)
      .send({ product_id: productA, quantity: 1 })
      .expect(201);
    await request(app.getHttpServer())
      .post('/cart/add')
      .set('Authorization', `Bearer ${custJwt}`)
      .send({ product_id: productB, quantity: 2 })
      .expect(201);

    const roId = `order_e2e_${uuidv4().slice(0, 24)}`;
    const payId = `pay_e2e_${uuidv4().slice(0, 24)}`;
    const sig = razorpayClientSignature(roId, payId, RAZORPAY_KEY_SECRET);

    const payRes = await request(app.getHttpServer())
      .post('/checkout/confirm')
      .set('Authorization', `Bearer ${custJwt}`)
      .send({
        status: 'success',
        razorpay_order_id: roId,
        razorpay_payment_id: payId,
        razorpay_signature: sig,
      })
      .expect(201);

    expect(payRes.body.order_group_id).toBeTruthy();
    const groupId = payRes.body.order_group_id as string;

    const dup = await request(app.getHttpServer())
      .post('/checkout/confirm')
      .set('Authorization', `Bearer ${custJwt}`)
      .send({
        status: 'success',
        razorpay_order_id: roId,
        razorpay_payment_id: payId,
        razorpay_signature: sig,
      })
      .expect(201);
    expect(dup.body.duplicate).toBe(true);

    const my = await request(app.getHttpServer())
      .get('/orders/my')
      .set('Authorization', `Bearer ${custJwt}`)
      .expect(200);
    const grp = (my.body as unknown[]).find((g: any) => String(g.id) === groupId) as Record<string, unknown>;
    expect(grp).toBeTruthy();
    const subs = grp.sub_orders as unknown[];
    expect(subs.length).toBe(2);
    const totals = subs.map((s: any) => Number(s.total_amount)).sort((a, b) => a - b);
    expect(totals).toEqual([100, 500]);

    expect(emailSpy.triggers).toContain('sendPaymentConfirmedCustomer');
    expect(emailSpy.triggers.filter((t) => t === 'sendPaymentConfirmedAdmin').length).toBeGreaterThanOrEqual(2);

    const adminAJwt = adminToken(adminA, `a-${adminA}@e2e.invalid`);
    const listA = await request(app.getHttpServer())
      .get('/admin/orders')
      .set('Authorization', `Bearer ${adminAJwt}`)
      .expect(200);
    const orderAId = (listA.body as any[]).find((o) => String(o.admin_id) === adminA)?.id as string;
    expect(orderAId).toBeTruthy();

    const shipRes = await request(app.getHttpServer())
      .post(`/admin/orders/${orderAId}/ship`)
      .set('Authorization', `Bearer ${adminAJwt}`)
      .send({ weight: 0.5 })
      .expect(201);
    const awb = String((shipRes.body as any).awb_number || '');
    expect(awb).toMatch(/^MOCKAWB/);
    expect(emailSpy.triggers).toContain('sendOrderShipped');

    await request(app.getHttpServer())
      .post('/webhooks/shiprocket')
      .set('x-api-key', 'e2e-wh-token')
      .send({ awb, current_status: 'in transit' })
      .expect(201);
    expect(emailSpy.triggers).toContain('sendOrderStageUpdate');

    await request(app.getHttpServer())
      .post('/webhooks/shiprocket')
      .set('x-api-key', 'e2e-wh-token')
      .send({ awb, current_status: 'delivered' })
      .expect(201);

    const invScan = await docClient.send(
      new ScanCommand({
        TableName: 'evision_invoices',
        FilterExpression: 'order_id = :oid',
        ExpressionAttributeValues: { ':oid': orderAId },
      }),
    );
    expect((invScan.Items || []).length).toBeGreaterThanOrEqual(1);
    expect(emailSpy.triggers).toContain('sendInvoiceGenerated');
  });

  it('payment failure creates failed group without sub-orders', async () => {
    const userId = uuidv4();
    const now = new Date().toISOString();
    await docClient.send(
      new PutCommand({
        TableName: 'evision_users',
        Item: {
          id: userId,
          phone: '+919888877002',
          email: `fail-${userId}@e2e.invalid`,
          role: 'customer',
          name: 'Fail User',
          created_at: now,
        },
      }),
    );
    const tok = customerToken(userId, `fail-${userId}@e2e.invalid`);
    const roId = `order_fail_${uuidv4().slice(0, 20)}`;
    const res = await request(app.getHttpServer())
      .post('/checkout/confirm')
      .set('Authorization', `Bearer ${tok}`)
      .send({
        status: 'failure',
        razorpay_order_id: roId,
        razorpay_payment_id: 'pay_fail_x',
        failure_reason: 'user_cancelled',
      })
      .expect(201);
    expect(res.body.status).toBe('payment_failed');

    const orders = await docClient.send(
      new ScanCommand({
        TableName: 'evision_orders',
        FilterExpression: 'user_id = :u',
        ExpressionAttributeValues: { ':u': userId },
      }),
    );
    expect((orders.Items || []).length).toBe(0);
  });

  it('dealer delivered order has GST invoice URLs and GST ZIP downloads', async () => {
    const categoryId = uuidv4();
    const adminId = uuidv4();
    const productId = uuidv4();
    const dealerId = uuidv4();
    const now = new Date().toISOString();

    await docClient.send(
      new PutCommand({
        TableName: 'evision_categories',
        Item: { id: categoryId, name: 'E2E Cat2', parent_id: null, created_at: now },
      }),
    );
    await docClient.send(
      new PutCommand({
        TableName: 'evision_admins',
        Item: {
          id: adminId,
          shop_name: 'Shop D',
          owner_name: 'Owner D',
          email: `d-${adminId}@e2e.invalid`,
          phone: '+919111111010',
          status: 'approved',
          gst_no: '22CCCCC0000C1Z5',
          address: 'Addr',
          city: 'Faridabad',
          pincode: '121001',
          created_at: now,
        },
      }),
    );
    await docClient.send(
      new PutCommand({
        TableName: 'evision_products',
        Item: {
          id: productId,
          admin_id: adminId,
          name: 'Dealer SKU',
          description: 'd',
          price_customer: 200,
          price_dealer: 100,
          stock: 99,
          category_id: categoryId,
          active: true,
          images: [],
          created_at: now,
          updated_at: now,
        },
      }),
    );
    await docClient.send(
      new PutCommand({
        TableName: 'evision_users',
        Item: {
          id: dealerId,
          phone: '+919888877003',
          email: `dealer-${dealerId}@e2e.invalid`,
          role: 'dealer',
          name: 'E2E Dealer',
          gst_no: '29ABCDE1234F1Z5',
          gst_verified: true,
          business_name: 'Biz',
          business_address: 'Addr',
          business_city: 'City',
          business_pincode: '560001',
          created_at: now,
          address_book: [
            { is_default: true, lat: 12.9, lng: 77.6, city: 'Blr', line1: 'x', pincode: '560001', state: 'KA' },
          ],
        },
      }),
    );

    const dj = dealerToken(dealerId, `dealer-${dealerId}@e2e.invalid`);
    await request(app.getHttpServer())
      .post('/cart/add')
      .set('Authorization', `Bearer ${dj}`)
      .send({ product_id: productId, quantity: 2 })
      .expect(201);

    const roId = `order_dealer_${uuidv4().slice(0, 20)}`;
    const payId = `pay_dealer_${uuidv4().slice(0, 20)}`;
    const sig = razorpayClientSignature(roId, payId, RAZORPAY_KEY_SECRET);
    const payRes = await request(app.getHttpServer())
      .post('/checkout/confirm')
      .set('Authorization', `Bearer ${dj}`)
      .send({
        status: 'success',
        razorpay_order_id: roId,
        razorpay_payment_id: payId,
        razorpay_signature: sig,
      })
      .expect(201);
    const groupId = payRes.body.order_group_id as string;

    const list = await request(app.getHttpServer())
      .get('/admin/orders')
      .set('Authorization', `Bearer ${adminToken(adminId, `d-${adminId}@e2e.invalid`)}`)
      .expect(200);
    const orderId = (list.body as any[])[0].id as string;

    const shipBody = await request(app.getHttpServer())
      .post(`/admin/orders/${orderId}/ship`)
      .set('Authorization', `Bearer ${adminToken(adminId, `d-${adminId}@e2e.invalid`)}`)
      .send({})
      .expect(201);
    const awb = String((shipBody.body as any).awb_number);

    await request(app.getHttpServer())
      .post('/webhooks/shiprocket')
      .set('x-shiprocket-token', 'e2e-wh-token')
      .send({ awb_code: awb, status: 'delivered' })
      .expect(201);

    const my = await request(app.getHttpServer())
      .get('/orders/my')
      .set('Authorization', `Bearer ${dj}`)
      .expect(200);
    const g = (my.body as any[]).find((x) => x.id === groupId);
    const sub = (g.sub_orders as any[])[0];
    expect(sub.gst_invoice_url || '').toMatch(/^http:\/\//);

    const zip = await request(app.getHttpServer())
      .get('/orders/my/gst-invoices-zip')
      .set('Authorization', `Bearer ${dj}`)
      .responseType('blob')
      .expect(200);
    expect(zip.headers['content-type']).toMatch(/zip/);
    expect(Number(zip.headers['content-length'] || 0)).toBeGreaterThan(100);
  });

  it('service booking accept → job statuses → completed → review', async () => {
    const customerId = uuidv4();
    const elecId = uuidv4();
    const now = new Date().toISOString();

    await docClient.send(
      new PutCommand({
        TableName: 'evision_users',
        Item: {
          id: customerId,
          phone: '+919888877004',
          email: `svc-c-${customerId}@e2e.invalid`,
          role: 'customer',
          name: 'Svc Customer',
          created_at: now,
        },
      }),
    );
    await docClient.send(
      new PutCommand({
        TableName: 'evision_electricians',
        Item: {
          id: elecId,
          email: `elec-${elecId}@e2e.invalid`,
          phone: '+919777766001',
          name: 'Svc Elec',
          status: 'approved',
          available: true,
          lat: 28.5,
          lng: 77.3,
          aadhar_url: 'http://x/a',
          photo_url: 'http://x/p',
          created_at: now,
        },
      }),
    );

    const cj = customerToken(customerId, `svc-c-${customerId}@e2e.invalid`);
    const reqBody = {
      issue: 'Fan repair needed in room',
      preferred_date: '2026-05-01',
      time_from: '09:00',
      time_to: '12:00',
      lat: '28.5',
      lng: '77.3',
    };
    const cr = await request(app.getHttpServer())
      .post('/service/request')
      .set('Authorization', `Bearer ${cj}`)
      .field('issue', reqBody.issue)
      .field('preferred_date', reqBody.preferred_date)
      .field('time_from', reqBody.time_from)
      .field('time_to', reqBody.time_to)
      .field('lat', reqBody.lat)
      .field('lng', reqBody.lng)
      .expect(201);
    const requestId = (cr.body as any).id as string;

    const book = await request(app.getHttpServer())
      .post(`/service/book/${elecId}`)
      .set('Authorization', `Bearer ${cj}`)
      .send({ service_request_id: requestId })
      .expect(201);
    const bookingId = (book.body as any).id as string;

    const ej = electricianToken(elecId, `elec-${elecId}@e2e.invalid`);
    await request(app.getHttpServer())
      .put(`/electrician/booking/${bookingId}/respond`)
      .set('Authorization', `Bearer ${ej}`)
      .send({ action: 'accept' })
      .expect(200);

    for (const st of ['on_the_way', 'reached', 'work_started', 'completed'] as const) {
      await request(app.getHttpServer())
        .put(`/electrician/job/${bookingId}/status`)
        .set('Authorization', `Bearer ${ej}`)
        .send({ status: st })
        .expect(200);
    }

    await request(app.getHttpServer())
      .post(`/reviews/electrician/${elecId}`)
      .set('Authorization', `Bearer ${cj}`)
      .field('rating', '5')
      .field('comment', 'Excellent e2e job')
      .expect(201);

    const hist = await request(app.getHttpServer())
      .get('/service/my/bookings/history')
      .set('Authorization', `Bearer ${cj}`)
      .expect(200);
    expect((hist.body as any[]).some((b) => b.id === bookingId)).toBe(true);
  });

  it('service booking decline reopens request', async () => {
    const customerId = uuidv4();
    const elecId = uuidv4();
    const now = new Date().toISOString();
    await docClient.send(
      new PutCommand({
        TableName: 'evision_users',
        Item: {
          id: customerId,
          phone: '+919888877005',
          email: `svc-d-${customerId}@e2e.invalid`,
          role: 'customer',
          name: 'Decline Customer',
          created_at: now,
        },
      }),
    );
    await docClient.send(
      new PutCommand({
        TableName: 'evision_electricians',
        Item: {
          id: elecId,
          email: `elec2-${elecId}@e2e.invalid`,
          phone: '+919777766002',
          name: 'Decline Elec',
          status: 'approved',
          available: true,
          lat: 28.5,
          lng: 77.3,
          aadhar_url: 'http://x/a',
          photo_url: 'http://x/p',
          created_at: now,
        },
      }),
    );
    const cj = customerToken(customerId, `svc-d-${customerId}@e2e.invalid`);
    const cr = await request(app.getHttpServer())
      .post('/service/request')
      .set('Authorization', `Bearer ${cj}`)
      .field('issue', 'Decline flow issue text here ok')
      .field('preferred_date', '2026-05-02')
      .field('time_from', '10:00')
      .field('time_to', '11:00')
      .field('lat', '28.5')
      .field('lng', '77.3')
      .expect(201);
    const requestId = (cr.body as any).id as string;
    const book = await request(app.getHttpServer())
      .post(`/service/book/${elecId}`)
      .set('Authorization', `Bearer ${cj}`)
      .send({ service_request_id: requestId })
      .expect(201);
    const bookingId = (book.body as any).id as string;
    const ej = electricianToken(elecId, `elec2-${elecId}@e2e.invalid`);
    await request(app.getHttpServer())
      .put(`/electrician/booking/${bookingId}/respond`)
      .set('Authorization', `Bearer ${ej}`)
      .send({ action: 'decline' })
      .expect(200);
    const reqRow = await docClient.send(
      new ScanCommand({
        TableName: 'evision_service_requests',
        FilterExpression: 'id = :id',
        ExpressionAttributeValues: { ':id': requestId },
      }),
    );
    expect((reqRow.Items || [])[0]?.status).toBe('open');
    expect((reqRow.Items || [])[0]?.booked_electrician_id).toBeNull();
  });

  it('expirePendingBookings marks stale pending as expired', async () => {
    const customerId = uuidv4();
    const elecId = uuidv4();
    const bookingId = uuidv4();
    const requestId = uuidv4();
    const now = new Date().toISOString();
    await docClient.send(
      new PutCommand({
        TableName: 'evision_users',
        Item: {
          id: customerId,
          phone: '+919888877006',
          email: `exp-${customerId}@e2e.invalid`,
          role: 'customer',
          name: 'Exp Customer',
          created_at: now,
        },
      }),
    );
    await docClient.send(
      new PutCommand({
        TableName: 'evision_service_requests',
        Item: {
          id: requestId,
          customer_id: customerId,
          issue: 'Expired booking test',
          lat: 28,
          lng: 77,
          status: 'booked',
          booked_electrician_id: elecId,
          created_at: now,
          updated_at: now,
        },
      }),
    );
    await docClient.send(
      new PutCommand({
        TableName: 'evision_electricians',
        Item: {
          id: elecId,
          email: `exp-e-${elecId}@e2e.invalid`,
          phone: '+919777766003',
          name: 'Exp Elec',
          status: 'approved',
          available: true,
          lat: 28,
          lng: 77,
          aadhar_url: 'http://x/a',
          photo_url: 'http://x/p',
          created_at: now,
        },
      }),
    );
    await docClient.send(
      new PutCommand({
        TableName: 'evision_service_bookings',
        Item: {
          id: bookingId,
          request_id: requestId,
          customer_id: customerId,
          electrician_id: elecId,
          status: 'pending',
          job_status: null,
          expires_at: '2000-01-01T00:00:00.000Z',
          created_at: now,
          updated_at: now,
        },
      }),
    );

    const svc = app.get(ServiceService);
    const r = await svc.expirePendingBookings();
    expect(r.expired).toBeGreaterThanOrEqual(1);
    const b = await docClient.send(
      new ScanCommand({
        TableName: 'evision_service_bookings',
        FilterExpression: 'id = :id',
        ExpressionAttributeValues: { ':id': bookingId },
      }),
    );
    expect((b.Items || [])[0]?.status).toBe('expired');
  });

  it('superadmin admin approve / reject / suspend and electrician approve / reject / dealer GST verify', async () => {
    const pendingAdmin = uuidv4();
    const rejectAdmin = uuidv4();
    const suspendAdmin = uuidv4();
    const pendingElec = uuidv4();
    const rejectElec = uuidv4();
    const dealerUser = uuidv4();
    const now = new Date().toISOString();

    for (const [id, email] of [
      [pendingAdmin, `padm-${pendingAdmin}@e2e.invalid`],
      [rejectAdmin, `radm-${rejectAdmin}@e2e.invalid`],
      [suspendAdmin, `sadm-${suspendAdmin}@e2e.invalid`],
    ] as const) {
      await docClient.send(
        new PutCommand({
          TableName: 'evision_admins',
          Item: {
            id,
            shop_name: `Shop ${id.slice(0, 4)}`,
            owner_name: 'Owner',
            email,
            phone: `+9191666${String(id.slice(0, 4)).padStart(4, '0')}`,
            status: 'pending',
            created_at: now,
          },
        }),
      );
    }

    const sa = superToken();
    await request(app.getHttpServer())
      .put(`/superadmin/admin/${pendingAdmin}/approve`)
      .set('Authorization', `Bearer ${sa}`)
      .expect(200);

    await request(app.getHttpServer())
      .put(`/superadmin/admin/${rejectAdmin}/reject`)
      .set('Authorization', `Bearer ${sa}`)
      .send({ reason: 'E2E reject' })
      .expect(200);

    await request(app.getHttpServer())
      .put(`/superadmin/admin/${suspendAdmin}/approve`)
      .set('Authorization', `Bearer ${sa}`)
      .expect(200);
    await request(app.getHttpServer())
      .put(`/superadmin/admin/${suspendAdmin}/suspend`)
      .set('Authorization', `Bearer ${sa}`)
      .expect(200);
    const suspended = await docClient.send(
      new ScanCommand({
        TableName: 'evision_admins',
        FilterExpression: 'id = :id',
        ExpressionAttributeValues: { ':id': suspendAdmin },
      }),
    );
    expect((suspended.Items || [])[0]?.status).toBe('suspended');

    await docClient.send(
      new PutCommand({
        TableName: 'evision_electricians',
        Item: {
          id: pendingElec,
          email: `pelec-${pendingElec}@e2e.invalid`,
          phone: '+91916661001',
          name: 'Pending Elec',
          status: 'pending',
          aadhar_url: 'http://x/a',
          photo_url: 'http://x/p',
          created_at: now,
        },
      }),
    );
    await docClient.send(
      new PutCommand({
        TableName: 'evision_electricians',
        Item: {
          id: rejectElec,
          email: `rejelec-${rejectElec}@e2e.invalid`,
          phone: '+91916661002',
          name: 'Reject Elec',
          status: 'pending',
          aadhar_url: 'http://x/a',
          photo_url: 'http://x/p',
          created_at: now,
        },
      }),
    );

    await request(app.getHttpServer())
      .put(`/superadmin/electrician/${pendingElec}/approve`)
      .set('Authorization', `Bearer ${sa}`)
      .send({ action: 'approve' })
      .expect(200);

    await request(app.getHttpServer())
      .put(`/superadmin/electrician/${rejectElec}/approve`)
      .set('Authorization', `Bearer ${sa}`)
      .send({ action: 'reject', reason: 'E2E' })
      .expect(200);

    await docClient.send(
      new PutCommand({
        TableName: 'evision_users',
        Item: {
          id: dealerUser,
          phone: '+919888877007',
          email: `dealer-gst-${dealerUser}@e2e.invalid`,
          role: 'dealer',
          name: 'Dealer GST',
          gst_no: '27ZZZZZ0000Z1Z1',
          gst_verified: false,
          business_name: 'B',
          business_address: 'A',
          business_city: 'C',
          business_pincode: '400001',
          created_at: now,
        },
      }),
    );

    await request(app.getHttpServer())
      .put(`/superadmin/users/${dealerUser}/verify-dealer-gst`)
      .set('Authorization', `Bearer ${sa}`)
      .expect(200);
    const u = await docClient.send(
      new ScanCommand({
        TableName: 'evision_users',
        FilterExpression: 'id = :id',
        ExpressionAttributeValues: { ':id': dealerUser },
      }),
    );
    expect((u.Items || [])[0]?.gst_verified).toBe(true);
  });
});
