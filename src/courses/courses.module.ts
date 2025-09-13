import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourseService } from './courses.service';
import { CourseController } from './courses.controller';
import { Course } from './entities/course.entity';
import { Group } from '../groups/entities/group.entity';
import { User } from '../user/entities/user.entity';
import { Payment } from '../budget/entities/payment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Course, Group, User, Payment])],
  controllers: [CourseController],
  providers: [CourseService],
})
export class CourseModule {}