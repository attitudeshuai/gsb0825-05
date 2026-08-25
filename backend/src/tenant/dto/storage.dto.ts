import { IsInt, IsNotEmpty, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateStorageDto {
  @ApiProperty({
    description: '存储变化量（单位：MB），正数增加，负数减少',
    example: 100,
  })
  @IsNotEmpty({ message: '变化量不能为空' })
  @IsInt()
  delta: number;
}

export class CheckStorageDto {
  @ApiProperty({
    description: '拟申请的存储空间（单位：MB）',
    example: 200,
  })
  @IsNotEmpty({ message: '申请空间不能为空' })
  @IsInt()
  @Min(0, { message: '申请空间不能小于0' })
  requiredMb: number;
}
