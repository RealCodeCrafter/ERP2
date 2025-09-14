import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req, ParseIntPipe } from '@nestjs/common';
import { RoleService } from './role.service';
import { CreateRoleDto } from './dto/crate-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
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

  @Roles('admin', 'superAdmin')
  @UseGuards(AuthGuard)
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.roleService.findOne(id);
  }

  @Roles('admin', 'superAdmin')
  @UseGuards(AuthGuard)
  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateRoleDto: UpdateRoleDto, @Req() req) {
    return this.roleService.update(id, updateRoleDto, req.user);
  }

  @Roles('admin', 'superAdmin')
  @UseGuards(AuthGuard)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.roleService.remove(id);
  }
}
