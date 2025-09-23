import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { Payment } from '../budget/entities/payment.entity';
import { User } from '../user/entities/user.entity';
import { Group } from '../groups/entities/group.entity';
import { Course } from '../courses/entities/course.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Payment, User, Group, Course])],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [TypeOrmModule],
})
export class PaymentModule {}