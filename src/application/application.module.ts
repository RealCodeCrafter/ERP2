import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApplicationService } from './application.service';
import { ApplicationController } from './application.controller';
import { Application } from './entities/application.entity';
import { User } from '../user/entities/user.entity';
import { Group } from '../groups/entities/group.entity';
import { Role } from 'src/role/entities/role.entity';
import { Course } from 'src/courses/entities/course.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Application, User, Group, Role, Course])],
  controllers: [ApplicationController],
  providers: [ApplicationService],
})
export class ApplicationModule {}