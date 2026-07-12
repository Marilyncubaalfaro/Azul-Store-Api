import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type OrderPaymentDocument = HydratedDocument<OrderPayment>;

@Schema({ _id: false })
export class OrderPaymentItem {
  @Prop({ required: true, min: 1 })
  productId: number;

  @Prop({ required: true, min: 1 })
  quantity: number;

  @Prop({ required: true, trim: true })
  size: string;
}

export const OrderPaymentItemSchema =
  SchemaFactory.createForClass(OrderPaymentItem);

@Schema({ collection: 'order_payments', timestamps: true })
export class OrderPayment {
  @Prop({ required: true, unique: true, index: true, trim: true })
  externalReference: string;

  @Prop({ required: true, index: true, trim: true })
  userId: string;

  @Prop({ required: true, trim: true, default: 'pending' })
  status: string;

  @Prop({ trim: true, default: '' })
  preferenceId: string;

  @Prop({ trim: true, default: '' })
  paymentId: string;

  @Prop({ trim: true, default: '' })
  initPoint: string;

  @Prop({ type: [OrderPaymentItemSchema], default: [] })
  items: OrderPaymentItem[];

  @Prop({ default: false })
  processedOrder: boolean;

  @Prop({ trim: true, default: '' })
  orderId: string;

  @Prop({ trim: true, default: '' })
  errorMessage: string;

  createdAt: Date;
  updatedAt: Date;
}

export const OrderPaymentSchema = SchemaFactory.createForClass(OrderPayment);
