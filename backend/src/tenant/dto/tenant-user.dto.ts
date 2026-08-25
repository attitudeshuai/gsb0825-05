import { IsNotEmpty, IsString, IsEmail, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTenantUserDto {
  @ApiProperty({ description: '用户名', example: 'user001' })
  @IsNotEmpty({ message: '用户名不能为空' })
  @IsString()
  username: string;

  @ApiProperty({ description: '邮箱', example: 'user@example.com' })
  @IsNotEmpty({ message: '邮箱不能为空' })
  @IsEmail({}, { message: '邮箱格式不正确' })
  email: string;

  @ApiProperty({ description: '密码', example: 'password123' })
  @IsNotEmpty({ message: '密码不能为空' })
  @IsString()
  password: string;

  @ApiPropertyOptional({ description: '角色', example: 'user' })
  @IsOptional()
  @IsIn(['admin', 'user'])
  role?: string;
}

export class UpdateTenantUserDto {
  @ApiPropertyOptional({ description: '邮箱', example: 'user@example.com' })
  @IsOptional()
  @IsEmail({}, { message: '邮箱格式不正确' })
  email?: string;

  @ApiPropertyOptional({ description: '密码', example: 'newpassword123' })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiPropertyOptional({ description: '角色', example: 'user' })
  @IsOptional()
  @IsIn(['admin', 'user'])
  role?: string;

  @ApiPropertyOptional({ description: '状态', example: 'active' })
  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: string;
}
