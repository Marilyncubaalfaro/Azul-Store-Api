import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type MediaAssetDocument = HydratedDocument<MediaAsset>;

@Schema({ collection: 'media_assets', timestamps: true })
export class MediaAsset {
  @Prop({ default: 'cloudinary', required: true })
  provider: string;

  @Prop({ required: true, unique: true, index: true, trim: true })
  publicId: string;

  @Prop({ required: true, trim: true })
  url: string;

  @Prop({ required: true, trim: true })
  secureUrl: string;

  @Prop({ required: true, trim: true })
  resourceType: string;

  @Prop({ default: '', trim: true })
  format: string;

  @Prop({ required: true, min: 0 })
  bytes: number;

  @Prop({ min: 0, default: 0 })
  width: number;

  @Prop({ min: 0, default: 0 })
  height: number;

  @Prop({ default: '', trim: true })
  originalName: string;

  @Prop({ default: '', trim: true })
  uploadedBy: string;

  createdAt: Date;
  updatedAt: Date;
}

export const MediaAssetSchema = SchemaFactory.createForClass(MediaAsset);
