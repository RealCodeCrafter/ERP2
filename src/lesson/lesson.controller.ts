import { Controller, Get, Post, Body, Patch, Param, Delete, Req, UseGuards, Query, ParseIntPipe, Put } from '@nestjs/common';
import { LessonService } from './lesson.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from 'src/auth/roles.decorator';

@Controller('lessons')
export class LessonController {
  constructor(private readonly lessonService: LessonService) {}

  @UseGuards(AuthGuard)
  @Get('all')
  async findAll(@Req() req: any) {
    const userId = req.user.id;
    return this.lessonService.findAll(userId);
  }

  @UseGuards(AuthGuard)
  @Get('group/:groupId')
  async findLessonsByGroup(
    @Param('groupId') groupId: number,
    @Query('date') date: string,
    @Req() req: any,
  ) {
    const userId = req.user.id;
    return this.lessonService.findLessonsByGroup(groupId, userId, date);
  }

  @Roles('teacher')
  @UseGuards(AuthGuard)
  @Post()
  async create(
    @Body() lessonData: CreateLessonDto,
    @Req() req: any,
  ) {
    const userId = req.user.id;
    return this.lessonService.create(userId, lessonData);
  }

  @Roles('teacher', 'student', 'admin', 'superAdmin')
  @UseGuards(AuthGuard)
  @Get(':id/attendance-history')
  async getAttendanceHistoryByLesson(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ) {
    const userId = req.user.id;
    return this.lessonService.getAttendanceHistoryByLesson(id, userId);
  }

  @Roles('teacher')
  @UseGuards(AuthGuard)
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateLessonDto: UpdateLessonDto,
    @Req() req: any,
  ) {
    const userId = req.user.id;
    const lessonId = Number(id);
    return this.lessonService.update(lessonId, updateLessonDto, userId);
  }

  @Roles('teacher')
  @UseGuards(AuthGuard)
  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: any) {
    const userId = req.user.id;
    const lessonId = Number(id);
    return this.lessonService.remove(lessonId, userId);
  }

  @Roles('admin', 'superAdmin')
  @UseGuards(AuthGuard)
  @Get('statistics')
  async getLessonStatistics(
    @Query('groupId') groupId: number,
    @Query('date') date: string,
  ) {
    return this.lessonService.getLessonStatistics(groupId, date);
  }
}