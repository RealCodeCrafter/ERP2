import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { BudgetService } from './budget.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { AuthGuard} from '../auth/auth.guard';
import { Roles } from 'src/auth/roles.decorator';

@Controller('budget')
export class BudgetController {
  constructor(private readonly budgetService: BudgetService) {}

  @Roles('admin', 'superAdmin')
  @UseGuards(AuthGuard)
  @Get()
  getBudget(@Query('month') month?: number, @Query('year') year?: number) {
    return this.budgetService.getBudget(month, year);
  }

  @Roles('admin', 'superAdmin')
  @UseGuards(AuthGuard)
  @Get('payments')
  getPayments(@Query('firstName') firstName?: string, @Query('lastName') lastName?: string, @Query('groupId') groupId?: string) {
    return this.budgetService.getPayments(firstName, lastName, +groupId);
  }

  @Roles('admin', 'superAdmin')
  @UseGuards(AuthGuard)
  @Post('payments')
  createPayment(@Body() createPaymentDto: CreateBudgetDto) {
    return this.budgetService.createPayment(createPaymentDto);
  }

  @Roles('admin', 'superAdmin')
  @UseGuards(AuthGuard)
  @Patch('payments/:id')
  updatePayment(@Param('id') id: string, @Body() updatePaymentDto: UpdateBudgetDto) {
    return this.budgetService.updatePayment(+id, updatePaymentDto);
  }

  @Roles('admin', 'superAdmin')
  @UseGuards(AuthGuard)
  @Delete('payments/:id')
  deletePayment(@Param('id') id: string) {
    return this.budgetService.deletePayment(+id);
  }
}