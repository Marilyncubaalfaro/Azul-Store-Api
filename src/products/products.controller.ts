import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  ParseBoolPipe,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { UpdateStockDto } from './dto/update-stock.dto';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll(
    @Query('category') category?: string,
    @Query('offers', new ParseBoolPipe({ optional: true })) offers?: boolean,
  ) {
    return this.productsService.findAll({
      category,
      offersOnly: offers,
    });
  }

  @Get('offers')
  findOffers() {
    return this.productsService.findOffers();
  }

  @Get('brands')
  getBrands() {
    return this.productsService.getBrands();
  }

  @Get('category/:category')
  findByCategory(@Param('category') category: string) {
    return this.productsService.findByCategory(category);
  }

  @Get(':id')
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.findById(id);
  }

  @Patch(':id/stock')
  updateStock(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStockDto: UpdateStockDto,
  ) {
    return this.productsService.updateStock(
      id,
      updateStockDto.size,
      updateStockDto.stock,
    );
  }
}
