import {
  Controller,
  Get,
  Post,
  UploadedFile,
  UseInterceptors,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TransactionsService } from './transactions.service';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody, ApiQuery, ApiBearerAuth } from "@nestjs/swagger";
import { Transaction } from './entities';
import { JwtAuthGuard } from '../auth/guards';
import { UploadFileDto } from './dto';
import { memoryStorage } from 'multer';

@ApiBearerAuth()
@ApiTags('transactions')
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('upload')
  @ApiOperation({ summary: 'Upload CSV file with transactions' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'CSV file',
    type: UploadFileDto,
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(), // Use memoryStorage to handle files in memory
    }),
  )
  async uploadCSV(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File is not provided');
    }
    return this.transactionsService.uploadCSV(file);
  }

  @UseGuards(JwtAuthGuard)
  @Get('report')
  @ApiOperation({ summary: 'Get transaction report' })
  @ApiQuery({ name: 'source', required: false, example: 'income' })
  @ApiQuery({ name: 'date', required: false, example: '2022-01-01' })
  @ApiResponse({
    status: 200,
    description: 'Transaction report',
    type: [Transaction],
  })
  async getReport(
    @Query('source') source?: string,
    @Query('date') date?: string,
  ) {
    return this.transactionsService.getReport(source, date);
  }
}
