import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DebtorService } from './debtor.service';
import { DebtorController } from './debtor.controller';
import { Payment } from '../budget/entities/payment.entity';
import { User } from '../user/entities/user.entity';
import { Group } from '../groups/entities/group.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Payment, User, Group])],
  controllers: [DebtorController],
  providers: [DebtorService],
})
export class DebtorModule {}