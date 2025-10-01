import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ArchiveService } from './archive.service';
import { ArchiveController } from './archive.controller';
import { ArchivedUser } from './entities/archive.entity';
import { User } from '../user/entities/user.entity';
import { Role } from '../role/entities/role.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ArchivedUser, User, Role])],
  controllers: [ArchiveController],
  providers: [ArchiveService],
  exports: [ArchiveService],
})
export class ArchiveModule {}