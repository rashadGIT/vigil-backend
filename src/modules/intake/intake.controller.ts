import { Body, Controller, Header, Param, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { IntakeService } from './intake.service';
import { IntakeFormDto } from './dto/intake-form.dto';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('intake')
@Controller('intake')
export class IntakeController {
  constructor(private readonly intakeService: IntakeService) {}

  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Header('Access-Control-Allow-Origin', '*')
  @Header('Access-Control-Allow-Methods', 'POST, OPTIONS')
  @Post(':slug')
  @ApiOperation({
    summary: 'Submit a public intake form for a tenant (no auth required)',
  })
  @ApiResponse({
    status: 201,
    description:
      'Intake submitted — case, contact, tasks, and follow-ups created',
  })
  @ApiResponse({ status: 404, description: 'Tenant slug not found' })
  submit(@Param('slug') slug: string, @Body() dto: IntakeFormDto) {
    return this.intakeService.submit(slug, dto);
  }
}
