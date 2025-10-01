import { Controller, Get, Post, Body, Patch, Param, Delete, Req, UseGuards, Query, BadRequestException } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Roles('teacher')
  @UseGuards(AuthGuard)
  @Post()
  createOrUpdate(@Req() req, @Body() createAttendanceDto: CreateAttendanceDto) {
    const teacherId = req.user.id;
    return this.attendanceService.createOrUpdate(createAttendanceDto, teacherId);
  }

  @Roles('admin', 'superAdmin')
  @UseGuards(AuthGuard)
  @Post('teacher')
  markTeacherAttendance(@Req() req, @Body() body: { teacherId: number; date: string; status: 'absent_with_reason' | 'absent_without_reason' }) {
    const adminId = req.user.id;
    const { teacherId, date, status } = body;
    if (!teacherId || !date || !status) {
      throw new BadRequestException('teacherId, date, and status are required');
    }
    if (!['absent_with_reason', 'absent_without_reason'].includes(status)) {
      throw new BadRequestException('Invalid status, must be absent_with_reason or absent_without_reason');
    }
    return this.attendanceService.markTeacherAttendance(teacherId, date, status, adminId);
  }

  @Roles('admin', 'superAdmin', 'teacher')
  @UseGuards(AuthGuard)
  @Get('teacher')
  getTeacherAttendances(
    @Query('groupId') groupId?: string,
    @Query('date') date?: string,
    @Query('teacherId') teacherId?: string,
  ) {
    return this.attendanceService.getTeacherAttendances({
      groupId: groupId ? +groupId : undefined,
      date,
      teacherId: teacherId ? +teacherId : undefined,
    });
  }

  @Roles('admin', 'superAdmin')
  @UseGuards(AuthGuard)
  @Get('missing')
  async getGroupsWithoutAttendance(@Query('date') date: string) {
    if (!date) {
      throw new BadRequestException('date query param is required (YYYY-MM-DD)');
    }
    return this.attendanceService.getGroupsWithoutAttendance(date);
  }

  @Roles('teacher', 'admin', 'superAdmin')
  @UseGuards(AuthGuard)
  @Get()
  findAll() {
    return this.attendanceService.findAll();
  }

  @Roles('superAdmin', 'teacher', 'admin')
  @UseGuards(AuthGuard)
  @Get('statistics')
  getAttendanceStatistics(@Query('groupId') groupId: number) {
    return this.attendanceService.getAttendanceStatistics(groupId);
  }

  // @Roles('admin', 'superAdmin', 'teacher')
  // @UseGuards(AuthGuard)
  // @Get('search/daily-stats')
  // async getDailyAttendanceStats(
  //   @Query('groupId') groupId?: string,
  //   @Query('date') date?: string,
  //   @Query('period') period?: 'daily' | 'weekly' | 'monthly',
  //   @Query('studentName') studentName?: string,
  // ) {
  //   return this.attendanceService.getDailyAttendanceStats(
  //     groupId ? parseInt(groupId, 10) : undefined,
  //     date,
  //     period,
  //     studentName,
  //   );
  // }

  @Roles('teacher', 'admin', 'superAdmin')
  @UseGuards(AuthGuard)
  @Get('group/:groupId')
  getAttendanceByGroup(@Param('groupId') groupId: number) {
    return this.attendanceService.getAttendanceByGroup(groupId);
  }

  @Roles('admin', 'superAdmin', 'teacher')
  @UseGuards(AuthGuard)
  @Get('daily/:groupId')
  getDailyAttendance(
    @Param('groupId') groupId: number,
    @Query('date') date: string,
    @Query('studentName') studentName: string,
  ) {
    return this.attendanceService.getDailyAttendance(groupId, date, studentName);
  }

  @Roles('admin', 'superAdmin', 'teacher')
  @UseGuards(AuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.attendanceService.findOne(+id);
  }

  @Roles('teacher')
  @UseGuards(AuthGuard)
  @Patch('/group/:groupId/date/:date')
  async bulkUpdateAttendance(
    @Req() req: any,
    @Param('groupId') groupId: string,
    @Param('date') date: string,
    @Body() updateAttendanceDto: UpdateAttendanceDto,
  ) {
    const teacherId = Number(req.user.id);
    if (isNaN(teacherId)) {
      throw new BadRequestException('Invalid teacher ID in token');
    }
    const id = Number(groupId);
    if (isNaN(id)) {
      throw new BadRequestException('Invalid group ID');
    }
    if (!date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      throw new BadRequestException('Invalid date format, use YYYY-MM-DD');
    }
    return this.attendanceService.bulkUpdateByGroupAndDate(id, date, updateAttendanceDto, teacherId);
  }

  @Roles('teacher')
  @UseGuards(AuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.attendanceService.remove(+id);
  }
}