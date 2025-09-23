import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Query, Req, BadRequestException } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { AuthGuard } from '../auth/auth.guard';
import { Payment } from '../budget/entities/payment.entity';
import { Roles } from 'src/auth/roles.decorator';

@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Roles('admin', 'superAdmin')
  @UseGuards(AuthGuard)
  @Post()
  create(@Body() createPaymentDto: CreatePaymentDto) {
    return this.paymentService.create(createPaymentDto);
  }

  @Roles('admin', 'teacher', 'superAdmin')
  @UseGuards(AuthGuard)
  @Get()
  findAll() {
    return this.paymentService.findAll();
  }

  @Roles('admin', 'teacher', 'superAdmin')
  @UseGuards(AuthGuard)
  @Get('report')
  async getPaymentsByGroupAndStudentName(
    @Query('groupId') groupId: string,
    @Query('studentName') studentName?: string,
  ): Promise<Payment[]> {
    const groupIdNum = parseInt(groupId, 10);
    if (isNaN(groupIdNum)) {
      throw new BadRequestException('groupId must be a valid number');
    }
    return this.paymentService.getPaymentsByGroupAndStudentName(groupIdNum, studentName);
  }

  // @Roles('admin', 'superAdmin', 'teacher')
  // @UseGuards(AuthGuard)
  // @Get('search')
  // searchPayments(
  //   @Query('studentName') studentName: string,
  //   @Query('groupId') groupId: number,
  //   @Query('status') status: string,
  //   @Query('monthFor') monthFor: string,
  // ) {
  //   return this.paymentService.searchPayments(studentName, groupId, status, monthFor);
  // }

  @Roles('admin', 'superAdmin')
  @UseGuards(AuthGuard)
  @Put(':id')
  update(@Param('id') id: number, @Body() updatePaymentDto: UpdatePaymentDto) {
    return this.paymentService.update(id, updatePaymentDto);
  }

  @Roles('admin', 'superAdmin', 'teacher')
  @UseGuards(AuthGuard)
  @Get('paid')
  findPaidPayments(
    @Query('studentName') studentName: string,
    @Query('groupId') groupId: number,
    @Query('monthFor') monthFor: string,
  ) {
    return this.paymentService.findPaidPayments(studentName, groupId, monthFor);
  }

  @Roles('admin', 'superAdmin', 'teacher')
  @UseGuards(AuthGuard)
  @Get('unpaid')
  findUnpaidPayments(
    @Query('studentName') studentName: string,
    @Query('groupId') groupId: number,
    @Query('monthFor') monthFor: string,
  ) {
    return this.paymentService.findUnpaidPayments(studentName, groupId, monthFor);
  }

  // @Roles('admin', 'superAdmin', 'teacher')
  // @UseGuards(AuthGuard)
  // @Get('unpaid-months')
  // getUnpaidMonths(
  //   @Query('userId') userId: number,
  //   @Query('groupId') groupId: number,
  // ) {
  //   return this.paymentService.getUnpaidMonths(userId, groupId);
  // }

  @Roles('admin', 'superAdmin', 'teacher')
  @UseGuards(AuthGuard)
  @Get('monthly-income')
  getMonthlyIncome(
    @Query('month') month: number,
    @Query('year') year: number,
  ) {
    return this.paymentService.getMonthlyIncome(month, year);
  }

  @Roles('admin', 'superAdmin')
  @UseGuards(AuthGuard)
  @Get('yearly-income')
  getYearlyIncome(@Query('year') year: number) {
    return this.paymentService.getYearlyIncome(year);
  }

  @Roles('admin', 'superAdmin')
  @UseGuards(AuthGuard)
  @Delete(':id')
  remove(@Param('id') id: number) {
    return this.paymentService.remove(id);
  }

  @Roles('admin', 'teacher', 'superAdmin')
  @UseGuards(AuthGuard)
  @Get(':id')
  findOne(@Param('id') id: number) {
    return this.paymentService.findOne(id);
  }
}