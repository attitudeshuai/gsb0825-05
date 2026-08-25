import { IsNotEmpty, IsString, IsEmail, IsOptional, IsInt, IsIn, IsNumber, Min, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateTenantDto {
  @ApiProperty({ description: '租户名称', example: '示例科技有限公司' })
  @IsNotEmpty({ message: '租户名称不能为空' })
  @IsString()
  name: string;

  @ApiProperty({ description: '租户编码', example: 'TENANT001' })
  @IsNotEmpty({ message: '租户编码不能为空' })
  @IsString()
  code: string;

  @ApiProperty({ description: '联系人姓名', example: '张三' })
  @IsNotEmpty({ message: '联系人姓名不能为空' })
  @IsString()
  contactName: string;

  @ApiProperty({ description: '联系人邮箱', example: 'zhangsan@example.com' })
  @IsNotEmpty({ message: '联系人邮箱不能为空' })
  @IsEmail({}, { message: '邮箱格式不正确' })
  contactEmail: string;

  @ApiPropertyOptional({ description: '联系电话', example: '13800138000' })
  @IsOptional()
  @IsString()
  contactPhone?: string;

  @ApiPropertyOptional({ description: '地址', example: '北京市朝阳区' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ description: '套餐ID', example: 1 })
  @IsNotEmpty({ message: '套餐ID不能为空' })
  @Type(() => Number)
  @IsInt()
  planId: number;

  @ApiPropertyOptional({ description: '状态', example: 'active' })
  @IsOptional()
  @IsIn(['active', 'inactive', 'suspended', 'trial'])
  status?: string;

  @ApiPropertyOptional({ description: '试用天数（传入后租户进入试用状态）', example: 14 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: '试用天数至少为1天' })
  trialDays?: number;
}

export class UpdateTenantDto {
  @ApiPropertyOptional({ description: '租户名称', example: '示例科技有限公司' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: '租户编码', example: 'TENANT001' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ description: '联系人姓名', example: '张三' })
  @IsOptional()
  @IsString()
  contactName?: string;

  @ApiPropertyOptional({ description: '联系人邮箱', example: 'zhangsan@example.com' })
  @IsOptional()
  @IsEmail({}, { message: '邮箱格式不正确' })
  contactEmail?: string;

  @ApiPropertyOptional({ description: '联系电话', example: '13800138000' })
  @IsOptional()
  @IsString()
  contactPhone?: string;

  @ApiPropertyOptional({ description: '地址', example: '北京市朝阳区' })
  @IsOptional()
  @IsString()
  address?: string;
}

export class UpdateStatusDto {
  @ApiProperty({ description: '状态', example: 'active' })
  @IsNotEmpty({ message: '状态不能为空' })
  @IsIn(['active', 'inactive', 'suspended', 'trial'])
  status: string;
}

export class ExtendTrialDto {
  @ApiProperty({ description: '延期天数', example: 7 })
  @IsNotEmpty({ message: '延期天数不能为空' })
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: '延期天数至少为1天' })
  days: number;
}

export class ChangePlanDto {
  @ApiProperty({ description: '新套餐ID', example: 2 })
  @IsNotEmpty({ message: '新套餐ID不能为空' })
  @Type(() => Number)
  @IsInt()
  planId: number;
}

export class UpdateStorageDto {
  @ApiPropertyOptional({ description: '上报实际用量（GB，绝对值），与 delta 二选一', example: 12.5 })
  @ValidateIf((dto) => dto.delta === undefined)
  @IsNotEmpty({ message: 'storageUsed 与 delta 至少传一个' })
  @Type(() => Number)
  @IsNumber({}, { message: '用量必须是数字' })
  @Min(0, { message: '用量不能小于0' })
  storageUsed?: number;

  @ApiPropertyOptional({ description: '调整用量（GB，增量，可为负），与 storageUsed 二选一', example: 1.5 })
  @ValidateIf((dto) => dto.storageUsed === undefined)
  @IsNotEmpty({ message: 'storageUsed 与 delta 至少传一个' })
  @Type(() => Number)
  @IsNumber({}, { message: '调整量必须是数字' })
  delta?: number;
}
