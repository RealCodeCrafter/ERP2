import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { ApplicationService } from './application.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from 'src/auth/roles.decorator';

@Controller('applications')
export class ApplicationController {
  constructor(private readonly applicationService: ApplicationService) {}

  @Post()
  create(@Body() createApplicationDto: CreateApplicationDto) {
    return this.applicationService.create(createApplicationDto);
  }

  @Roles('admin', 'superAdmin')
  @UseGuards(AuthGuard)
  @Get()
  findAll(@Query('firstName') firstName?: string, @Query('lastName') lastName?: string, @Query('phone') phone?: string) {
    return this.applicationService.findAll(firstName, lastName, phone);
  }

  @Roles('admin', 'superAdmin')
  @UseGuards(AuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.applicationService.findOne(+id);
  }

  @Roles('admin', 'superAdmin')
  @UseGuards(AuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateApplicationDto: UpdateApplicationDto) {
    return this.applicationService.update(+id, updateApplicationDto);
  }

  @Roles('admin', 'superAdmin')
  @UseGuards(AuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.applicationService.remove(+id);
  }

  @Roles('admin', 'superAdmin')
  @UseGuards(AuthGuard)
  @Patch(':id/assign-group')
  assignGroup(@Param('id') id: string, @Query('groupId') groupId: string) {
    return this.applicationService.assignGroup(+id, +groupId);
  }

  @Roles('admin', 'superAdmin')
  @UseGuards(AuthGuard)
  @Patch(':id/remove-group')
  removeGroup(@Param('id') id: string) {
    return this.applicationService.removeGroup(+id);
  }

  @Roles('admin', 'superAdmin')
  @UseGuards(AuthGuard)
  @Patch(':id/mark-contacted')
  markContacted(@Param('id') id: string) {
    return this.applicationService.markContacted(+id);
  }
}