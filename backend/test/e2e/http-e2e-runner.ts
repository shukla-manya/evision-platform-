/**
 * Local HTTP E2E (Dynalite + Nest TestingModule + supertest).
 * Run: `npm run test:e2e:http` (uses ts-node --transpile-only) or:
 * `npx ts-node --transpile-only -r tsconfig-paths/register test/e2e/http-e2e-runner.ts`
 *
 * AppModule is dynamic-import() after Dynalite/env are ready (avoids eager AWS graph load).
 * Jest suite: `npm run test:e2e` — see docs/qa/E2E-BUGS.md.
 */
import { strict as assert } from 'node:assert';
import { createHmac } from 'crypto';
import * as bcrypt from 'bcryptjs';
import * as http from 'http';
import * as net from 'net';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';

import { ensureEvisionDynamoTables } from '../../src/seeds/dynamo-tables.setup';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const dynalite = require('dynalite') as (o?: Record<string, unknown>) => net.Server;

function razorpayClientSignature(orderId: string, paymentId: string, secret: string): string {
  return createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');
}

function createEmailSpy(): {
  service: import('../../src/modules/emails/email.service').EmailService;
  triggers: string[];
} {
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
  ) as import('../../src/modules/emails/email.service').EmailService;
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

async function main() {
  const JWT_SECRET = process.env.JWT_SECRET || 'e2e-jwt-secret-min-32-chars-long!!';
  const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'e2e-rzp-secret-32chars-minimum!!';

  process.env.JWT_SECRET = JWT_SECRET;
  process.env.RAZORPAY_KEY_SECRET = RAZORPAY_KEY_SECRET;
  process.env.SHIPROCKET_MOCK = 'true';
  process.env.SHIPROCKET_WEBHOOK_TOKEN = 'e2e-wh-token';
  process.env.SUPERADMIN_EMAIL = 'superadmin-notify@e2e.invalid';

  const dynServer = dynalite({ createTableMs: 0 });
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
  const docClient = DynamoDBDocumentClient.from(raw, { marshallOptions: { removeUndefinedValues: true } });

  const pdfFixture = await startPdfHttpServer();
  let uploadSeq = 0;
  const s3Stub: Partial<import('../../src/common/s3/s3.service').S3Service> = {
    upload: async () => {
      uploadSeq += 1;
      return `${pdfFixture.baseUrl}/invoice-${uploadSeq}.pdf`;
    },
    mapPublicImageUrls: (urls) => urls ?? undefined,
    rewriteToConfiguredCdn: (u) => u,
    delete: async () => undefined,
    getPresignedUrl: async () => `${pdfFixture.baseUrl}/presigned`,
  };

  const emailSpy = createEmailSpy();
  const pushStub: Partial<import('../../src/modules/push/push.service').PushService> = {
    sendToToken: async () => undefined,
  };

  console.log('[e2e] dynamic-import AppModule + providers…');
  const [{ AppModule }, { EmailService: EmailCls }, { S3Service: S3Cls }, { PushService: PushCls }, { ServiceService: ServiceCls }] =
    await Promise.all([
      import('../../src/app.module'),
      import('../../src/modules/emails/email.service'),
      import('../../src/common/s3/s3.service'),
      import('../../src/modules/push/push.service'),
      import('../../src/modules/service/service.service'),
    ]);
  console.log('[e2e] Nest TestingModule.compile()…');

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(EmailCls)
    .useValue(emailSpy.service)
    .overrideProvider(S3Cls)
    .useValue(s3Stub)
    .overrideProvider(PushCls)
    .useValue(pushStub)
    .compile();
  console.log('[e2e] compile done; init HTTP app…');

  const app = moduleRef.createNestApplication({ rawBody: true });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.init();
  const jwt = moduleRef.get(JwtService);

  const customerToken = (sub: string, email: string) =>
    jwt.sign({ sub, role: 'customer', email, phone: '+919000000000' });
  const dealerToken = (sub: string, email: string) =>
    jwt.sign({ sub, role: 'dealer', email, phone: '+919000000001' });
  const adminToken = (adminId: string, email: string) =>
    jwt.sign({ sub: adminId, role: 'admin', email, phone: '+919000000002' });
  const electricianToken = (id: string, email: string) =>
    jwt.sign({ sub: id, role: 'electrician', email, phone: '+919000000003' });

  console.log('[e2e] multi-shop → payment → ship → webhook → invoice');
  {
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
    for (const [pid, aid, name, pc, pd] of [
      [productA, adminA, 'Widget A', 100, 80],
      [productB, adminB, 'Widget B', 250, 200],
    ] as const) {
      await docClient.send(
        new PutCommand({
          TableName: 'evision_products',
          Item: {
            id: pid,
            admin_id: aid,
            name,
            description: 'd',
            price_customer: pc,
            price_dealer: pd,
            stock: 50,
            category_id: categoryId,
            active: true,
            images: [],
            created_at: now,
            updated_at: now,
          },
        }),
      );
    }
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
    await request(app.getHttpServer()).post('/cart/add').set('Authorization', `Bearer ${custJwt}`).send({
      product_id: productA,
      quantity: 1,
    }).expect(201);
    await request(app.getHttpServer()).post('/cart/add').set('Authorization', `Bearer ${custJwt}`).send({
      product_id: productB,
      quantity: 2,
    }).expect(201);

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
    assert.ok(payRes.body.order_group_id);
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
    assert.equal(dup.body.duplicate, true);

    const my = await request(app.getHttpServer()).get('/orders/my').set('Authorization', `Bearer ${custJwt}`).expect(200);
    const grp = (my.body as unknown[]).find((g: any) => String(g.id) === groupId) as Record<string, unknown>;
    assert.ok(grp);
    const subs = grp.sub_orders as unknown[];
    assert.equal(subs.length, 2);
    assert.deepStrictEqual(
      subs.map((s: any) => Number(s.total_amount)).sort((a, b) => a - b),
      [100, 500],
    );
    assert.ok(emailSpy.triggers.includes('sendPaymentConfirmedCustomer'));
    assert.ok(emailSpy.triggers.filter((t) => t === 'sendPaymentConfirmedAdmin').length >= 2);

    const adminAJwt = adminToken(adminA, `a-${adminA}@e2e.invalid`);
    const listA = await request(app.getHttpServer()).get('/admin/orders').set('Authorization', `Bearer ${adminAJwt}`).expect(200);
    const orderAId = (listA.body as any[]).find((o) => String(o.admin_id) === adminA)?.id as string;
    assert.ok(orderAId);

    const shipRes = await request(app.getHttpServer())
      .post(`/admin/orders/${orderAId}/ship`)
      .set('Authorization', `Bearer ${adminAJwt}`)
      .send({ weight: 0.5 })
      .expect(201);
    const awb = String((shipRes.body as any).awb_number || '');
    assert.match(awb, /^MOCKAWB/);
    assert.ok(emailSpy.triggers.includes('sendOrderShipped'));

    await request(app.getHttpServer())
      .post('/webhooks/shiprocket')
      .set('x-api-key', 'e2e-wh-token')
      .send({ awb, current_status: 'in transit' })
      .expect(201);
    assert.ok(emailSpy.triggers.includes('sendOrderStageUpdate'));

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
    assert.ok((invScan.Items || []).length >= 1);
    assert.ok(emailSpy.triggers.includes('sendInvoiceGenerated'));

    const adminBJwt = adminToken(adminB, `b-${adminB}@e2e.invalid`);
    const listB = await request(app.getHttpServer()).get('/admin/orders').set('Authorization', `Bearer ${adminBJwt}`).expect(200);
    const orderBId = (listB.body as any[]).find((o) => String(o.admin_id) === adminB)?.id as string;
    assert.ok(orderBId);
    const shipB = await request(app.getHttpServer())
      .post(`/admin/orders/${orderBId}/ship`)
      .set('Authorization', `Bearer ${adminBJwt}`)
      .send({ weight: 0.5 })
      .expect(201);
    const awbB = String((shipB.body as any).awb_number || '');
    assert.match(awbB, /^MOCKAWB/);
    await request(app.getHttpServer())
      .post('/webhooks/shiprocket')
      .set('x-api-key', 'e2e-wh-token')
      .send({ awb: awbB, current_status: 'delivered' })
      .expect(201);
    const invB = await docClient.send(
      new ScanCommand({
        TableName: 'evision_invoices',
        FilterExpression: 'order_id = :oid',
        ExpressionAttributeValues: { ':oid': orderBId },
      }),
    );
    assert.ok((invB.Items || []).length >= 1);
  }

  console.log('[e2e] payment failure');
  {
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
    const tok = jwt.sign({ sub: userId, role: 'customer', email: `fail-${userId}@e2e.invalid`, phone: '+919000' });
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
    assert.equal(res.body.status, 'payment_failed');
    const orders = await docClient.send(
      new ScanCommand({
        TableName: 'evision_orders',
        FilterExpression: 'user_id = :u',
        ExpressionAttributeValues: { ':u': userId },
      }),
    );
    assert.equal((orders.Items || []).length, 0);
  }

  console.log('[e2e] dealer GST zip');
  {
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
    await request(app.getHttpServer()).post('/cart/add').set('Authorization', `Bearer ${dj}`).send({ product_id: productId, quantity: 2 }).expect(201);
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
    const admJwt = adminToken(adminId, `d-${adminId}@e2e.invalid`);
    const list = await request(app.getHttpServer()).get('/admin/orders').set('Authorization', `Bearer ${admJwt}`).expect(200);
    const orderId = (list.body as any[])[0].id as string;
    const shipBody = await request(app.getHttpServer())
      .post(`/admin/orders/${orderId}/ship`)
      .set('Authorization', `Bearer ${admJwt}`)
      .send({})
      .expect(201);
    const awb = String((shipBody.body as any).awb_number);
    await request(app.getHttpServer())
      .post('/webhooks/shiprocket')
      .set('x-shiprocket-token', 'e2e-wh-token')
      .send({ awb_code: awb, status: 'delivered' })
      .expect(201);
    const my = await request(app.getHttpServer()).get('/orders/my').set('Authorization', `Bearer ${dj}`).expect(200);
    const g = (my.body as any[]).find((x) => x.id === groupId);
    const sub = (g.sub_orders as any[])[0];
    assert.match(String(sub.gst_invoice_url || ''), /^http:\/\//);
    const zip = await request(app.getHttpServer())
      .get('/orders/my/gst-invoices-zip')
      .set('Authorization', `Bearer ${dj}`)
      .responseType('blob')
      .expect(200);
    assert.ok(String(zip.headers['content-type'] || '').includes('zip'));
    assert.ok(Number(zip.headers['content-length'] || 0) > 100);
  }

  console.log('[e2e] service accept → job → review');
  {
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
    const cr = await request(app.getHttpServer())
      .post('/service/request')
      .set('Authorization', `Bearer ${cj}`)
      .field('issue', 'Fan repair needed in room')
      .field('preferred_date', '2026-05-01')
      .field('time_from', '09:00')
      .field('time_to', '12:00')
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
    const ej = electricianToken(elecId, `elec-${elecId}@e2e.invalid`);
    await request(app.getHttpServer())
      .put(`/electrician/booking/${bookingId}/respond`)
      .set('Authorization', `Bearer ${ej}`)
      .send({ action: 'accept' })
      .expect(200);
    for (const st of ['on_the_way'] as const) {
      await request(app.getHttpServer())
        .put(`/electrician/job/${bookingId}/status`)
        .set('Authorization', `Bearer ${ej}`)
        .send({ status: st })
        .expect(200);
    }
    const live = await request(app.getHttpServer())
      .get(`/service/booking/${bookingId}`)
      .set('Authorization', `Bearer ${cj}`)
      .expect(200);
    assert.equal(String((live.body as any).booking?.job_status), 'on_the_way');
    assert.ok((live.body as any).electrician?.id);
    for (const st of ['reached', 'work_started', 'completed'] as const) {
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
    assert.ok((hist.body as any[]).some((b) => b.id === bookingId));
  }

  console.log('[e2e] service decline');
  {
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
    assert.equal((reqRow.Items || [])[0]?.status, 'open');
    assert.equal((reqRow.Items || [])[0]?.booked_electrician_id ?? null, null);
  }

  console.log('[e2e] booking expiry job');
  {
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
          user_id: customerId,
          electrician_id: elecId,
          status: 'pending',
          job_status: null,
          expires_at: '2000-01-01T00:00:00.000Z',
          created_at: now,
          updated_at: now,
        },
      }),
    );
    const svc = app.get(ServiceCls);
    const r = await svc.expirePendingBookings();
    assert.ok(r.expired >= 1);
    const b = await docClient.send(
      new ScanCommand({
        TableName: 'evision_service_bookings',
        FilterExpression: 'id = :id',
        ExpressionAttributeValues: { ':id': bookingId },
      }),
    );
    assert.equal((b.Items || [])[0]?.status, 'expired');
  }

  console.log('[e2e] superadmin approvals');
  {
    const pendingAdmin = uuidv4();
    const rejectAdmin = uuidv4();
    const suspendAdmin = uuidv4();
    const pendingElec = uuidv4();
    const rejectElec = uuidv4();
    const dealerUser = uuidv4();
    const now = new Date().toISOString();
    const saE2ePassword = 'e2e-superadmin-login-pw-12';
    const saEmail = String(process.env.SUPERADMIN_EMAIL || 'superadmin-notify@e2e.invalid').toLowerCase();
    await docClient.send(
      new PutCommand({
        TableName: 'evision_superadmin',
        Item: {
          id: 'SUPERADMIN',
          name: 'E2E Superadmin',
          email: saEmail,
          phone: null,
          password_hash: bcrypt.hashSync(saE2ePassword, 6),
          role: 'superadmin',
          created_at: now,
        },
      }),
    );
    const loginRes = await request(app.getHttpServer())
      .post('/auth/superadmin/login')
      .send({ email: saEmail, password: saE2ePassword });
    assert.equal(loginRes.status, 200);
    const sa = (loginRes.body as { access_token: string }).access_token;
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
    assert.equal((suspended.Items || [])[0]?.status, 'suspended');

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
    assert.equal((u.Items || [])[0]?.gst_verified, true);

    const reviewsRes = await request(app.getHttpServer())
      .get('/superadmin/reviews')
      .set('Authorization', `Bearer ${sa}`)
      .expect(200);
    const reviewRows = reviewsRes.body as { id?: string }[];
    const anyReview = reviewRows.find((r) => typeof r?.id === 'string');
    if (anyReview?.id) {
      await request(app.getHttpServer())
        .delete(`/superadmin/reviews/${anyReview.id}`)
        .set('Authorization', `Bearer ${sa}`)
        .expect(200);
    }
  }

  await app.close();
  await moduleRef.close();
  await pdfFixture.close();
  await new Promise<void>((resolve, reject) => {
    dynServer.close((err) => (err ? reject(err) : resolve()));
  });

  console.log('\n[e2e] All checks passed.\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
