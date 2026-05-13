import { IsDateString, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTaskDto {
  @ApiProperty({ description: 'Task title describing the work to be done', example: 'File death certificate with county clerk' })
  @IsString()
  @MinLength(2)
  title!: string;

  @ApiProperty({ description: 'Due date for the task (ISO 8601)', example: '2024-12-01', required: false })
  @IsOptional()
  @IsDateString()
  dueDate?: string;
}
