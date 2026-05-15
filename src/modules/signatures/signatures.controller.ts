import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { SignaturesService } from './signatures.service';
import { RequestSignatureDto } from './dto/request-signature.dto';
import { SignDto } from './dto/sign.dto';
import {
  CurrentUser,
  AuthUser,
} from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('signatures')
@Controller()
export class SignaturesController {
  constructor(private readonly service: SignaturesService) {}

  // Authenticated — staff requests a signature
  @ApiBearerAuth()
  @Post('cases/:caseId/signatures/request')
  @ApiOperation({
    summary: 'Request an e-signature from a contact for a document',
  })
  @ApiResponse({
    status: 201,
    description: 'Signature request created and email sent',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  request(
    @CurrentUser() user: AuthUser,
    @Param('caseId') caseId: string,
    @Body() dto: RequestSignatureDto,
  ) {
    return this.service.request(user.tenantId, caseId, dto);
  }

  @ApiBearerAuth()
  @Get('cases/:caseId/signatures')
  @ApiOperation({ summary: 'List all signature requests for a case' })
  @ApiResponse({
    status: 200,
    description: 'Returns array of signature requests',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findByCase(@CurrentUser() user: AuthUser, @Param('caseId') caseId: string) {
    return this.service.findByCase(user.tenantId, caseId);
  }

  // Public signing endpoints — no auth, tokens are the authorization
  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Get('sign/:token')
  @ApiOperation({ summary: 'Get signature request details by token (public)' })
  @ApiResponse({
    status: 200,
    description: 'Returns signature request details',
  })
  @ApiResponse({ status: 404, description: 'Token not found or expired' })
  getByToken(@Param('token') token: string) {
    return this.service.findByToken(token);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('sign/:token/intent')
  @ApiOperation({
    summary: 'Confirm signing intent before submitting signature (public)',
  })
  @ApiResponse({ status: 200, description: 'Intent confirmed' })
  @ApiResponse({ status: 404, description: 'Token not found or expired' })
  confirmIntent(@Param('token') token: string) {
    return this.service.confirmIntent(token);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('sign/:token')
  @ApiOperation({ summary: 'Submit a signature for a document (public)' })
  @ApiResponse({ status: 200, description: 'Signature recorded successfully' })
  @ApiResponse({ status: 404, description: 'Token not found or expired' })
  sign(
    @Param('token') token: string,
    @Body() dto: SignDto,
    @Req() req: Request,
  ) {
    const ip = req.ip ?? '';
    return this.service.sign(token, dto, ip);
  }
}
