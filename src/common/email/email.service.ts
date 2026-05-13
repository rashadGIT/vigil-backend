import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly provider: 'resend' | 'ses';
  private readonly resend: Resend | null;
  private readonly ses: SESClient | null;
  private readonly defaultFrom: string;

  constructor(private readonly configService: ConfigService) {
    this.provider =
      (this.configService.get<'resend' | 'ses'>('EMAIL_PROVIDER') as 'resend' | 'ses') ?? 'resend';
    this.defaultFrom =
      this.configService.get<string>('EMAIL_FROM') ?? 'noreply@kelovaapp.com';
    if (this.provider === 'resend') {
      const apiKey = this.configService.get<string>('RESEND_API_KEY') ?? '';
      this.resend = apiKey ? new Resend(apiKey) : null;
      this.ses = null;
    } else {
      this.ses = new SESClient({
        region: this.configService.get<string>('AWS_REGION') ?? 'us-east-2',
      });
      this.resend = null;
    }
  }

  async send(params: SendEmailParams): Promise<void> {
    const from = params.from ?? this.defaultFrom;
    try {
      if (this.provider === 'resend') {
        if (!this.resend) {
          this.logger.warn('[PLACEHOLDER] RESEND_API_KEY not set — email not sent');
          return;
        }
        await this.resend.emails.send({ from, to: params.to, subject: params.subject, html: params.html });
      } else {
        await this.ses!.send(
          new SendEmailCommand({
            Source: from,
            Destination: { ToAddresses: [params.to] },
            Message: {
              Subject: { Data: params.subject },
              Body: { Html: { Data: params.html } },
            },
          }),
        );
      }
    } catch (err) {
      this.logger.error(`EmailService.send failed: ${(err as Error).message}`);
    }
  }
}
