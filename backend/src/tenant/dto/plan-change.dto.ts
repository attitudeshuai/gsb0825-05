import { IsNotEmpty, IsInt, IsOptional, IsString, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChangePlanDto {
  @ApiProperty({ description: '新套餐ID', example: 2 })
  @IsNotEmpty({ message: '套餐ID不能为空' })
  @IsInt()
  planId: number;

  @ApiPropertyOptional({ description: '生效日期', example: '2024-02-01T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  effectiveDate?: string;

  @ApiPropertyOptional({ description: '备注', example: '升级到专业版' })
  @IsOptional()
  @IsString()
  remark?: string;
}

export class ExtendTrialDto {
  @ApiProperty({ description: '延长天数', example: 30 })
  @IsNotEmpty({ message: '延长天数不能为空' })
  @IsInt()
  days: number;

  @ApiPropertyOptional({ description: '备注', example: '客户要求延长试用期' })
  @IsOptional()
  @IsString()
  remark?: string;
}

export class ConvertTrialDto {
  @ApiPropertyOptional({ description: '备注', example: '客户确认购买' })
  @IsOptional()
  @IsString()
  remark?: string;
}
