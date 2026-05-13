import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { UpsertPaymentDto } from './dto/upsert-payment.dto';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@ApiTags('payments')
@ApiBearerAuth()
@Controller('cases/:caseId/payment')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Put()
  @ApiOperation({ summary: 'Create or update payment record for a case' })
  @ApiResponse({ status: 200, description: 'Payment record upserted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  upsert(
    @CurrentUser() user: AuthUser,
    @Param('caseId') caseId: string,
    @Body() dto: UpsertPaymentDto,
  ) {
    return this.paymentsService.upsert(user.tenantId, caseId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get the payment record for a case' })
  @ApiResponse({ status: 200, description: 'Returns payment record' })
  @ApiResponse({ status: 404, description: 'No payment record found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  get(@CurrentUser() user: AuthUser, @Param('caseId') caseId: string) {
    return this.paymentsService.findByCase(user.tenantId, caseId);
  }
}
