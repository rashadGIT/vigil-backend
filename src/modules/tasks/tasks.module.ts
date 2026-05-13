import { Module } from '@nestjs/common';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { TaskTemplatesService } from './task-templates.service';

@Module({
  controllers: [TasksController],
  providers: [TasksService, TaskTemplatesService],
  exports: [TasksService, TaskTemplatesService],
})
export class TasksModule {}
