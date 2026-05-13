import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { HttpModule } from '@nestjs/axios';

// Common layer
import { PrismaModule } from './common/prisma/prisma.module';
import { EmailModule } from './common/email/email.module';
import { CronModule } from './common/cron/cron.module';
import { CognitoAuthGuard } from './common/guards/cognito-auth.guard';
import { InternalOnlyGuard } from './common/guards/internal-only.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

// Infrastructure modules (N8n is global)
import { N8nModule } from './modules/n8n/n8n.module';

// Phase 1 business modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { HealthModule } from './modules/health/health.module';
import { CasesModule } from './modules/cases/cases.module';
import { ContactsModule } from './modules/contacts/contacts.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { IntakeModule } from './modules/intake/intake.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ObituariesModule } from './modules/obituaries/obituaries.module';
import { PriceListModule } from './modules/price-list/price-list.module';
import { SignaturesModule } from './modules/signatures/signatures.module';
import { VendorsModule } from './modules/vendors/vendors.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { FollowUpsModule } from './modules/follow-ups/follow-ups.module';
import { SettingsModule } from './modules/settings/settings.module';
import { MerchandiseModule } from './modules/merchandise/merchandise.module';
import { PreneedModule } from './modules/preneed/preneed.module';
import { CemeteryModule } from './modules/cemetery/cemetery.module';
import { NotesModule } from './modules/notes/notes.module';

import { SuperAdminModule } from './modules/super-admin/super-admin.module';

// Phase 2 stubs
import { TrackingModule } from './modules/tracking/tracking.module';
import { ReferralsModule } from './modules/referrals/referrals.module';
import { FamilyPortalModule } from './modules/family-portal/family-portal.module';
import { MemorialModule } from './modules/memorial/memorial.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';

// Phase 3 stubs
import { MultiLocationModule } from './modules/multi-location/multi-location.module';
import { AiObituaryModule } from './modules/ai-obituary/ai-obituary.module';
import { ChatbotModule } from './modules/chatbot/chatbot.module';
import { MultiFaithModule } from './modules/multi-faith/multi-faith.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    ScheduleModule.forRoot(),
    HttpModule,

    // Globals first
    PrismaModule,
    EmailModule,
    N8nModule,
    CronModule,

    // Phase 1 modules
    AuthModule,
    UsersModule,
    HealthModule,
    CasesModule,
    ContactsModule,
    TasksModule,
    IntakeModule,
    DocumentsModule,
    PaymentsModule,
    ObituariesModule,
    PriceListModule,
    SignaturesModule,
    VendorsModule,
    CalendarModule,
    FollowUpsModule,
    SettingsModule,
    MerchandiseModule,
    PreneedModule,
    CemeteryModule,
    NotesModule,

    SuperAdminModule,

    // Phase 2 stubs
    TrackingModule,
    ReferralsModule,
    FamilyPortalModule,
    MemorialModule,
    AnalyticsModule,

    // Phase 3 stubs
    MultiLocationModule,
    AiObituaryModule,
    ChatbotModule,
    MultiFaithModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: CognitoAuthGuard },
    { provide: APP_GUARD, useClass: InternalOnlyGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditLogInterceptor },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule {}
