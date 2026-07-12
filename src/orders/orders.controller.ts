import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrdersService } from './orders.service';
import { CheckoutDto } from './dto/checkout.dto';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMyOrders(@Req() request: Request) {
    const authUser = request.user as { sub: string };
    return this.ordersService.findByUserId(authUser.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post('checkout')
  checkout(@Req() request: Request, @Body() checkoutDto: CheckoutDto) {
    const authUser = request.user as { sub: string };
    return this.ordersService.checkout(authUser.sub, checkoutDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('mercadopago/preference')
  createMercadoPagoPreference(
    @Req() request: Request,
    @Body() checkoutDto: CheckoutDto,
  ) {
    const authUser = request.user as { sub: string };
    return this.ordersService.createMercadoPagoPreference(
      authUser.sub,
      checkoutDto,
    );
  }

  @Post('mercadopago/webhook')
  mercadoPagoWebhook(
    @Query() query: Record<string, unknown>,
    @Body() body: unknown,
  ) {
    return this.ordersService.handleMercadoPagoWebhook(query, body);
  }

  @UseGuards(JwtAuthGuard)
  @Get('mercadopago/status/:externalReference')
  getMercadoPagoStatus(
    @Req() request: Request,
    @Param('externalReference') externalReference: string,
  ) {
    const authUser = request.user as { sub: string };
    return this.ordersService.getMercadoPagoStatus(
      authUser.sub,
      externalReference,
    );
  }
}
