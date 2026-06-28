import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
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

    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');
    const folder =
      this.configService.get<string>('CLOUDINARY_FOLDER') ??
      'azul-store/products';

    if (!cloudName || !apiKey || !apiSecret) {
      throw new InternalServerErrorException(
        'Faltan variables CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY o CLOUDINARY_API_SECRET.',
      );
    }

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
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
        },
        (error, result) => {
          if (error || !result) {
            reject(
              new BadRequestException(
                'No se pudo subir la imagen a Cloudinary.',
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
}
