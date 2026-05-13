import { Global, Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { N8nService } from './n8n.service';
import { N8nCallbackController } from './n8n-callback.controller';

@Global()
@Module({
  imports: [HttpModule],
  controllers: [N8nCallbackController],
  providers: [N8nService],
  exports: [N8nService],
})
export class N8nModule {}
