import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, ILike, Not, IsNull, LessThanOrEqual } from 'typeorm';
import { Payment } from './entities/payment.entity';
import { Group } from '../groups/entities/group.entity';
import { User } from '../user/entities/user.entity';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import axios from 'axios';

@Injectable()
export class BudgetService {
  constructor(
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(Group)
    private groupRepository: Repository<Group>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async getBudget(month?: number, year?: number): Promise<any> {
  const now = new Date();
  const currentMonth = month || now.getMonth() + 1;
  const currentYear = year || now.getFullYear();
  const startDate = new Date(currentYear, currentMonth - 1, 1);
  const endDate = new Date(currentYear, currentMonth, 0);

  const totalExpected = await this.groupRepository
    .createQueryBuilder('group')
    .select('SUM(group.price * COUNT(users.id))', 'sum')
    .leftJoin('group.users', 'users')
    .where('group.status = :status', { status: 'active' })
    .andWhere('group.createdAt <= :endDate', { endDate })
    .groupBy('group.id')
    .getRawMany();

  let expectedRevenue = totalExpected.reduce(
    (sum, row) => sum + Number(row.sum || 0),
    0,
  );

  const previousUnpaid = await this.calculatePreviousUnpaid(currentYear, currentMonth);
  expectedRevenue += previousUnpaid;

  const paidAmount = await this.paymentRepository
    .createQueryBuilder('payment')
    .select('SUM(payment.amount)', 'sum')
    .where('payment.paid = :paid', { paid: true })
    .andWhere('payment.createdAt BETWEEN :start AND :end', { start: startDate, end: endDate })
    .getRawOne();

  const totalPaid = Number(paidAmount.sum) || 0;
  expectedRevenue -= totalPaid;

  const staff = await this.userRepository.find({
    where: { salary: Not(IsNull()) },
  });

  const totalSalary = staff.reduce(
    (sum, user) => sum + Number(user.salary || 0),
    0,
  );

  const netProfit = totalPaid - totalSalary;
  const unpaidAmount = expectedRevenue;

  let usdExchangeRate = 0.000079;
  try {
    const response = await axios.get('https://www.floatrates.com/daily/uzs.json');
    usdExchangeRate = response.data.usd.rate;
  } catch {}

  const payments = await this.paymentRepository.find({
    where: { paid: true, createdAt: Between(startDate, endDate) },
    relations: ['user', 'group'],
    order: { createdAt: 'DESC' },
  });

  const paymentList = payments.map(payment => ({
    name: `${payment.user.firstName} ${payment.user.lastName}`,
    group: payment.group.name,
    date: payment.createdAt.toLocaleDateString(),
    amount: Number(payment.amount),
  }));

  return {
    expectedRevenue,
    totalPaid,
    totalSalary,
    unpaidAmount,
    netProfit,
    expectedRevenueUSD: `$${(expectedRevenue * usdExchangeRate).toFixed(2)}`,
    totalPaidUSD: `$${(totalPaid * usdExchangeRate).toFixed(2)}`,
    totalSalaryUSD: `$${(totalSalary * usdExchangeRate).toFixed(2)}`,
    unpaidAmountUSD: `$${(unpaidAmount * usdExchangeRate).toFixed(2)}`,
    netProfitUSD: `$${(netProfit * usdExchangeRate).toFixed(2)}`,
    staff: staff.map(u => ({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      role: u.role?.name,
      salary: Number(u.salary),
    })),
    paymentList,
  };
}

private async calculatePreviousUnpaid(currentYear: number, currentMonth: number): Promise<number> {
  let previousUnpaid = 0;
  const startYear = 2020;
  const startMonth = 1;

  for (let year = startYear; year <= currentYear; year++) {
    const maxMonth = year === currentYear ? currentMonth - 1 : 12;
    for (let month = startMonth; month <= maxMonth; month++) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      const totalExpected = await this.groupRepository
        .createQueryBuilder('group')
        .select('SUM(group.price * COUNT(users.id))', 'sum')
        .leftJoin('group.users', 'users')
        .where('group.status = :status', { status: 'active' })
        .andWhere('group.createdAt <= :endDate', { endDate })
        .groupBy('group.id')
        .getRawMany();

      let expectedRevenue = totalExpected.reduce(
        (sum, row) => sum + Number(row.sum || 0),
        0,
      );

      const paidAmount = await this.paymentRepository
        .createQueryBuilder('payment')
        .select('SUM(payment.amount)', 'sum')
        .where('payment.paid = :paid', { paid: true })
        .andWhere('payment.createdAt BETWEEN :start AND :end', { start: startDate, end: endDate })
        .getRawOne();

      const totalPaid = Number(paidAmount.sum) || 0;
      previousUnpaid += expectedRevenue - totalPaid;
    }
  }

  return previousUnpaid;
}
  async getPayments(firstName?: string, lastName?: string, groupId?: number): Promise<Payment[]> {
    const query: any = { paid: true };
    if (firstName) {
      query.user = { firstName: ILike(`%${firstName}%`) };
    }   
    if (lastName) {  
      query.user = { lastName: ILike(`%${lastName}%`) };
    }   
    if (groupId) {
      query.group = { id: groupId };
    }

    return this.paymentRepository.find({
      where: query,
      relations: ['user', 'group'],
      order: { createdAt: 'DESC' },
    });
  }

  async createPayment(createBudgetDto: CreateBudgetDto): Promise<Payment> {
  const { userId, groupId, amount, paymentType, monthFor } = createBudgetDto;

  const user = await this.userRepository.findOne({ where: { id: userId } });
  if (!user) throw new NotFoundException('User not found');

  const group = await this.groupRepository.findOne({ where: { id: groupId } });
  if (!group) throw new NotFoundException('Group not found');

  if (!monthFor || !/^\d{4}-\d{2}$/.test(monthFor))
    throw new BadRequestException('monthFor must be in YYYY-MM format');

  const previousPayments = await this.paymentRepository.find({
    where: { user: { id: userId }, group: { id: groupId }, monthFor },
  });

  const totalPaidBefore = previousPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalAfterThis = totalPaidBefore + Number(amount);

  const paidStatus = totalAfterThis >= Number(group.price);

  const payment = this.paymentRepository.create({
    amount,
    user,
    group,
    paid: paidStatus,
    monthFor,
    paymentType,
  });

  const savedPayment = await this.paymentRepository.save(payment);

  if (paidStatus) {
    await this.paymentRepository.update(
      { user: { id: userId }, group: { id: groupId }, monthFor },
      { paid: true }
    );
  }

  return savedPayment;
}


  async updatePayment(id: number, updateBudgetDto: UpdateBudgetDto): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({ where: { id } });
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (updateBudgetDto.amount) payment.amount = updateBudgetDto.amount;
    if (updateBudgetDto.paymentType) payment.paymentType = updateBudgetDto.paymentType;

    return this.paymentRepository.save(payment);
  }

  async deletePayment(id: number): Promise<void> {
    const payment = await this.paymentRepository.findOne({ where: { id } });
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    await this.paymentRepository.remove(payment);
  }
}