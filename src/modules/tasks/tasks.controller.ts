import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@ApiTags('tasks')
@ApiBearerAuth()
@Controller()
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post('cases/:caseId/tasks')
  @ApiOperation({ summary: 'Create a task for a case' })
  @ApiResponse({ status: 201, description: 'Task created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(
    @CurrentUser() user: AuthUser,
    @Param('caseId') caseId: string,
    @Body() dto: CreateTaskDto,
  ) {
    return this.tasksService.create(user.tenantId, caseId, dto);
  }

  @Get('cases/:caseId/tasks')
  @ApiOperation({ summary: 'List all tasks for a case' })
  @ApiResponse({ status: 200, description: 'Returns array of tasks' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findByCase(@CurrentUser() user: AuthUser, @Param('caseId') caseId: string) {
    return this.tasksService.findByCase(user.tenantId, caseId);
  }

  @Get('tasks/overdue')
  @ApiOperation({ summary: 'List all overdue tasks across all cases for the tenant' })
  @ApiResponse({ status: 200, description: 'Returns array of overdue tasks' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findOverdue(@CurrentUser() user: AuthUser) {
    return this.tasksService.findOverdue(user.tenantId);
  }

  @Patch('tasks/:id')
  @ApiOperation({ summary: 'Update a task (completion, title, due date)' })
  @ApiResponse({ status: 200, description: 'Task updated' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasksService.update(user.tenantId, id, dto, user.sub);
  }

  @Delete('tasks/:id')
  @ApiOperation({ summary: 'Delete a task' })
  @ApiResponse({ status: 200, description: 'Task deleted' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.tasksService.remove(user.tenantId, id);
  }
}
