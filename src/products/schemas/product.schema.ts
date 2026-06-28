import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ProductDocument = HydratedDocument<Product>;

@Schema({ _id: false })
export class ProductSizeStock {
  @Prop({ required: true, trim: true, uppercase: true })
  size: string;

  @Prop({ required: true, min: 0, default: 0 })
  stock: number;
}

export const ProductSizeStockSchema =
  SchemaFactory.createForClass(ProductSizeStock);

@Schema({ collection: 'products', timestamps: true })
export class Product {
  @Prop({ required: true, unique: true, index: true })
  id: number;

  @Prop({ required: true, trim: true })
  brand: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop({ type: Number, min: 0, default: null })
  originalPrice: number | null;

  @Prop({ default: '' })
  badge: string;

  @Prop({ required: true })
  image: string;

  @Prop({ type: [String], default: [] })
  images?: string[];

  @Prop({ type: [String], default: [] })
  subcategories?: string[];

  @Prop({ required: true, lowercase: true, trim: true })
  category: string;

  @Prop({ default: false })
  isOffer: boolean;

  @Prop({ type: [ProductSizeStockSchema], default: [] })
  stockBySize: ProductSizeStock[];

  @Prop({ required: true, min: 0, default: 0 })
  stock: number;

  createdAt: Date;
  updatedAt: Date;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
