import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { PresignDto } from './dto/presign.dto';
import { ConfirmDto } from './dto/confirm.dto';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@ApiTags('documents')
@ApiBearerAuth()
@Controller()
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('cases/:caseId/documents/presign')
  @ApiOperation({ summary: 'Generate a presigned S3 URL for direct file upload' })
  @ApiResponse({ status: 201, description: 'Returns presigned URL and document ID' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  presign(
    @CurrentUser() user: AuthUser,
    @Param('caseId') caseId: string,
    @Body() dto: PresignDto,
  ) {
    return this.documentsService.createPresign(user.tenantId, caseId, user.sub, dto);
  }

  @Post('cases/:caseId/documents/confirm')
  @ApiOperation({ summary: 'Confirm that a file upload to S3 completed successfully' })
  @ApiResponse({ status: 200, description: 'Document marked as uploaded' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  confirm(@CurrentUser() user: AuthUser, @Body() dto: ConfirmDto) {
    return this.documentsService.confirmUpload(user.tenantId, dto.documentId);
  }

  @Get('cases/:caseId/documents')
  @ApiOperation({ summary: 'List all documents for a case' })
  @ApiResponse({ status: 200, description: 'Returns array of documents' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findByCase(@CurrentUser() user: AuthUser, @Param('caseId') caseId: string) {
    return this.documentsService.findByCase(user.tenantId, caseId);
  }

  @Get('documents/:id/url')
  @ApiOperation({ summary: 'Get a temporary signed download URL for a document' })
  @ApiResponse({ status: 200, description: 'Returns signed URL' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getUrl(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.documentsService.getSignedUrl(user.tenantId, id);
  }

  @Delete('documents/:id')
  @ApiOperation({ summary: 'Soft-delete a document' })
  @ApiResponse({ status: 200, description: 'Document soft-deleted' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.documentsService.softDelete(user.tenantId, id);
  }
}
