import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PRODUCT_SEED } from './data/seed-products';
import { Product, ProductDocument } from './schemas/product.schema';

type FindProductsParams = {
  category?: string;
  offersOnly?: boolean;
};

@Injectable()
export class ProductsService implements OnModuleInit {
  private readonly logger = new Logger(ProductsService.name);
  private readonly defaultSizes = ['S', 'M', 'L'];

  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
  ) {}

  async onModuleInit() {
    const count = await this.productModel.estimatedDocumentCount();

    if (count === 0) {
      await this.productModel.insertMany(PRODUCT_SEED);
      this.logger.log('Catalogo inicial de productos creado.');
    }

    await this.migrateLegacyStock();
  }

  private async migrateLegacyStock() {
    const products = await this.productModel.find();
    let updatedCount = 0;

    for (const product of products) {
      const hasSizeStock =
        Array.isArray(product.stockBySize) && product.stockBySize.length > 0;

      if (!hasSizeStock) {
        const legacyStock = product.stock ?? 0;
        product.stockBySize = this.buildDefaultStockBySize(legacyStock);
      }

      const normalizedStockBySize = (product.stockBySize ?? []).map(
        (entry) => ({
          size: String(entry.size).toUpperCase().trim(),
          stock: Math.max(0, Number(entry.stock) || 0),
        }),
      );

      const normalizedImages = this.normalizeProductImages(
        product.images,
        product.image,
      );

      const totalStock = this.calculateTotalStock(normalizedStockBySize);
      const changedBySize =
        JSON.stringify(normalizedStockBySize) !==
        JSON.stringify(product.stockBySize);
      const changedTotal = totalStock !== product.stock;
      const changedImages =
        JSON.stringify(normalizedImages) !==
        JSON.stringify(product.images ?? []);

      if (changedBySize || changedTotal || changedImages) {
        product.stockBySize = normalizedStockBySize;
        product.stock = totalStock;
        product.images = normalizedImages;
        await product.save();
        updatedCount += 1;
      }
    }

    if (updatedCount > 0) {
      this.logger.log(
        `Productos normalizados con stock por talla: ${updatedCount}`,
      );
    }
  }

  private buildDefaultStockBySize(totalStock: number) {
    const safeTotal = Math.max(0, Number(totalStock) || 0);

    if (safeTotal === 0) {
      return this.defaultSizes.map((size) => ({ size, stock: 0 }));
    }

    const perSize = Math.floor(safeTotal / this.defaultSizes.length);
    let remainder = safeTotal % this.defaultSizes.length;

    return this.defaultSizes.map((size) => {
      const extra = remainder > 0 ? 1 : 0;
      remainder = Math.max(0, remainder - 1);
      return {
        size,
        stock: perSize + extra,
      };
    });
  }

  private calculateTotalStock(
    stockBySize: Array<{ size: string; stock: number }>,
  ) {
    return stockBySize.reduce(
      (acc, entry) => acc + Math.max(0, Number(entry.stock) || 0),
      0,
    );
  }

  private normalizeProductImages(
    images: string[] | undefined,
    coverImage: string,
  ) {
    const allImages = [...(Array.isArray(images) ? images : []), coverImage];
    const uniqueImages = Array.from(
      new Set(
        allImages.map((value) => String(value || '').trim()).filter(Boolean),
      ),
    );

    return uniqueImages.slice(0, 5);
  }

  findAll(params: FindProductsParams = {}) {
    const query: Record<string, unknown> = {};

    if (params.category) {
      query.category = params.category.toLowerCase();
    }

    if (params.offersOnly) {
      query.isOffer = true;
    }

    return this.productModel.find(query).sort({ id: 1 });
  }

  findOffers() {
    return this.findAll({ offersOnly: true });
  }

  findByCategory(category: string) {
    return this.findAll({ category });
  }

  async findById(id: number) {
    const product = await this.productModel.findOne({ id });

    if (!product) {
      throw new NotFoundException('Producto no encontrado.');
    }

    return product;
  }

  async updateStock(id: number, size: string, stock: number) {
    const product = await this.productModel.findOne({ id });

    if (!product) {
      throw new NotFoundException('Producto no encontrado.');
    }

    const normalizedSize = size.toUpperCase().trim();
    const safeStock = Math.max(0, stock);
    const stockBySize = Array.isArray(product.stockBySize)
      ? [...product.stockBySize]
      : [];
    const existingIndex = stockBySize.findIndex(
      (entry) => entry.size === normalizedSize,
    );

    if (existingIndex >= 0) {
      stockBySize[existingIndex] = { size: normalizedSize, stock: safeStock };
    } else {
      stockBySize.push({ size: normalizedSize, stock: safeStock });
    }

    product.stockBySize = stockBySize;
    product.stock = this.calculateTotalStock(stockBySize);
    await product.save();

    return product;
  }

  async getBrands() {
    const brands = await this.productModel.distinct('brand');
    return brands.sort((a, b) => a.localeCompare(b));
  }
}
