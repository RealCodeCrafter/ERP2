import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DebtorService } from './debtor.service';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from 'src/auth/roles.decorator';

@Controller('debtors')
export class DebtorController {
  constructor(private readonly debtorService: DebtorService) {}
  
  @Roles('admin', 'superAdmin')
  @UseGuards(AuthGuard)
  @Get()
  getDebtors(
    @Query('firstName') firstName?: string,
    @Query('lastName') lastName?: string,
    @Query('groupId') groupId?: number,
  ) {
    return this.debtorService.getDebtors(firstName, lastName, groupId);
  }

}