import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DynamoService } from '../../common/dynamo/dynamo.service';

export interface ShiprocketShipmentResult {
  shiprocket_order_id: string;
  shipment_id: string;
  awb_number: string;
  courier_name: string;
}

export interface ShiprocketShipParams {
  orderId: string;
  orderDate: string; // YYYY-MM-DD
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  deliveryCity: string;
  deliveryState: string;
  deliveryPincode: string;
  totalAmount: number;
  weight: number; // kg
  items: Array<{ name: string; sku: string; units: number; selling_price: number }>;
}

@Injectable()
export class ShiprocketService {
  private readonly logger = new Logger(ShiprocketService.name);
  private readonly apiBase: string;
  private token: string | null = null;
  private tokenExpiresAt = 0;

  constructor(
    private config: ConfigService,
    private dynamo: DynamoService,
  ) {
    this.apiBase = `${config.get<string>('SHIPROCKET_BASE_URL', 'https://apiv2.shiprocket.in')}/v1/external`;
  }

  private async getToken(): Promise<string> {
    if (this.token && Date.now() < this.tokenExpiresAt) return this.token;

    const email = this.config.get<string>('SHIPROCKET_EMAIL');
    const password = this.config.get<string>('SHIPROCKET_PASSWORD');
    if (!email || !password) {
      throw new BadRequestException('Shiprocket credentials not configured. Set SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD.');
    }
    const res = await fetch(`${this.apiBase}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    const token = String(data.token || '');
    if (!token) {
      throw new BadRequestException(`Shiprocket authentication failed: ${JSON.stringify(data)}`);
    }
    this.token = token;
    this.tokenExpiresAt = Date.now() + 45 * 60 * 1000; // 45-minute safety margin (tokens last 10 days)
    return token;
  }

  private async api<T>(path: string, method: 'GET' | 'POST', body?: Record<string, unknown>): Promise<T> {
    const token = await this.getToken();
    const res = await fetch(`${this.apiBase}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      this.logger.error(`Shiprocket ${method} ${path} → ${res.status}: ${JSON.stringify(data)}`);
      throw new BadRequestException(`Shiprocket request failed: ${JSON.stringify(data)}`);
    }
    return data as T;
  }

  async createShipment(params: ShiprocketShipParams): Promise<ShiprocketShipmentResult> {
    const pickupLocation = this.config.get<string>('SHIPROCKET_PICKUP_LOCATION', 'Primary');

    const createRes = await this.api<Record<string, unknown>>('/orders/create/adhoc', 'POST', {
      order_id: params.orderId,
      order_date: params.orderDate,
      pickup_location: pickupLocation,
      billing_customer_name: params.customerName,
      billing_phone: params.customerPhone,
      billing_email: '',
      billing_address: params.deliveryAddress,
      billing_city: params.deliveryCity,
      billing_state: params.deliveryState,
      billing_country: 'India',
      billing_pincode: params.deliveryPincode,
      shipping_is_billing: true,
      order_items: params.items,
      payment_method: 'Prepaid',
      shipping_charges: 0,
      total_discount: 0,
      sub_total: params.totalAmount,
      length: 10,
      breadth: 10,
      height: 10,
      weight: params.weight,
    });

    const shiprocketOrderId = String(createRes.order_id || '');
    const shipmentId = String(createRes.shipment_id || '');

    if (!shiprocketOrderId || !shipmentId) {
      throw new BadRequestException(`Shiprocket order creation failed: ${JSON.stringify(createRes)}`);
    }

    // Auto-assign AWB
    let awb = String(createRes.awb_code || '');
    let courierName = String(createRes.courier_name || '');

    if (!awb) {
      const awbRes = await this.api<Record<string, unknown>>('/courier/assign/awb', 'POST', {
        shipment_id: shipmentId,
      });
      const d = ((awbRes.response as Record<string, unknown>)?.data ?? awbRes) as Record<string, unknown>;
      awb = String(d.awb_code || awbRes.awb_code || '');
      courierName = String(d.courier_name ?? d.courier_company_name ?? awbRes.courier_name ?? 'Courier');
    }

    if (!awb) {
      throw new BadRequestException(`AWB assignment failed: ${JSON.stringify({ shiprocketOrderId, shipmentId })}`);
    }

    this.logger.log(`Shipment created: order=${params.orderId} AWB=${awb} courier=${courierName}`);
    return { shiprocket_order_id: shiprocketOrderId, shipment_id: shipmentId, awb_number: awb, courier_name: courierName };
  }

  async findOrderByAwb(awb: string): Promise<Record<string, unknown> | null> {
    const items = await this.dynamo.scan({
      TableName: this.dynamo.tableName('orders'),
      FilterExpression: 'awb_number = :awb',
      ExpressionAttributeValues: { ':awb': awb },
    });
    return (items[0] as Record<string, unknown>) ?? null;
  }

  trackingUrl(awb: string): string {
    return `https://shiprocket.co/tracking/${awb}`;
  }
}
