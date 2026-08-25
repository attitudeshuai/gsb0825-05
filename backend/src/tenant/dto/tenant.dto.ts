import {
  IsNotEmpty,
  IsString,
  IsEmail,
  IsOptional,
  IsInt,
  IsIn,
  Min,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const TENANT_STATUS = ['active', 'inactive', 'suspended', 'trial'];

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
  @IsInt()
  planId: number;

  @ApiPropertyOptional({
    description: '试用天数，大于 0 时创建为试用租户',
    example: 30,
  })
  @IsOptional()
  @IsInt()
  @Min(0, { message: '试用天数不能小于0' })
  trialDays?: number;

  @ApiPropertyOptional({ description: '状态', example: 'active' })
  @IsOptional()
  @IsIn(TENANT_STATUS)
  status?: string;
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

  @ApiPropertyOptional({
    description: '状态（套餐变更请使用切换套餐接口）',
    example: 'active',
  })
  @IsOptional()
  @IsIn(TENANT_STATUS)
  status?: string;
}

export class UpdateStatusDto {
  @ApiProperty({ description: '状态', example: 'active' })
  @IsNotEmpty({ message: '状态不能为空' })
  @IsIn(TENANT_STATUS)
  status: string;
}

export class CreateTenantUserDto {
  @ApiProperty({ description: '用户名', example: 'user001' })
  @IsNotEmpty({ message: '用户名不能为空' })
  @IsString()
  @MinLength(3, { message: '用户名至少3个字符' })
  @MaxLength(50, { message: '用户名最多50个字符' })
  username: string;

  @ApiProperty({ description: '邮箱', example: 'user001@example.com' })
  @IsNotEmpty({ message: '邮箱不能为空' })
  @IsEmail({}, { message: '邮箱格式不正确' })
  email: string;

  @ApiProperty({ description: '初始密码', example: 'Init@123456' })
  @IsNotEmpty({ message: '密码不能为空' })
  @IsString()
  @MinLength(6, { message: '密码至少6个字符' })
  password: string;

  @ApiPropertyOptional({ description: '角色', example: 'user' })
  @IsOptional()
  @IsIn(['admin', 'user'], { message: '角色只能是 admin 或 user' })
  role?: string;

  @ApiPropertyOptional({ description: '状态', example: 'active' })
  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: string;
}

export class UpdateTenantUserDto {
  @ApiPropertyOptional({ description: '邮箱', example: 'user001@example.com' })
  @IsOptional()
  @IsEmail({}, { message: '邮箱格式不正确' })
  email?: string;

  @ApiPropertyOptional({ description: '新密码', example: 'New@123456' })
  @IsOptional()
  @IsString()
  @MinLength(6, { message: '密码至少6个字符' })
  password?: string;

  @ApiPropertyOptional({ description: '角色', example: 'user' })
  @IsOptional()
  @IsIn(['admin', 'user'], { message: '角色只能是 admin 或 user' })
  role?: string;

  @ApiPropertyOptional({ description: '状态', example: 'active' })
  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: string;
}

export class ExtendTrialDto {
  @ApiProperty({ description: '延期天数', example: 30 })
  @IsNotEmpty({ message: '延期天数不能为空' })
  @IsInt()
  @Min(1, { message: '延期天数至少1天' })
  days: number;
}

export class ChangePlanDto {
  @ApiProperty({ description: '新套餐ID', example: 3 })
  @IsNotEmpty({ message: '新套餐ID不能为空' })
  @IsInt()
  planId: number;

  @ApiPropertyOptional({ description: '备注', example: '客户升级企业版' })
  @IsOptional()
  @IsString()
  remark?: string;
}

export class UpdateStorageDto {
  @ApiProperty({ description: '已用存储（GB）', example: 12 })
  @IsNotEmpty({ message: '存储用量不能为空' })
  @IsInt()
  @Min(0, { message: '存储用量不能小于0' })
  storageUsed: number;
}
