import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BrevoClient } from '@getbrevo/brevo';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly client: BrevoClient;
  private readonly from: string;

  constructor(private readonly configService: ConfigService) {
    this.client = new BrevoClient({
      apiKey: this.configService.get<string>('BREVO_API_KEY') ?? '',
    });
    this.from =
      this.configService.get<string>('MAIL_FROM') ?? 'noreply@nextudy.app';
  }

  async sendContactEmail(
    name: string,
    email: string,
    message: string,
  ): Promise<void> {
    try {
      await this.client.transactionalEmails.sendTransacEmail({
        sender: { email: this.from },
        to: [{ email: 'samed192005@gmail.com' }],
        replyTo: { email, name },
        subject: `Nextudy Contact: ${name}`,
        htmlContent: `
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Message:</strong></p>
          <p>${message.replace(/\n/g, '<br>')}</p>
        `,
      });
      this.logger.log(`Contact email sent from ${email}`);
    } catch (err) {
      this.logger.error(
        `Failed to send contact email from ${email}: ${(err as Error).message}`,
      );
      throw new InternalServerErrorException('Failed to send message');
    }
  }

  async sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
    try {
      await this.client.transactionalEmails.sendTransacEmail({
        sender: { email: this.from },
        to: [{ email: to }],
        subject: 'Reset your Nextudy password',
        htmlContent: `
          <p>You requested a password reset.</p>
          <p>Click the link below to set a new password. It expires in <strong>15 minutes</strong>.</p>
          <p><a href="${resetUrl}">Reset password</a></p>
          <p>If you didn't request this, you can safely ignore this email.</p>
        `,
      });
      this.logger.log(`Password reset email sent to ${to}`);
    } catch (err) {
      this.logger.error(
        `Failed to send password reset email to ${to}: ${(err as Error).message}`,
      );
      throw new InternalServerErrorException('Failed to send reset email');
    }
  }
}
