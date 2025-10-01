import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { User } from './entities/user.entity';
import { Role } from '../role/entities/role.entity';
import { Group } from '../groups/entities/group.entity';
import { Course } from '../courses/entities/course.entity';
import { Payment } from '../budget/entities/payment.entity';
import { Attendance } from '../attendance/entities/attendance.entity';
import { ArchiveModule } from 'src/archive/archive.module';
import { ArchivedUser } from 'src/archive/entities/archive.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Role, Group, Course, Payment, Attendance, ArchivedUser]), ArchiveModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}