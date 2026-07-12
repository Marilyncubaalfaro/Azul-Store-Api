import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { NewsletterController } from './newsletter.controller';
import { NewsletterService } from './newsletter.service';
import {
  NewsletterSubscriber,
  NewsletterSubscriberSchema,
} from './schemas/newsletter-subscriber.schema';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: NewsletterSubscriber.name, schema: NewsletterSubscriberSchema },
    ]),
  ],
  controllers: [NewsletterController],
  providers: [NewsletterService],
  exports: [NewsletterService],
})
export class NewsletterModule {}
