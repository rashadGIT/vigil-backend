/**
 * @jest-environment node
 */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { N8nService } from './n8n.service';
import { N8nEvent } from './n8n-events.enum';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('N8nService', () => {
  let service: N8nService;
  const mockHttp = { post: jest.fn().mockReturnValue(of({ data: {} })) };
  const mockConfig = { get: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockHttp.post.mockReturnValue(of({ data: {} }));
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        N8nService,
        { provide: HttpService, useValue: mockHttp },
        { provide: ConfigService, useValue: mockConfig },
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();
    service = module.get<N8nService>(N8nService);
  });

  describe('trigger — PLACEHOLDER detection', () => {
    it('does NOT call httpService.post when url contains PLACEHOLDER', async () => {
      mockConfig.get.mockReturnValue(
        'https://PLACEHOLDER.n8n.cloud/webhook/abc',
      );

      await service.trigger(N8nEvent.INTAKE_NOTIFY, { test: true });

      expect(mockHttp.post).not.toHaveBeenCalled();
    });

    it('does NOT call httpService.post when url is empty string', async () => {
      mockConfig.get.mockReturnValue('');

      await service.trigger(N8nEvent.INTAKE_NOTIFY, { test: true });

      expect(mockHttp.post).not.toHaveBeenCalled();
    });

    it('does NOT call httpService.post when url is undefined', async () => {
      mockConfig.get.mockReturnValue(undefined);

      await service.trigger(N8nEvent.INTAKE_NOTIFY, { test: true });

      expect(mockHttp.post).not.toHaveBeenCalled();
    });

    it('resolves without throwing when url is PLACEHOLDER', async () => {
      mockConfig.get.mockReturnValue(
        'https://PLACEHOLDER.n8n.cloud/webhook/abc',
      );

      await expect(
        service.trigger(N8nEvent.INTAKE_NOTIFY, {}),
      ).resolves.toBeUndefined();
    });
  });

  describe('trigger — real URL fires HTTP POST', () => {
    beforeEach(() => {
      mockConfig.get.mockImplementation((key: string) => {
        if (key === 'N8N_WEBHOOK_INTAKE_NOTIFY')
          return 'https://rashadbarnett.app.n8n.cloud/webhook/intake';
        if (key === 'N8N_WEBHOOK_GRIEF_FOLLOWUP')
          return 'https://rashadbarnett.app.n8n.cloud/webhook/grief';
        if (key === 'N8N_WEBHOOK_KEY') return 'test-secret-key';
        return undefined;
      });
    });

    it('calls httpService.post with the correct url and payload', async () => {
      const payload = { tenantId: 'tenant-a', caseId: 'case-1' };

      await service.trigger(N8nEvent.INTAKE_NOTIFY, payload);

      expect(mockHttp.post).toHaveBeenCalledWith(
        'https://rashadbarnett.app.n8n.cloud/webhook/intake',
        payload,
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-vigil-key': 'test-secret-key',
          }),
        }),
      );
    });

    it('sets timeout: 5000 on the HTTP request', async () => {
      await service.trigger(N8nEvent.INTAKE_NOTIFY, {});

      expect(mockHttp.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.objectContaining({ timeout: 2000 }),
      );
    });

    it('resolves successfully when HTTP call succeeds', async () => {
      await expect(
        service.trigger(N8nEvent.INTAKE_NOTIFY, {}),
      ).resolves.toBeUndefined();
    });
  });

  describe('trigger — error swallowing (fire-and-forget)', () => {
    beforeEach(() => {
      mockConfig.get.mockImplementation((key: string) => {
        if (key === 'N8N_WEBHOOK_INTAKE_NOTIFY')
          return 'https://rashadbarnett.app.n8n.cloud/webhook/intake';
        if (key === 'N8N_WEBHOOK_KEY') return 'secret';
        return undefined;
      });
    });

    it('swallows HTTP error and resolves to undefined', async () => {
      mockHttp.post.mockReturnValue(
        throwError(() => new Error('Network error')),
      );

      await expect(
        service.trigger(N8nEvent.INTAKE_NOTIFY, {}),
      ).resolves.toBeUndefined();
    });

    it('does not re-throw when HTTP POST fails', async () => {
      mockHttp.post.mockReturnValue(
        throwError(() => new Error('Connection refused')),
      );

      const result = service.trigger(N8nEvent.INTAKE_NOTIFY, {});
      await expect(result).resolves.not.toThrow();
    });
  });

  describe('trigger — event-to-env-var mapping', () => {
    it('uses N8N_WEBHOOK_GRIEF_FOLLOWUP for GRIEF_FOLLOWUP_SCHEDULE event', async () => {
      const calls: string[] = [];
      mockConfig.get.mockImplementation((key: string) => {
        calls.push(key);
        if (key === 'N8N_WEBHOOK_GRIEF_FOLLOWUP')
          return 'https://example.com/grief';
        if (key === 'N8N_WEBHOOK_KEY') return 'key';
        return undefined;
      });

      await service.trigger(N8nEvent.GRIEF_FOLLOWUP_SCHEDULE, {});

      expect(calls).toContain('N8N_WEBHOOK_GRIEF_FOLLOWUP');
    });

    it('uses N8N_WEBHOOK_REVIEW_REQUEST for REVIEW_REQUEST event', async () => {
      const calls: string[] = [];
      mockConfig.get.mockImplementation((key: string) => {
        calls.push(key);
        if (key === 'N8N_WEBHOOK_REVIEW_REQUEST')
          return 'https://example.com/review';
        if (key === 'N8N_WEBHOOK_KEY') return 'key';
        return undefined;
      });

      await service.trigger(N8nEvent.REVIEW_REQUEST, {});

      expect(calls).toContain('N8N_WEBHOOK_REVIEW_REQUEST');
    });
  });

  describe('onModuleInit', () => {
    it('calls configService.get once per registered event (5 events)', () => {
      mockConfig.get.mockReturnValue(undefined);

      service.onModuleInit();

      expect(mockConfig.get).toHaveBeenCalledTimes(5);
    });

    it('does not throw when all webhooks are PLACEHOLDER', () => {
      mockConfig.get.mockReturnValue('https://PLACEHOLDER.example.com/webhook');

      expect(() => service.onModuleInit()).not.toThrow();
    });

    it('does not throw when webhooks are configured with real urls', () => {
      mockConfig.get.mockReturnValue('https://real.example.com/webhook');

      expect(() => service.onModuleInit()).not.toThrow();
    });
  });

  describe('handleCallback', () => {
    let mockPrismaFull: {
      followUp: { updateMany: jest.Mock };
      document: { updateMany: jest.Mock };
    };

    beforeEach(async () => {
      mockPrismaFull = {
        followUp: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
        document: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      };
      const mod: TestingModule = await Test.createTestingModule({
        providers: [
          N8nService,
          { provide: HttpService, useValue: mockHttp },
          { provide: ConfigService, useValue: mockConfig },
          { provide: PrismaService, useValue: mockPrismaFull },
        ],
      }).compile();
      service = mod.get<N8nService>(N8nService);
    });

    it('grief_followup_sent: calls followUp.updateMany with followUpId and sets status to sent', async () => {
      await service.handleCallback('grief_followup_sent', {
        followUpId: 'fu-1',
      });

      expect(mockPrismaFull.followUp.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: 'fu-1', status: 'pending' }),
          data: expect.objectContaining({ status: 'sent' }),
        }),
      );
    });

    it('grief_followup_sent: does not call updateMany when followUpId is missing', async () => {
      await service.handleCallback('grief_followup_sent', {});

      expect(mockPrismaFull.followUp.updateMany).not.toHaveBeenCalled();
    });

    it('document_generated: calls document.updateMany with documentId', async () => {
      await service.handleCallback('document_generated', {
        documentId: 'doc-1',
      });

      expect(mockPrismaFull.document.updateMany).toHaveBeenCalledWith({
        where: { id: 'doc-1' },
        data: { uploaded: true },
      });
    });

    it('document_generated: does not call updateMany when documentId is missing', async () => {
      await service.handleCallback('document_generated', {});

      expect(mockPrismaFull.document.updateMany).not.toHaveBeenCalled();
    });

    it('unknown event: resolves without throwing', async () => {
      await expect(
        service.handleCallback('unknown_event', { foo: 'bar' }),
      ).resolves.toBeUndefined();
    });
  });
});
