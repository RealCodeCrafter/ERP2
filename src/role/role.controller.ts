import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { RoleService } from './role.service';
import { CreateRoleDto } from './dto/crate-role.dto';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from 'src/auth/roles.decorator';

@Controller('roles')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Roles('admin', 'superAdmin')
@UseGuards(AuthGuard)
@Post()
create(@Body() createRoleDto: CreateRoleDto, @Req() req) {
  return this.roleService.create(createRoleDto, req.user);
}


  @Roles('admin', 'superAdmin')
  @UseGuards(AuthGuard)
  @Get()
  findAll() {
    return this.roleService.findAll();
  }
}