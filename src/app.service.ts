import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      name: 'azul-store-api',
      status: 'ok',
    };
  }
}
