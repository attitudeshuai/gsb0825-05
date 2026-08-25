import { IsNotEmpty, IsOptional, IsIn, IsObject, IsString, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBillDto {
  @ApiProperty({ description: '租户ID', example: 1 })
  @IsNotEmpty({ message: '租户ID不能为空' })
  @IsInt()
  tenantId: number;

  @ApiProperty({ description: '账单金额', example: 299 })
  @IsNotEmpty({ message: '账单金额不能为空' })
  @Min(0, { message: '账单金额不能小于0' })
  amount: number;

  @ApiProperty({ description: '账单日期', example: '2024-01-01T00:00:00Z' })
  @IsNotEmpty({ message: '账单日期不能为空' })
  billDate: string;

  @ApiProperty({ description: '到期日期', example: '2024-02-01T00:00:00Z' })
  @IsNotEmpty({ message: '到期日期不能为空' })
  dueDate: string;

  @ApiPropertyOptional({ description: '状态', example: 'pending' })
  @IsOptional()
  @IsIn(['pending', 'paid', 'overdue', 'cancelled'])
  status?: string;

  @ApiProperty({ description: '账单明细', example: { planFee: { name: '专业版月费', amount: 299, quantity: 1 } } })
  @IsNotEmpty({ message: '账单明细不能为空' })
  @IsObject({ message: '账单明细必须是对象' })
  items: object;

  @ApiPropertyOptional({ description: '备注', example: '2024年1月账单' })
  @IsOptional()
  @IsString()
  remark?: string;
}

export class UpdateBillDto {
  @ApiPropertyOptional({ description: '账单金额', example: 299 })
  @IsOptional()
  @Min(0, { message: '账单金额不能小于0' })
  amount?: number;

  @ApiPropertyOptional({ description: '账单日期', example: '2024-01-01T00:00:00Z' })
  @IsOptional()
  billDate?: string;

  @ApiPropertyOptional({ description: '到期日期', example: '2024-02-01T00:00:00Z' })
  @IsOptional()
  dueDate?: string;

  @ApiPropertyOptional({ description: '状态', example: 'pending' })
  @IsOptional()
  @IsIn(['pending', 'paid', 'overdue', 'cancelled'])
  status?: string;

  @ApiPropertyOptional({ description: '账单明细', example: { planFee: { name: '专业版月费', amount: 299, quantity: 1 } } })
  @IsOptional()
  @IsObject({ message: '账单明细必须是对象' })
  items?: object;

  @ApiPropertyOptional({ description: '备注', example: '2024年1月账单' })
  @IsOptional()
  @IsString()
  remark?: string;
}

export class UpdateStatusDto {
  @ApiProperty({ description: '状态', example: 'paid' })
  @IsNotEmpty({ message: '状态不能为空' })
  @IsIn(['pending', 'paid', 'overdue', 'cancelled'])
  status: string;
}
