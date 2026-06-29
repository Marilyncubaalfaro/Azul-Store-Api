import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { randomUUID } from 'crypto';
import { UploadApiResponse, v2 as cloudinary } from 'cloudinary';
import { Model } from 'mongoose';
import { MediaAsset, MediaAssetDocument } from './schemas/media-asset.schema';

@Injectable()
export class MediaService {
  constructor(
    private readonly configService: ConfigService,
    @InjectModel(MediaAsset.name)
    private readonly mediaAssetModel: Model<MediaAssetDocument>,
  ) {}

  async uploadImage(file: Express.Multer.File, uploadedBy?: string) {
    if (!file) {
      throw new BadRequestException('Debes adjuntar una imagen.');
    }

    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('El archivo debe ser una imagen valida.');
    }

    const cloudName = this.getRequiredConfig('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.getRequiredConfig('CLOUDINARY_API_KEY');
    const apiSecret = this.getRequiredConfig('CLOUDINARY_API_SECRET');
    const folder =
      this.getOptionalConfig('CLOUDINARY_FOLDER') ?? 'azul-store/products';

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });

    const uploadResult = await this.uploadBufferToCloudinary(file, folder);

    const asset = await this.mediaAssetModel.create({
      provider: 'cloudinary',
      publicId: uploadResult.public_id,
      url: uploadResult.url,
      secureUrl: uploadResult.secure_url,
      resourceType: uploadResult.resource_type,
      format: uploadResult.format ?? '',
      bytes: uploadResult.bytes,
      width: uploadResult.width ?? 0,
      height: uploadResult.height ?? 0,
      originalName: file.originalname,
      uploadedBy: uploadedBy ?? '',
    });

    return {
      id: asset.id,
      publicId: asset.publicId,
      url: asset.url,
      secureUrl: asset.secureUrl,
      width: asset.width,
      height: asset.height,
      bytes: asset.bytes,
      format: asset.format,
      createdAt: asset.createdAt,
    };
  }

  private uploadBufferToCloudinary(
    file: Express.Multer.File,
    folder: string,
  ): Promise<UploadApiResponse> {
    const publicId = this.buildUniquePublicId(file.originalname);

    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          public_id: publicId,
          use_filename: false,
          unique_filename: false,
          overwrite: false,
          resource_type: 'image',
        },
        (error, result) => {
          if (error || !result) {
            reject(
              new BadRequestException(
                'No se pudo subir la imagen a Cloudinary. Verifica CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET.',
              ),
            );
            return;
          }

          resolve(result);
        },
      );

      stream.end(file.buffer);
    });
  }

  private buildUniquePublicId(originalName: string): string {
    const baseName = originalName
      .replace(/\.[^/.]+$/, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 30);

    const safeBaseName = baseName || 'image';
    return `${safeBaseName}-${Date.now()}-${randomUUID().slice(0, 8)}`;
  }

  private getRequiredConfig(key: string): string {
    const value = this.normalizeEnvValue(this.configService.get<string>(key));

    if (!value) {
      throw new InternalServerErrorException(`Falta variable ${key}.`);
    }

    return value;
  }

  private getOptionalConfig(key: string): string | undefined {
    return this.normalizeEnvValue(this.configService.get<string>(key));
  }

  private normalizeEnvValue(value: string | undefined): string | undefined {
    if (!value) {
      return undefined;
    }

    const trimmed = value.trim();

    // Soporta valores accidentalmente envueltos en comillas en .env o Railway.
    if (
      (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))
    ) {
      return trimmed.slice(1, -1).trim();
    }

    return trimmed;
  }
}
