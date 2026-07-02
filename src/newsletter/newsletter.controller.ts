import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { SubscribeNewsletterDto } from './dto/subscribe-newsletter.dto';
import { NewsletterService } from './newsletter.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { SendNewsletterCampaignDto } from './dto/send-newsletter-campaign.dto';

@Controller('newsletter')
export class NewsletterController {
  constructor(private readonly newsletterService: NewsletterService) {}

  @Post('subscribe')
  subscribe(@Body() subscribeNewsletterDto: SubscribeNewsletterDto) {
    return this.newsletterService.subscribe(subscribeNewsletterDto.email);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('admin/subscribers')
  getSubscribers() {
    return this.newsletterService.listSubscribers();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('admin/send-campaign')
  sendCampaign(@Body() sendNewsletterCampaignDto: SendNewsletterCampaignDto) {
    return this.newsletterService.sendCampaign(sendNewsletterCampaignDto);
  }
}
