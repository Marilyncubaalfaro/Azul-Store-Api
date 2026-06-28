import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PRODUCT_SEED } from './data/seed-products';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { Product, ProductDocument } from './schemas/product.schema';

type FindProductsParams = {
  category?: string;
  offersOnly?: boolean;
};

@Injectable()
export class ProductsService implements OnModuleInit {
  private readonly logger = new Logger(ProductsService.name);
  private readonly defaultSizes = ['S', 'M', 'L'];
  private readonly maxImages = 5;

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
      const normalizedSubcategories = this.normalizeSubcategories(
        product.subcategories,
        product,
      );

      const totalStock = this.calculateTotalStock(normalizedStockBySize);
      const changedBySize =
        JSON.stringify(normalizedStockBySize) !==
        JSON.stringify(product.stockBySize);
      const changedTotal = totalStock !== product.stock;
      const changedImages =
        JSON.stringify(normalizedImages) !==
        JSON.stringify(product.images ?? []);
      const changedSubcategories =
        JSON.stringify(normalizedSubcategories) !==
        JSON.stringify(product.subcategories ?? []);

      if (
        changedBySize ||
        changedTotal ||
        changedImages ||
        changedSubcategories
      ) {
        product.stockBySize = normalizedStockBySize;
        product.stock = totalStock;
        product.images = normalizedImages;
        product.subcategories = normalizedSubcategories;
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
    const allImages = [coverImage, ...(Array.isArray(images) ? images : [])];
    const uniqueImages = Array.from(
      new Set(
        allImages.map((value) => String(value || '').trim()).filter(Boolean),
      ),
    );

    return uniqueImages.slice(0, this.maxImages);
  }

  private normalizeStockBySize(
    stockBySize: Array<{ size: string; stock: number }> | undefined,
  ) {
    const normalizedEntries = new Map<
      string,
      { size: string; stock: number }
    >();

    for (const entry of Array.isArray(stockBySize) ? stockBySize : []) {
      const size = String(entry.size || '')
        .toUpperCase()
        .trim();

      if (!size) {
        continue;
      }

      normalizedEntries.set(size, {
        size,
        stock: Math.max(0, Number(entry.stock) || 0),
      });
    }

    return Array.from(normalizedEntries.values());
  }

  private normalizeSubcategories(
    subcategories: string[] | undefined,
    product: Pick<Product, 'name' | 'brand' | 'category'>,
  ) {
    const sourceValues = Array.isArray(subcategories) ? subcategories : [];

    const inferredValues = [
      this.inferSubcategoryFromName(product.name),
      this.inferSubcategoryFromCategory(product.category),
    ];

    const uniqueValues = Array.from(
      new Set(
        [...sourceValues, ...inferredValues]
          .map((value) =>
            String(value || '')
              .trim()
              .toLowerCase(),
          )
          .filter(Boolean),
      ),
    );

    return uniqueValues.slice(0, 4);
  }

  private inferSubcategoryFromName(name: string) {
    const normalizedName = name.toLowerCase();

    if (normalizedName.includes('vestido')) {
      return 'vestidos';
    }

    if (
      normalizedName.includes('camisa') ||
      normalizedName.includes('blusa') ||
      normalizedName.includes('top')
    ) {
      return 'blusas y camisas';
    }

    if (
      normalizedName.includes('casaca') ||
      normalizedName.includes('abrigo') ||
      normalizedName.includes('coat') ||
      normalizedName.includes('jacket')
    ) {
      return 'casacas y abrigos';
    }

    if (
      normalizedName.includes('chompa') ||
      normalizedName.includes('chaleco') ||
      normalizedName.includes('sweater') ||
      normalizedName.includes('knit')
    ) {
      return 'chompas y chalecos';
    }

    if (
      normalizedName.includes('pantalon') ||
      normalizedName.includes('pant') ||
      normalizedName.includes('trouser')
    ) {
      return 'pantalones';
    }

    if (
      normalizedName.includes('enterizo') ||
      normalizedName.includes('jumpsuit') ||
      normalizedName.includes('mono')
    ) {
      return 'enterizos';
    }

    return '';
  }

  private inferSubcategoryFromCategory(category: string) {
    const normalizedCategory = category.toLowerCase();

    if (normalizedCategory === 'ropa') {
      return 'blusas y camisas';
    }

    if (normalizedCategory === 'nightwear') {
      return 'enterizos';
    }

    if (normalizedCategory === 'beachwear') {
      return 'vestidos';
    }

    return '';
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

  async createProduct(createProductDto: CreateProductDto) {
    const existingProduct = await this.productModel.findOne({
      id: createProductDto.id,
    });

    if (existingProduct) {
      throw new ConflictException(
        'Ya existe un producto con ese identificador.',
      );
    }

    const normalizedStockBySize = this.normalizeStockBySize(
      createProductDto.stockBySize,
    );

    const normalizedProduct = {
      ...createProductDto,
      category: createProductDto.category.toLowerCase().trim(),
      badge: createProductDto.badge?.trim() ?? '',
      image: createProductDto.image.trim(),
      images: this.normalizeProductImages(
        createProductDto.images,
        createProductDto.image,
      ),
      subcategories: this.normalizeSubcategories(
        createProductDto.subcategories,
        {
          name: createProductDto.name,
          brand: createProductDto.brand,
          category: createProductDto.category,
        },
      ),
      stockBySize: normalizedStockBySize,
      stock: this.calculateTotalStock(normalizedStockBySize),
      isOffer: Boolean(createProductDto.isOffer),
      originalPrice:
        createProductDto.originalPrice !== undefined
          ? Math.max(0, Number(createProductDto.originalPrice) || 0)
          : null,
    };

    return this.productModel.create(normalizedProduct);
  }

  async updateProduct(id: number, updateProductDto: UpdateProductDto) {
    const product = await this.productModel.findOne({ id });

    if (!product) {
      throw new NotFoundException('Producto no encontrado.');
    }

    const mergedStockBySize = this.normalizeStockBySize(
      updateProductDto.stockBySize ?? product.stockBySize,
    );

    const nextBrand = updateProductDto.brand ?? product.brand;
    const nextName = updateProductDto.name ?? product.name;
    const nextCategory = updateProductDto.category ?? product.category;
    const nextImage = updateProductDto.image ?? product.image;

    product.brand = nextBrand.trim();
    product.name = nextName.trim();
    product.price =
      updateProductDto.price !== undefined
        ? Math.max(0, Number(updateProductDto.price) || 0)
        : product.price;
    product.originalPrice =
      updateProductDto.originalPrice !== undefined
        ? updateProductDto.originalPrice === null
          ? null
          : Math.max(0, Number(updateProductDto.originalPrice) || 0)
        : product.originalPrice;
    product.badge =
      updateProductDto.badge !== undefined
        ? updateProductDto.badge.trim()
        : product.badge;
    product.image = nextImage.trim();
    product.images = this.normalizeProductImages(
      updateProductDto.images ?? product.images,
      nextImage,
    );
    product.subcategories = this.normalizeSubcategories(
      updateProductDto.subcategories ?? product.subcategories,
      {
        name: nextName,
        brand: nextBrand,
        category: nextCategory,
      },
    );
    product.category = nextCategory.toLowerCase().trim();
    product.isOffer = updateProductDto.isOffer ?? product.isOffer;
    product.stockBySize = mergedStockBySize;
    product.stock = this.calculateTotalStock(mergedStockBySize);

    await product.save();

    return product;
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
