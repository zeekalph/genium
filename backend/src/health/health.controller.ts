import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  getHealth() {
    return {
      status: 'ok',
      service: 'Genium Backend Verification Engine',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    };
  }
}
