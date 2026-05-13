import { IsEnum, IsOptional } from 'class-validator';
import { CaseStatus } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export type DashboardFilter = 'active' | 'overdue' | 'this-month' | 'pending-signatures';

export class CaseFilterDto {
  @ApiProperty({ description: 'Filter by case status', enum: CaseStatus, required: false })
  @IsOptional()
  @IsEnum(CaseStatus)
  status?: CaseStatus;

  @ApiProperty({ description: 'Filter by assigned staff user ID', example: 'usr_01hxyz', required: false })
  @IsOptional()
  assignedToId?: string;

  @ApiProperty({
    description: 'Dashboard shortcut filter',
    enum: ['active', 'overdue', 'this-month', 'pending-signatures'],
    required: false,
  })
  @IsOptional()
  dashboardFilter?: DashboardFilter;
}
