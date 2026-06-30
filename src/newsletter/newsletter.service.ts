import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  NewsletterSubscriber,
  NewsletterSubscriberDocument,
} from './schemas/newsletter-subscriber.schema';

@Injectable()
export class NewsletterService {
  constructor(
    @InjectModel(NewsletterSubscriber.name)
    private readonly newsletterSubscriberModel: Model<NewsletterSubscriberDocument>,
  ) {}

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
}
