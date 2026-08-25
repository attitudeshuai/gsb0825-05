import { IsNotEmpty, IsString, IsOptional, IsInt, Min, IsIn, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePlanDto {
  @ApiProperty({ description: '套餐名称', example: '专业版' })
  @IsNotEmpty({ message: '套餐名称不能为空' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: '套餐描述', example: '适合成长型企业使用' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: '价格', example: 299 })
  @IsNotEmpty({ message: '价格不能为空' })
  @Min(0, { message: '价格不能小于0' })
  price: number;

  @ApiPropertyOptional({ description: '计费周期', example: 'monthly' })
  @IsOptional()
  @IsIn(['monthly', 'quarterly', 'yearly'])
  billingCycle?: string;

  @ApiProperty({ description: '最大用户数', example: 50 })
  @IsNotEmpty({ message: '最大用户数不能为空' })
  @IsInt()
  @Min(1, { message: '最大用户数不能小于1' })
  maxUsers: number;

  @ApiProperty({ description: '最大存储空间(GB)', example: 50 })
  @IsNotEmpty({ message: '最大存储空间不能为空' })
  @IsInt()
  @Min(0, { message: '最大存储空间不能小于0' })
  maxStorage: number;

  @ApiProperty({ description: '功能特性', example: { userManagement: true, apiAccess: true } })
  @IsNotEmpty({ message: '功能特性不能为空' })
  @IsObject({ message: '功能特性必须是对象' })
  features: object;

  @ApiPropertyOptional({ description: '状态', example: 'active' })
  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: string;
}

export class UpdatePlanDto {
  @ApiPropertyOptional({ description: '套餐名称', example: '专业版' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: '套餐描述', example: '适合成长型企业使用' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '价格', example: 299 })
  @IsOptional()
  @Min(0, { message: '价格不能小于0' })
  price?: number;

  @ApiPropertyOptional({ description: '计费周期', example: 'monthly' })
  @IsOptional()
  @IsIn(['monthly', 'quarterly', 'yearly'])
  billingCycle?: string;

  @ApiPropertyOptional({ description: '最大用户数', example: 50 })
  @IsOptional()
  @IsInt()
  @Min(1, { message: '最大用户数不能小于1' })
  maxUsers?: number;

  @ApiPropertyOptional({ description: '最大存储空间(GB)', example: 50 })
  @IsOptional()
  @IsInt()
  @Min(0, { message: '最大存储空间不能小于0' })
  maxStorage?: number;

  @ApiPropertyOptional({ description: '功能特性', example: { userManagement: true, apiAccess: true } })
  @IsOptional()
  @IsObject({ message: '功能特性必须是对象' })
  features?: object;

  @ApiPropertyOptional({ description: '状态', example: 'active' })
  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: string;
}

export class UpdateStatusDto {
  @ApiProperty({ description: '状态', example: 'active' })
  @IsNotEmpty({ message: '状态不能为空' })
  @IsIn(['active', 'inactive'])
  status: string;
}
