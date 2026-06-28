import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type OrderDocument = HydratedDocument<Order>;

@Schema({ _id: false })
export class OrderItem {
  @Prop({ required: true, trim: true })
  productName: string;

  @Prop({ required: true, min: 1 })
  quantity: number;

  @Prop({ default: '' })
  size: string;
}

export const OrderItemSchema = SchemaFactory.createForClass(OrderItem);

@Schema({ collection: 'orders', timestamps: true })
export class Order {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, unique: true, index: true })
  orderNumber: string;

  @Prop({ required: true, trim: true, default: 'Entregado' })
  status: string;

  @Prop({ type: [OrderItemSchema], default: [] })
  items: OrderItem[];

  @Prop({ required: true, min: 0 })
  total: number;

  createdAt: Date;
  updatedAt: Date;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
