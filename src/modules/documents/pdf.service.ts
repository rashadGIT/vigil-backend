import { Injectable, NotFoundException } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class PdfService {
  constructor(private readonly prisma: PrismaService) {}

  async generateGpl(caseId: string, tenantId: string): Promise<Buffer> {
    const scoped = this.prisma.forTenant(tenantId);
    const kase = await scoped.case.findFirst({
      where: { id: caseId },
      include: {
        caseLineItems: { include: { priceListItem: true } },
        tenant: true,
      },
    });
    if (!kase) throw new NotFoundException(`Case ${caseId} not found`);

    return this.renderToBuffer((doc) => {
      doc
        .fontSize(18)
        .text('General Price List (FTC Funeral Rule)', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Prepared for: ${kase.deceasedName}`);
      doc.text(`Service Type: ${kase.serviceType}`);
      doc.text(`Prepared on: ${new Date().toLocaleDateString()}`);
      doc.moveDown();

      doc.fontSize(14).text('Selected Items', { underline: true });
      doc.fontSize(11);
      let subtotal = 0;
      for (const line of kase.caseLineItems) {
        const total = Number(line.total);
        subtotal += total;
        doc.text(
          `${line.priceListItem.name}  ×${line.quantity}   $${Number(line.unitPrice).toFixed(2)}   = $${total.toFixed(2)}`,
        );
      }
      doc.moveDown();
      doc
        .fontSize(12)
        .text(`Subtotal: $${subtotal.toFixed(2)}`, { align: 'right' });

      doc.moveDown(2);
      doc
        .fontSize(9)
        .text(
          'This is a General Price List. Per FTC Funeral Rule, prices are subject to change; you will receive an itemized statement of goods and services selected.',
          { align: 'left' },
        );
    });
  }

  async generateServiceProgram(
    caseId: string,
    tenantId: string,
  ): Promise<Buffer> {
    const scoped = this.prisma.forTenant(tenantId);
    const kase = await scoped.case.findFirst({
      where: { id: caseId },
      include: { familyContacts: true, calendarEvents: true },
    });
    if (!kase) throw new NotFoundException(`Case ${caseId} not found`);

    return this.renderToBuffer((doc) => {
      doc.fontSize(22).text('In Loving Memory', { align: 'center' });
      doc.moveDown();
      doc.fontSize(18).text(kase.deceasedName, { align: 'center' });
      if (kase.deceasedDob && kase.deceasedDod) {
        doc
          .fontSize(12)
          .text(
            `${kase.deceasedDob.toDateString()} – ${kase.deceasedDod.toDateString()}`,
            { align: 'center' },
          );
      }
      doc.moveDown(2);
      const service = kase.calendarEvents[0];
      if (service) {
        doc.fontSize(14).text('Service', { underline: true });
        doc.fontSize(12).text(`${service.title}`);
        doc.text(`When: ${service.startTime.toLocaleString()}`);
        if (service.location) doc.text(`Where: ${service.location}`);
      }
    });
  }

  private renderToBuffer(
    compose: (doc: PDFKit.PDFDocument) => void,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
        const chunks: Buffer[] = [];
        doc.on('data', (c: Buffer) => chunks.push(c));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);
        compose(doc);
        doc.end();
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    });
  }
}
