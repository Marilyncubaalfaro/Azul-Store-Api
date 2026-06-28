import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { Order, OrderDocument } from './schemas/order.schema';
import { CheckoutDto } from './dto/checkout.dto';
import { Product, ProductDocument } from '../products/schemas/product.schema';

@Injectable()
export class OrdersService {
  constructor(
    @InjectConnection()
    private readonly connection: Connection,
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
  ) {}

  findByUserId(userId: string) {
    return this.orderModel.find({ userId }).sort({ createdAt: -1 });
  }

  async checkout(userId: string, checkoutDto: CheckoutDto) {
    const session = await this.connection.startSession();

    try {
      let createdOrder: OrderDocument | null = null;

      await session.withTransaction(async () => {
        const orderItems = [] as Array<{
          productId: number;
          productName: string;
          quantity: number;
          size: string;
          unitPrice: number;
        }>;

        let total = 0;

        for (const item of checkoutDto.items) {
          const normalizedSize = item.size.toUpperCase().trim();

          const updateResult = await this.productModel.findOneAndUpdate(
            {
              id: item.productId,
              stock: { $gte: item.quantity },
              stockBySize: {
                $elemMatch: {
                  size: normalizedSize,
                  stock: { $gte: item.quantity },
                },
              },
            },
            {
              $inc: {
                stock: -item.quantity,
                'stockBySize.$[sizeEntry].stock': -item.quantity,
              },
            },
            {
              new: true,
              session,
              arrayFilters: [{ 'sizeEntry.size': normalizedSize }],
            },
          );

          if (!updateResult) {
            const productExists = await this.productModel
              .findOne({ id: item.productId })
              .session(session)
              .select({ _id: 1 })
              .lean();

            if (!productExists) {
              throw new NotFoundException(
                `Producto ${item.productId} no encontrado.`,
              );
            }

            throw new BadRequestException(
              `Stock insuficiente para producto ${item.productId} en talla ${normalizedSize}.`,
            );
          }

          const lineTotal = Number(updateResult.price) * item.quantity;
          total += lineTotal;

          orderItems.push({
            productId: item.productId,
            productName: updateResult.name,
            quantity: item.quantity,
            size: normalizedSize,
            unitPrice: Number(updateResult.price),
          });
        }

        const orderNumber = `#AZ-${Math.floor(100000 + Math.random() * 900000)}`;

        const order = new this.orderModel({
          userId,
          orderNumber,
          status: 'Pagado',
          items: orderItems,
          total,
        });

        createdOrder = await order.save({ session });
      });

      if (!createdOrder) {
        throw new BadRequestException('No se pudo crear la orden.');
      }

      return createdOrder;
    } finally {
      await session.endSession();
    }
  }
}
