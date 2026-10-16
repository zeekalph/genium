import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ScanModule } from './scan/scan.module';

@Module({
  imports: [PrismaModule, ScanModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
