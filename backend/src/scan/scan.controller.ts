import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFiles,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ScanService } from './scan.service';
import { ScanResponseDto } from './dto/scan-response.dto';
import { ScanRequestDto } from './dto/scan-request.dto';

@Controller('scan')
export class ScanController {
  constructor(private readonly scanService: ScanService) {}

  @Post()
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'image', maxCount: 1 },
      { name: 'file', maxCount: 1 },
      { name: 'blister', maxCount: 1 },
    ]),
  )
  async scanPackaging(
    @UploadedFiles()
    files: {
      image?: Express.Multer.File[];
      file?: Express.Multer.File[];
      blister?: Express.Multer.File[];
    },
    @Body() body?: ScanRequestDto,
  ): Promise<ScanResponseDto> {
    const cartonFile = files?.image?.[0] || files?.file?.[0];
    const blisterFile = files?.blister?.[0];

    if (!cartonFile) {
      throw new BadRequestException(
        'Missing required carton packaging image. Upload file under multipart key "image".',
      );
    }

    const lang = body?.lang || 'en';
    return this.scanService.processScan(cartonFile, blisterFile, lang);
  }
}
