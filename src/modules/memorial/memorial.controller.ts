import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MemorialService } from './memorial.service';
import { CreateMemorialDto, GuestbookEntryDto, UpdateMemorialDto } from './dto/memorial.dto';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('memorial')
@Controller()
export class MemorialController {
  constructor(private readonly memorialService: MemorialService) {}

  @Post('cases/:caseId/memorial')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a memorial page for a case' })
  @ApiResponse({ status: 201, description: 'Memorial page created' })
  @ApiResponse({ status: 409, description: 'Memorial page already exists for this case' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(
    @CurrentUser() user: AuthUser,
    @Param('caseId') caseId: string,
    @Body() dto: CreateMemorialDto,
  ) {
    return this.memorialService.create(user.tenantId, caseId, dto);
  }

  @Get('memorial/:slug')
  @Public()
  @ApiOperation({ summary: 'Get a published memorial page by slug (public)' })
  @ApiResponse({ status: 200, description: 'Returns memorial page' })
  @ApiResponse({ status: 404, description: 'Page not found or not published' })
  getBySlug(@Param('slug') slug: string) {
    return this.memorialService.getBySlug(slug);
  }

  @Patch('memorial/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a memorial page' })
  @ApiResponse({ status: 200, description: 'Memorial page updated' })
  @ApiResponse({ status: 404, description: 'Memorial page not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateMemorialDto,
  ) {
    return this.memorialService.update(user.tenantId, id, dto);
  }

  @Post('memorial/:slug/guestbook')
  @Public()
  @ApiOperation({ summary: 'Add a guestbook entry to a memorial page (public)' })
  @ApiResponse({ status: 201, description: 'Guestbook entry added' })
  @ApiResponse({ status: 404, description: 'Page not found or not published' })
  addGuestbookEntry(@Param('slug') slug: string, @Body() dto: GuestbookEntryDto) {
    return this.memorialService.addGuestbookEntry(slug, dto);
  }
}
