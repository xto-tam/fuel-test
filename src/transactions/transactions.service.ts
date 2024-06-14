import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from './entities/transaction.entity';
import { Readable } from 'stream';
import { CreateTransactionDto } from './dto';
import * as csvParser from 'csv-parser';
import { parse } from 'date-fns';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private transactionsRepository: Repository<Transaction>,
  ) {}

  async uploadCSV(file: Express.Multer.File): Promise<void> {
    const transactions: CreateTransactionDto[] = [];
    const stream = Readable.from(file.buffer.toString());

    await new Promise<void>((resolve, reject) => {
      stream
        .pipe(
          csvParser({
            headers: ['date', 'sum', 'source', 'description'],
            skipLines: 1,
          }),
        )
        .on('data', (row) => {
          const transaction = new CreateTransactionDto();
          transaction.date = parse(row.date, 'dd-MM-yyyy', new Date());
          transaction.sum = parseFloat(row.sum);
          transaction.source = row.source;
          transaction.description = row.description;
          transactions.push(transaction);
        })
        .on('end', async () => {
          for (const transaction of transactions) {
            await this.transactionsRepository.save(transaction);
          }
          resolve();
        })
        .on('error', (error) => reject(error));
    });
  }

  async getReport(filterSource?: string, filterDate?: string): Promise<any> {
    let query = this.transactionsRepository.createQueryBuilder('transaction');

    if (filterSource) {
      query = query.andWhere('transaction.source = :source', {
        source: filterSource,
      });
    }

    if (filterDate) {
      const [month, year] = filterDate.split('-');
      query = query.andWhere('EXTRACT(MONTH FROM transaction.date) = :month', {
        month,
      });
      query = query.andWhere('EXTRACT(YEAR FROM transaction.date) = :year', {
        year,
      });
    }

    const transactions = await query.getMany();

    Logger.log('transactions', JSON.stringify(transactions));

    const report = transactions.reduce((acc, transaction) => {
      const month = transaction.date.getMonth() + 1;
      const monthPrefix = month > 9 ? '' : '0';
      const year = transaction.date.getFullYear();
      const monthYear = `${monthPrefix}${month}-${year}`;

      if (!acc[transaction.source]) {
        acc[transaction.source] = {};
      }
      if (!acc[transaction.source][monthYear]) {
        acc[transaction.source][monthYear] = 0;
      }
      acc[transaction.source][monthYear] += Number(transaction.sum);
      return acc;
    }, {});

    Logger.log(JSON.stringify(report));

    return Object.entries(report).map(([source, data]) => ({
      source,
      data: Object.entries(data).map(([date, total]) => ({ date, total })),
    }));
  }
}
