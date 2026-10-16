import { Module } from '@nestjs/common';
import { ScanController } from './scan.controller';
import { ScanService } from './scan.service';
import { ExplainerService } from './explainer.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ScanController],
  providers: [ScanService, ExplainerService],
  exports: [ScanService, ExplainerService],
})
export class ScanModule {}


