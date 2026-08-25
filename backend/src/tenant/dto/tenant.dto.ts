import { IsNotEmpty, IsString, IsEmail, IsOptional, IsInt, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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

  @ApiPropertyOptional({ description: '状态', example: 'active' })
  @IsOptional()
  @IsIn(['active', 'inactive', 'suspended'])
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

  @ApiPropertyOptional({ description: '套餐ID', example: 1 })
  @IsOptional()
  @IsInt()
  planId?: number;

  @ApiPropertyOptional({ description: '状态', example: 'active' })
  @IsOptional()
  @IsIn(['active', 'inactive', 'suspended'])
  status?: string;
}

export class UpdateStatusDto {
  @ApiProperty({ description: '状态', example: 'active' })
  @IsNotEmpty({ message: '状态不能为空' })
  @IsIn(['active', 'inactive', 'suspended'])
  status: string;
}
