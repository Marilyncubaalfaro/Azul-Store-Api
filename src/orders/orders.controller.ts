import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMyOrders(@Req() request: Request) {
    const authUser = request.user as { sub: string };
    return this.ordersService.findByUserId(authUser.sub);
  }
}
