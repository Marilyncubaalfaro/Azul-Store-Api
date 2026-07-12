import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { Order, OrderDocument } from './schemas/order.schema';
import { CheckoutDto } from './dto/checkout.dto';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import {
  OrderPayment,
  OrderPaymentDocument,
} from './schemas/order-payment.schema';

@Injectable()
export class OrdersService {
  constructor(
    private readonly configService: ConfigService,
    @InjectConnection()
    private readonly connection: Connection,
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(OrderPayment.name)
    private readonly orderPaymentModel: Model<OrderPaymentDocument>,
  ) {}

  findByUserId(userId: string) {
    return this.orderModel.find({ userId }).sort({ createdAt: -1 });
  }

  async createMercadoPagoPreference(userId: string, checkoutDto: CheckoutDto) {
    const mercadoPagoToken = this.getRequiredConfig('MERCADOPAGO_ACCESS_TOKEN');
    const clientUrl = this.getPrimaryClientUrl();
    const webhookUrl = this.getRequiredConfig('MERCADOPAGO_WEBHOOK_URL');

    const products = await this.resolveCheckoutProducts(checkoutDto);
    const externalReference = `azul-${userId}-${Date.now()}`;
    const normalizedItems = checkoutDto.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      size: item.size.toUpperCase().trim(),
    }));

    const preferencePayload = {
      items: products.map((item) => ({
        id: String(item.product.id),
        title: item.product.name,
        description: `${item.product.brand} - Talla ${item.normalizedSize}`,
        quantity: item.quantity,
        unit_price: Number(item.product.price),
        currency_id: 'PEN',
      })),
      external_reference: externalReference,
      notification_url: webhookUrl,
      binary_mode: true,
      auto_return: 'approved',
      back_urls: {
        success: `${clientUrl}/checkout/success?ref=${encodeURIComponent(externalReference)}`,
        failure: `${clientUrl}/checkout/failure?ref=${encodeURIComponent(externalReference)}`,
        pending: `${clientUrl}/checkout/pending?ref=${encodeURIComponent(externalReference)}`,
      },
    };

    const preferenceResponse = await fetch(
      'https://api.mercadopago.com/checkout/preferences',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${mercadoPagoToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferencePayload),
      },
    );

    if (!preferenceResponse.ok) {
      const errorText = await preferenceResponse.text();
      throw new BadRequestException(
        `Mercado Pago preference error: ${errorText}`,
      );
    }

    const preference = (await preferenceResponse.json()) as {
      id?: string;
      init_point?: string;
      sandbox_init_point?: string;
    };

    const checkoutUrl = preference.init_point || preference.sandbox_init_point;

    if (!checkoutUrl || !preference.id) {
      throw new BadRequestException(
        'Mercado Pago no devolvió una URL de pago válida.',
      );
    }

    await this.orderPaymentModel.create({
      externalReference,
      userId,
      status: 'pending',
      preferenceId: preference.id,
      initPoint: checkoutUrl,
      items: normalizedItems,
      processedOrder: false,
    });

    return {
      externalReference,
      checkoutUrl,
      preferenceId: preference.id,
    };
  }

  async handleMercadoPagoWebhook(
    query: Record<string, unknown>,
    body: unknown,
  ) {
    const mercadoPagoToken = this.configService
      .get<string>('MERCADOPAGO_ACCESS_TOKEN')
      ?.trim();

    if (!mercadoPagoToken) {
      return { received: true, ignored: 'missing-token' };
    }

    const paymentId = this.extractPaymentId(query, body);

    if (!paymentId) {
      return { received: true, ignored: 'missing-payment-id' };
    }

    const paymentResponse = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: {
          Authorization: `Bearer ${mercadoPagoToken}`,
        },
      },
    );

    if (!paymentResponse.ok) {
      return { received: true, ignored: 'payment-not-found' };
    }

    const paymentPayload = (await paymentResponse.json()) as {
      status?: string;
      external_reference?: string;
      id?: number;
    };

    const externalReference = String(
      paymentPayload.external_reference || '',
    ).trim();

    if (!externalReference) {
      return { received: true, ignored: 'missing-external-reference' };
    }

    const paymentRecord = await this.orderPaymentModel.findOne({
      externalReference,
    });

    if (!paymentRecord) {
      return { received: true, ignored: 'payment-record-not-found' };
    }

    paymentRecord.status = paymentPayload.status || paymentRecord.status;
    paymentRecord.paymentId = String(
      paymentPayload.id || paymentRecord.paymentId,
    );
    await paymentRecord.save();

    if (paymentPayload.status !== 'approved') {
      return { received: true, status: paymentPayload.status };
    }

    if (paymentRecord.processedOrder) {
      return { received: true, processed: true };
    }

    try {
      await this.checkout(paymentRecord.userId, {
        items: paymentRecord.items,
      });

      paymentRecord.processedOrder = true;
      paymentRecord.status = 'approved';
      paymentRecord.orderId = externalReference;
      paymentRecord.errorMessage = '';
      await paymentRecord.save();

      return { received: true, processed: true };
    } catch (error) {
      paymentRecord.errorMessage =
        error instanceof Error
          ? error.message
          : 'No se pudo crear la orden tras pago aprobado.';
      await paymentRecord.save();

      return { received: true, processed: false };
    }
  }

  async getMercadoPagoStatus(userId: string, externalReference: string) {
    const paymentRecord = await this.orderPaymentModel.findOne({
      userId,
      externalReference,
    });

    if (!paymentRecord) {
      throw new NotFoundException('No se encontró el estado del pago.');
    }

    return {
      status: paymentRecord.status,
      processedOrder: paymentRecord.processedOrder,
      orderId: paymentRecord.orderId,
      errorMessage: paymentRecord.errorMessage,
    };
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

  private async resolveCheckoutProducts(checkoutDto: CheckoutDto) {
    const resolvedItems = [] as Array<{
      product: ProductDocument;
      normalizedSize: string;
      quantity: number;
    }>;

    for (const item of checkoutDto.items) {
      const normalizedSize = item.size.toUpperCase().trim();
      const product = await this.productModel.findOne({ id: item.productId });

      if (!product) {
        throw new NotFoundException(
          `Producto ${item.productId} no encontrado.`,
        );
      }

      const sizeEntry = product.stockBySize?.find(
        (entry) => entry.size === normalizedSize,
      );

      if (!sizeEntry || Number(sizeEntry.stock) < item.quantity) {
        throw new BadRequestException(
          `Stock insuficiente para producto ${item.productId} en talla ${normalizedSize}.`,
        );
      }

      resolvedItems.push({
        product,
        normalizedSize,
        quantity: item.quantity,
      });
    }

    return resolvedItems;
  }

  private extractPaymentId(query: Record<string, unknown>, body: unknown) {
    const queryDataId = (query['data.id'] as string | undefined)?.trim();
    if (queryDataId) {
      return queryDataId;
    }

    const bodyDataId =
      body && typeof body === 'object'
        ? String(
            (body as { data?: { id?: string | number } }).data?.id || '',
          ).trim()
        : '';

    if (bodyDataId) {
      return bodyDataId;
    }

    const queryId = (query.id as string | undefined)?.trim();
    return queryId || '';
  }

  private getRequiredConfig(key: string) {
    const value = this.configService.get<string>(key)?.trim();

    if (!value) {
      throw new BadRequestException(`Falta configurar ${key}.`);
    }

    return value;
  }

  private getPrimaryClientUrl() {
    const clientOrigins = (this.configService.get<string>('CLIENT_URL') ?? '')
      .split(',')
      .map((origin) => origin.trim().replace(/\/$/, ''))
      .filter(Boolean);

    if (clientOrigins.length === 0) {
      throw new BadRequestException('Falta configurar CLIENT_URL.');
    }

    return clientOrigins[0];
  }
}
