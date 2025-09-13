import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BudgetService } from './budget.service';
import { BudgetController } from './budget.controller';
import { Payment } from './entities/payment.entity';
import { Group } from '../groups/entities/group.entity';
import { User } from '../user/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Payment, Group, User])],
  controllers: [BudgetController],
  providers: [BudgetService],
})
export class BudgetModule {}