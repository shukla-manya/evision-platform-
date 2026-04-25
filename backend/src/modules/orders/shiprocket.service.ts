import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type ShiprocketCreateShipmentInput = {
  orderId: string;
  orderDateIso: string;
  pickupLocation: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  billingAddress: string;
  billingCity: string;
  billingState: string;
  billingPincode: string;
  billingCountry: string;
  paymentMethod: 'Prepaid' | 'COD';
  subTotal: number;
  items: Array<{ name: string; sku: string; units: number; selling_price: number }>;
};

type ShiprocketCreateShipmentResult = {
  shiprocket_order_id: string | null;
  shipment_id: string | null;
  awb_number: string | null;
  courier_name: string | null;
  tracking_url: string | null;
};

@Injectable()
export class ShiprocketService {
  private readonly logger = new Logger(ShiprocketService.name);
  private token: string | null = null;
  private tokenExpiresAt = 0;

  constructor(private config: ConfigService) {}

  private baseUrl(): string {
    return this.config.get<string>('SHIPROCKET_BASE_URL') || 'https://apiv2.shiprocket.in';
  }

  private async request(path: string, init: RequestInit, requireAuth = true): Promise<any> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(init.headers as Record<string, string> | undefined),
    };
    if (requireAuth) {
      const token = await this.authToken();
      headers.Authorization = `Bearer ${token}`;
    }
    const res = await fetch(`${this.baseUrl()}${path}`, {
      ...init,
      headers,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      this.logger.error(`Shiprocket API error ${res.status} ${path}: ${JSON.stringify(data)}`);
      throw new BadRequestException('Shiprocket request failed');
    }
    return data;
  }

  private async authToken(): Promise<string> {
    const now = Date.now();
    if (this.token && now < this.tokenExpiresAt) return this.token;

    const email = this.config.get<string>('SHIPROCKET_EMAIL');
    const password = this.config.get<string>('SHIPROCKET_PASSWORD');
    if (!email || !password) {
      throw new BadRequestException('Shiprocket credentials missing in env');
    }
    const data = await this.request(
      '/v1/external/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      },
      false,
    );
    const token = String(data.token || '');
    if (!token) throw new BadRequestException('Shiprocket token not returned');
    this.token = token;
    this.tokenExpiresAt = now + 1000 * 60 * 45;
    return token;
  }

  async createShipment(input: ShiprocketCreateShipmentInput): Promise<ShiprocketCreateShipmentResult> {
    const payload = {
      order_id: input.orderId,
      order_date: input.orderDateIso,
      pickup_location: input.pickupLocation,
      channel_id: '',
      comment: 'Order from E Vision',
      billing_customer_name: input.customerName,
      billing_last_name: '',
      billing_address: input.billingAddress,
      billing_address_2: '',
      billing_city: input.billingCity,
      billing_pincode: input.billingPincode,
      billing_state: input.billingState,
      billing_country: input.billingCountry,
      billing_email: input.customerEmail,
      billing_phone: input.customerPhone,
      shipping_is_billing: true,
      order_items: input.items,
      payment_method: input.paymentMethod,
      shipping_charges: 0,
      giftwrap_charges: 0,
      transaction_charges: 0,
      total_discount: 0,
      sub_total: input.subTotal,
      length: 10,
      breadth: 10,
      height: 10,
      weight: 0.5,
    };

    const createRes = await this.request('/v1/external/orders/create/adhoc', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const shiprocketOrderId = createRes.order_id != null ? String(createRes.order_id) : null;
    const shipmentId = createRes.shipment_id != null ? String(createRes.shipment_id) : null;
    let awb = createRes.awb_code != null ? String(createRes.awb_code) : null;
    let courier = createRes.courier_name != null ? String(createRes.courier_name) : null;

    if (shipmentId && !awb) {
      const awbRes = await this.request('/v1/external/courier/assign/awb', {
        method: 'POST',
        body: JSON.stringify({ shipment_id: shipmentId }),
      });
      const carrierData = (awbRes.response && awbRes.response.data) || awbRes.data || awbRes;
      awb = carrierData.awb_code != null ? String(carrierData.awb_code) : awb;
      courier =
        carrierData.courier_name != null
          ? String(carrierData.courier_name)
          : carrierData.courier_company_name != null
            ? String(carrierData.courier_company_name)
            : courier;
    }

    return {
      shiprocket_order_id: shiprocketOrderId,
      shipment_id: shipmentId,
      awb_number: awb,
      courier_name: courier,
      tracking_url: awb ? `https://shiprocket.co/tracking/${awb}` : null,
    };
  }
}
