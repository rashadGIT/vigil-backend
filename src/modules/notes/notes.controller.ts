import { Body, Controller, Delete, Get, HttpCode, Param, Post } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { NotesService } from './notes.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@ApiTags('notes')
@ApiBearerAuth()
@Controller('cases/:caseId/notes')
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Get()
  @ApiOperation({ summary: 'List all notes for a case' })
  @ApiResponse({ status: 200, description: 'Returns notes newest-first' })
  findAll(@CurrentUser() user: AuthUser, @Param('caseId') caseId: string) {
    return this.notesService.findByCase(user.tenantId, caseId);
  }

  @Post()
  @ApiOperation({ summary: 'Add an internal note to a case' })
  @ApiResponse({ status: 201, description: 'Note created' })
  create(
    @CurrentUser() user: AuthUser,
    @Param('caseId') caseId: string,
    @Body() dto: CreateNoteDto,
  ) {
    return this.notesService.create(user.tenantId, caseId, user.sub, dto);
  }

  @Delete(':noteId')
  @HttpCode(200)
  @ApiOperation({ summary: 'Soft-delete a note' })
  @ApiResponse({ status: 200, description: 'Note deleted' })
  remove(@CurrentUser() user: AuthUser, @Param('noteId') noteId: string) {
    return this.notesService.softDelete(user.tenantId, noteId);
  }
}
