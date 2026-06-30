import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type NewsletterSubscriberDocument =
  HydratedDocument<NewsletterSubscriber>;

@Schema({ collection: 'newsletter_subscribers', timestamps: true })
export class NewsletterSubscriber {
  @Prop({ required: true, unique: true, index: true, trim: true })
  email: string;

  createdAt: Date;
  updatedAt: Date;
}

export const NewsletterSubscriberSchema =
  SchemaFactory.createForClass(NewsletterSubscriber);
