import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private messagingClient: admin.messaging.Messaging | null = null;
  private initAttempted = false;

  constructor(private config: ConfigService) {}

  private messaging(): admin.messaging.Messaging | null {
    if (this.messagingClient) return this.messagingClient;
    if (this.initAttempted) return null;
    this.initAttempted = true;

    try {
      const existing = admin.apps[0];
      if (existing) {
        this.messagingClient = existing.messaging();
        return this.messagingClient;
      }

      const jsonRaw = this.config.get<string>('FIREBASE_SERVICE_ACCOUNT_JSON');
      if (!jsonRaw) {
        this.logger.warn('Push disabled: FIREBASE_SERVICE_ACCOUNT_JSON is not set');
        return null;
      }
      const parsed = JSON.parse(jsonRaw) as {
        project_id: string;
        client_email: string;
        private_key: string;
      };
      const app = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: parsed.project_id,
          clientEmail: parsed.client_email,
          privateKey: parsed.private_key.replace(/\\n/g, '\n'),
        }),
      });
      this.messagingClient = app.messaging();
      this.logger.log('Firebase Admin push initialized');
      return this.messagingClient;
    } catch (error) {
      this.logger.error(`Push init failed: ${(error as Error).message}`);
      return null;
    }
  }

  async sendToToken(
    fcmToken: string | null | undefined,
    payload: { title: string; body: string; data?: Record<string, string> },
  ): Promise<void> {
    const token = String(fcmToken || '').trim();
    if (!token) return;
    const messaging = this.messaging();
    if (!messaging) return;

    try {
      await messaging.send({
        token,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: payload.data || {},
      });
    } catch (error) {
      this.logger.warn(`Push send failed: ${(error as Error).message}`);
    }
  }
}
