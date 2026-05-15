import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PdfService } from '../documents/pdf.service';
import { S3Service } from '../documents/s3.service';
import { RequestSignatureDto } from './dto/request-signature.dto';
import { SignDto } from './dto/sign.dto';

const TOKEN_LIFETIME_MS = 72 * 60 * 60 * 1000; // 72 hours (SIGN-01)

@Injectable()
export class SignaturesService {
  private readonly logger = new Logger(SignaturesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfService: PdfService,
    private readonly s3Service: S3Service,
  ) {}

  async request(tenantId: string, caseId: string, dto: RequestSignatureDto) {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + TOKEN_LIFETIME_MS);
    return this.prisma.forTenant(tenantId).signature.create({
      data: {
        tenantId,
        caseId,
        contactId: dto.contactId,
        documentType: dto.documentType,
        token,
        signerName: dto.signerName,
        expiresAt,
      },
    });
  }

  /**
   * Public endpoint — no auth. Called from /sign/:token.
   * Uses bare prisma (not forTenant) because there's no authenticated tenant context;
   * token is the authorization.
   */
  async findByToken(token: string) {
    const sig = await this.prisma.signature.findUnique({ where: { token } });
    if (!sig) throw new NotFoundException('Signature request not found');
    if (sig.signedAt) throw new ForbiddenException('Already signed');
    if (sig.expiresAt.getTime() < Date.now()) {
      throw new ForbiddenException('Signature link has expired (72 hours)');
    }
    return sig;
  }

  /**
   * Confirm intent checkbox — stores checkboxConfirmedAt timestamp BEFORE
   * enabling canvas (SIGN-03, ESIGN/UETA compliance).
   */
  async confirmIntent(token: string) {
    const sig = await this.findByToken(token);
    return this.prisma.signature.update({
      where: { id: sig.id },
      data: { checkboxConfirmedAt: new Date() },
    });
  }

  /**
   * Finalize signature — requires prior intent confirmation. Captures IP,
   * document hash, signature data. Writes AuditLog via interceptor on return.
   */
  async sign(
    token: string,
    dto: SignDto,
    ipAddress: string,
  ): Promise<{ ok: true; signatureId: string }> {
    const sig = await this.findByToken(token);
    if (!sig.checkboxConfirmedAt) {
      throw new BadRequestException(
        'Intent checkbox must be confirmed before signing',
      );
    }
    if (!dto.intentConfirmed) {
      throw new BadRequestException('intentConfirmed must be true');
    }

    // Compute document hash of the signature payload for the audit trail
    const documentHash = createHash('sha256')
      .update(dto.signatureData)
      .digest('hex');

    await this.prisma.signature.update({
      where: { id: sig.id },
      data: {
        signedAt: new Date(),
        signatureData: dto.signatureData,
        signerIp: ipAddress,
        documentHash,
      },
    });

    // AuditLog write — this is a public endpoint so AuditLogInterceptor cannot
    // infer user from request. Write the audit record explicitly (SIGN-03).
    await this.prisma.auditLog.create({
      data: {
        tenantId: sig.tenantId,
        userId: sig.contactId, // Use contactId as actor for public signs
        action: 'view_sensitive',
        entityType: 'signature',
        entityId: sig.id,
        ipAddress,
      },
    });

    // Generate and store PDF receipt (SIGN-04)
    try {
      const receiptBuf = await this.pdfService.generateServiceProgram(
        sig.caseId,
        sig.tenantId,
      );
      const s3Key = `${sig.tenantId}/signatures/${sig.id}-receipt.pdf`;
      await this.s3Service.uploadBuffer(s3Key, receiptBuf, 'application/pdf');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `PDF receipt generation failed for signature ${sig.id}: ${msg}`,
      );
    }

    return { ok: true, signatureId: sig.id };
  }

  findByCase(tenantId: string, caseId: string) {
    return this.prisma.forTenant(tenantId).signature.findMany({
      where: { caseId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
