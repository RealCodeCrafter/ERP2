import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GroupService } from './group.service';
import { GroupController } from './group.controller';
import { Group } from './entities/group.entity';
import { Course } from '../courses/entities/course.entity';
import { User } from '../user/entities/user.entity';
import { Application } from 'src/application/entities/application.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Group, Course, User, Application])],
  controllers: [GroupController],
  providers: [GroupService],
  exports: [GroupService],
})
export class GroupModule {}