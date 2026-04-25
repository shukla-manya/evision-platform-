import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DynamoService } from '../../common/dynamo/dynamo.service';

interface CachedToken {
  token: string;
  expiresAt: number;
}

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
  private readonly baseUrl = 'https://apiv2.shiprocket.in/v1/external';
  private cachedToken: CachedToken | null = null;

  constructor(
    private config: ConfigService,
    private dynamo: DynamoService,
  ) {}

  private async getToken(): Promise<string> {
    if (this.cachedToken && Date.now() < this.cachedToken.expiresAt) {
      return this.cachedToken.token;
    }
    const email = this.config.get<string>('SHIPROCKET_EMAIL');
    const password = this.config.get<string>('SHIPROCKET_PASSWORD');
    if (!email || !password) {
      throw new BadRequestException('Shiprocket credentials not configured. Set SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD.');
    }
    const res = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = (await res.json()) as Record<string, unknown>;
    if (!data.token) {
      throw new BadRequestException(`Shiprocket auth failed: ${JSON.stringify(data)}`);
    }
    // Shiprocket tokens last 10 days; refresh after 9
    this.cachedToken = { token: String(data.token), expiresAt: Date.now() + 9 * 24 * 60 * 60 * 1000 };
    return this.cachedToken.token;
  }

  private async call<T>(method: 'GET' | 'POST', path: string, body?: Record<string, unknown>): Promise<T> {
    const token = await this.getToken();
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: body ? JSON.stringify(body) : undefined,
    });
    return res.json() as Promise<T>;
  }

  async createShipment(params: ShiprocketShipParams): Promise<ShiprocketShipmentResult> {
    const pickupLocation = this.config.get<string>('SHIPROCKET_PICKUP_LOCATION', 'Primary');

    // Step 1: Create Shiprocket order
    const createRes = await this.call<Record<string, unknown>>('POST', '/orders/create/adhoc', {
      order_id: params.orderId,
      order_date: params.orderDate,
      pickup_location: pickupLocation,
      billing_customer_name: params.customerName,
      billing_phone: params.customerPhone,
      billing_address: params.deliveryAddress,
      billing_city: params.deliveryCity,
      billing_state: params.deliveryState,
      billing_country: 'India',
      billing_pincode: params.deliveryPincode,
      billing_email: '',
      shipping_is_billing: true,
      order_items: params.items,
      payment_method: 'Prepaid',
      sub_total: params.totalAmount,
      length: 10,
      breadth: 10,
      height: 10,
      weight: params.weight,
    });

    const shiprocketOrderId = String(createRes.order_id || '');
    const shipmentId = String(createRes.shipment_id || '');

    if (!shiprocketOrderId || !shipmentId) {
      this.logger.error('Shiprocket order creation response: ' + JSON.stringify(createRes));
      throw new BadRequestException('Shiprocket order creation failed: ' + JSON.stringify(createRes));
    }

    // Step 2: Auto-assign AWB via recommended courier
    const awbRes = await this.call<Record<string, unknown>>('POST', '/courier/assign/awb', {
      shipment_id: shipmentId,
    });

    // Shiprocket nests AWB data differently depending on API version
    const nested = (awbRes.response as Record<string, unknown> | undefined)?.data as Record<string, unknown> | undefined;
    const awbNumber = String(nested?.awb_code ?? awbRes.awb_code ?? '');
    const courierName = String(nested?.courier_name ?? awbRes.courier_name ?? 'Courier');

    if (!awbNumber) {
      this.logger.error('AWB assignment response: ' + JSON.stringify(awbRes));
      throw new BadRequestException('AWB assignment failed: ' + JSON.stringify(awbRes));
    }

    this.logger.log(`Shipment created for order ${params.orderId}: AWB=${awbNumber} courier=${courierName}`);
    return {
      shiprocket_order_id: shiprocketOrderId,
      shipment_id: shipmentId,
      awb_number: awbNumber,
      courier_name: courierName,
    };
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
