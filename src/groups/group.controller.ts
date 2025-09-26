import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Put, Req, ParseIntPipe } from '@nestjs/common';
import { GroupService } from './group.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { AuthGuard } from '../auth/auth.guard';
import { Group } from './entities/group.entity';
import { Roles } from 'src/auth/roles.decorator';

@Controller('groups')
export class GroupController {
  constructor(private readonly groupService: GroupService) {}

  @Roles('admin', 'superAdmin')
  @UseGuards(AuthGuard)
  @Post()
  create(@Body() createGroupDto: CreateGroupDto) {
    return this.groupService.create(createGroupDto);
  }

  @Roles('teacher')
  @UseGuards(AuthGuard)
  @Get('my/teacher/groups')
  async getGroupsByTeacher(@Req() req: any) {
    const teacherId = req.user.id;
    return this.groupService.getGroupsByTeacherId(teacherId);
  }

  @Roles('admin', 'superAdmin')
  @UseGuards(AuthGuard)
  @Post(':id/add-student')
  addStudentToGroup(
    @Param('id', ParseIntPipe) id: number,
    @Query('userId', ParseIntPipe) userId: number,
  ) {
    return this.groupService.addUserToGroup(id, userId);
  }

  @Roles('student', 'superAdmin', 'admin')
  @UseGuards(AuthGuard)
  @Get('student/:username')
  getGroupsByStudentId(@Param('username') username: string) {
    return this.groupService.getGroupsByStudentId(username);
  }

  @Roles('admin', 'teacher', 'superAdmin')
  @UseGuards(AuthGuard)
  @Get(':id/students')
  getStudentGroups(@Param('id') id: string) {
    return this.groupService.getStudentGroups(+id);
  }

  @Roles('admin', 'teacher', 'superAdmin')
  @UseGuards(AuthGuard)
  @Get('search')
  searchGroups(@Query('name') name: string, @Query('teacherName') teacherName: string) {
    return this.groupService.searchGroups(name, teacherName);
  }

  @Roles('admin', 'superAdmin')
  @UseGuards(AuthGuard)
  @Get('course/:courseId')
  getGroupsByCourseId(@Param('courseId') courseId: string) {
    return this.groupService.getGroupsByCourseId(+courseId);
  }

  @Roles('admin', 'superAdmin')
  @UseGuards(AuthGuard)
  @Get(':id/students/list')
  getStudentsByGroupId(@Param('id') id: string) {
    return this.groupService.getStudentsByGroupId(+id);
  }

  @Roles('admin', 'superAdmin')
  @UseGuards(AuthGuard)
  @Delete(':id/remove-student')
  removeStudentFromGroup(@Param('id') id: string, @Query('userId') userId: string) {
    return this.groupService.removeStudentFromGroup(+id, +userId);
    }
    
  @Roles('admin', 'superAdmin')
  @UseGuards(AuthGuard)
  @Patch(':id/status/:status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Param('status') status: 'active' | 'completed' | 'planned',
  ) {
    return this.groupService.updateStatus(id, status);
  }

  @Roles('admin', 'superAdmin')
  @UseGuards(AuthGuard)
  @Post('transfer-student')
  transferStudentToGroup(
    @Query('fromGroupId') fromGroupId: string,
    @Query('toGroupId') toGroupId: string,
    @Query('userId') userId: string,
  ) {
    return this.groupService.transferStudentToGroup(+fromGroupId, +toGroupId, +userId);
  }

  @Roles('admin', 'superAdmin')
  @UseGuards(AuthGuard)
  @Post(':id/restore-student')
  restoreStudentToGroup(@Param('id') id: string, @Query('userId') userId: string) {
    return this.groupService.restoreStudentToGroup(+id, +userId);
  }

  @Roles('admin', 'teacher', 'student', 'superAdmin')
  @UseGuards(AuthGuard)
  @Get()
  async getAllGroups(@Query('search') search?: string) {
    return this.groupService.getAllGroups(search);
  }

  @Roles('teacher')
  @UseGuards(AuthGuard)
  @Get('my/schedule')
  async getTeacherCurrentMonthSchedules(@Req() req: any) {
    const teacherId = req.user.id;
    return this.groupService.getTeacherCurrentMonthSchedules(teacherId);
  }

  @Roles('admin', 'superAdmin')
  @UseGuards(AuthGuard)
  @Put(':id')
  update(@Param('id') id: string, @Body() updateGroupDto: UpdateGroupDto) {
    return this.groupService.update(+id, updateGroupDto);
  }

  @Roles('admin', 'superAdmin')
  @UseGuards(AuthGuard)
  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.groupService.delete(+id);
  }

  @Roles('admin', 'teacher', 'superAdmin')
  @UseGuards(AuthGuard)
  @Get(':id')
  async getGroupById(@Param('id') id: string) {
    return this.groupService.getGroupById(+id);
  }
}