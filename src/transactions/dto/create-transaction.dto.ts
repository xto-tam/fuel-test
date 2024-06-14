import { ApiProperty } from '@nestjs/swagger';

export class CreateTransactionDto {
  @ApiProperty({ example: '2022-01-01' })
  date: Date;

  @ApiProperty({ example: 500 })
  sum: number;

  @ApiProperty({ example: 'income' })
  source: string;

  @ApiProperty({ example: 'Salary payment', required: false })
  description?: string;
}
