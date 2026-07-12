import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import nodemailer from 'nodemailer';
import {
  NewsletterSubscriber,
  NewsletterSubscriberDocument,
} from './schemas/newsletter-subscriber.schema';
import { SendNewsletterCampaignDto } from './dto/send-newsletter-campaign.dto';

@Injectable()
export class NewsletterService {
  constructor(
    private readonly configService: ConfigService,
    @InjectModel(NewsletterSubscriber.name)
    private readonly newsletterSubscriberModel: Model<NewsletterSubscriberDocument>,
  ) {}

  async listSubscribers() {
    const subscribers = await this.newsletterSubscriberModel
      .find()
      .select('email createdAt -_id')
      .sort({ createdAt: -1 })
      .lean();

    return {
      count: subscribers.length,
      subscribers,
    };
  }

  async subscribe(email: string) {
    const normalizedEmail = email.toLowerCase().trim();
    const existingSubscriber = await this.newsletterSubscriberModel.findOne({
      email: normalizedEmail,
    });

    if (existingSubscriber) {
      return {
        subscribed: false,
        message: 'Ese correo ya estaba suscrito.',
      };
    }

    await this.newsletterSubscriberModel.create({ email: normalizedEmail });

    return {
      subscribed: true,
      message: 'Gracias por suscribirte a Azul Store.',
    };
  }

  async sendCampaign(sendNewsletterCampaignDto: SendNewsletterCampaignDto) {
    const subscribers = await this.newsletterSubscriberModel
      .find()
      .select('email -_id')
      .lean();

    if (subscribers.length === 0) {
      return {
        sentCount: 0,
        message: 'No hay suscriptores registrados para enviar la campaña.',
      };
    }

    const smtpHost = this.getRequiredConfig('SMTP_HOST');
    const smtpPort = Number(this.getRequiredConfig('SMTP_PORT'));
    const smtpUser = this.getRequiredConfig('SMTP_USER');
    const smtpPass = this.getRequiredConfig('SMTP_PASS');
    const fromEmail = this.getRequiredConfig('SMTP_FROM_EMAIL');
    const fromName =
      this.configService.get<string>('SMTP_FROM_NAME')?.trim() || 'Azul Store';
    const secure = this.configService.get<string>('SMTP_SECURE') === 'true';

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const recipientEmails = subscribers.map((subscriber) => subscriber.email);
    const subject = sendNewsletterCampaignDto.subject.trim();
    const message = sendNewsletterCampaignDto.message.trim();

    await transporter.sendMail({
      from: `${fromName} <${fromEmail}>`,
      to: fromEmail,
      bcc: recipientEmails,
      subject,
      text: message,
      html: this.buildHtmlMessage(subject, message),
    });

    return {
      sentCount: recipientEmails.length,
      message: `Campaña enviada a ${recipientEmails.length} suscriptor${recipientEmails.length === 1 ? '' : 'es'}.`,
    };
  }

  private getRequiredConfig(key: string) {
    const value = this.configService.get<string>(key)?.trim();
    if (!value) {
      throw new Error(`Falta configurar ${key}.`);
    }

    return value;
  }

  private buildHtmlMessage(subject: string, message: string) {
    const escapedSubject = this.escapeHtml(subject);
    const escapedMessage = this.escapeHtml(message).replace(/\n/g, '<br />');

    return `
      <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.7; padding: 24px;">
        <h1 style="font-size: 24px; margin: 0 0 16px;">${escapedSubject}</h1>
        <div style="font-size: 16px; color: #334155;">${escapedMessage}</div>
      </div>
    `;
  }

  private escapeHtml(value: string) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
