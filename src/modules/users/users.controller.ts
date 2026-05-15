import { Body, Controller, Get, Post } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import {
  CurrentUser,
  AuthUser,
} from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List all staff users for the tenant' })
  @ApiResponse({ status: 200, description: 'Returns array of users' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll(@CurrentUser() user: AuthUser) {
    return this.usersService.findAll(user.tenantId);
  }

  @Roles('funeral_director')
  @Post()
  @ApiOperation({
    summary:
      'Create a new staff user in Cognito and the database (funeral director only)',
  })
  @ApiResponse({ status: 201, description: 'User created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateUserDto) {
    return this.usersService.create(user.tenantId, dto);
  }

  @Roles('funeral_director')
  @Post('invite')
  @ApiOperation({
    summary:
      'Invite a staff member by email with a branded welcome email (funeral director only)',
  })
  @ApiResponse({ status: 201, description: 'User invited and email sent' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  invite(@CurrentUser() user: AuthUser, @Body() dto: InviteUserDto) {
    return this.usersService.invite(user.tenantId, dto);
  }
}
