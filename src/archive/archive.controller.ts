import { Controller, Post, Body, Get, Param, Put, Delete, Query, Req, UseGuards } from '@nestjs/common';
import { ArchiveService } from './archive.service';
import { ArchivedUser } from './entities/archive.entity';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('archive')
export class ArchiveController {
  constructor(private readonly archiveService: ArchiveService) {}

  @Roles('admin', 'superAdmin')
  @UseGuards(AuthGuard)
  @Post()
  create(@Body() archivedUser: Partial<ArchivedUser>, @Req() req: any) {
    return this.archiveService.create(archivedUser, req.user.id);
  }

  @Roles('admin', 'superAdmin')
  @UseGuards(AuthGuard)
  @Get()
  findAll(
    @Query('firstName') firstName?: string,
    @Query('lastName') lastName?: string,
    @Query('phone') phone?: string,
    @Query('roleId') roleId?: string,
  ) {
    return this.archiveService.findAll({
      firstName,
      lastName,
      phone,
      roleId: roleId ? +roleId : undefined,
    });
  }

  @Roles('admin', 'superAdmin')
  @UseGuards(AuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.archiveService.findOne(+id);
  }

  @Roles('admin', 'superAdmin')
  @UseGuards(AuthGuard)
  @Put('restore/:id')
  restore(@Param('id') id: string, @Req() req: any) {
    return this.archiveService.restore(+id, req.user.id);
  }

  @Roles('admin', 'superAdmin')
  @UseGuards(AuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.archiveService.remove(+id, req.user.id);
  }
}