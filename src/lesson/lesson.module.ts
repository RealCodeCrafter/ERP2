import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LessonService } from './lesson.service';
import { LessonController } from './lesson.controller';
import { Lesson } from './entities/lesson.entity';
import { Group } from '../groups/entities/group.entity';
import { Attendance } from '../attendance/entities/attendance.entity';
import { User } from 'src/user/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Lesson, Group, Attendance, User])],
  controllers: [LessonController],
  providers: [LessonService],
})
export class LessonModule {}