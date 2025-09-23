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
  const monthFor = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

  const { groups } = await this.getAllGroups();

  let expectedRevenue = groups.reduce((acc, group) => {
    const price = parseFloat(group.price ?? '0');
    const count = Number(group.studentCount ?? 0);
    const groupRevenue = price * count;
    console.log(`Group ${group.id}: price=${price}, count=${count}, revenue=${groupRevenue}`);
    return acc + groupRevenue;
  }, 0);

  const paidRes = await this.paymentRepository
    .createQueryBuilder('payment')
    .select('SUM(payment.amount)', 'sum')
    .where('payment.paid = :paid', { paid: true })
    .andWhere('payment.monthFor = :monthFor', { monthFor })
    .getRawOne();

  const totalPaid = Number(paidRes?.sum || 0);
  const unpaidAmount = expectedRevenue - totalPaid;

  const staff = await this.userRepository
    .createQueryBuilder('u')
    .leftJoinAndSelect('u.role', 'role')
    .where('u.salary IS NOT NULL')
    .getMany();

  const totalSalary = staff.reduce((sum, u) => sum + Number(u.salary || 0), 0);
  const netProfit = totalPaid - totalSalary;

  let usdExchangeRate = 0.000079;
  try {
    const response = await axios.get('https://www.floatrates.com/daily/uzs.json');
    usdExchangeRate = response.data.usd.rate;
  } catch (error) {
    console.error('Valyuta kursi xatosi:', error);
  }

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
  };
}

async getAllGroups(search?: string): Promise<any> {
  const groupsQuery = this.groupRepository
    .createQueryBuilder('group')
    .leftJoinAndSelect('group.course', 'course')
    .leftJoinAndSelect('group.user', 'user')
    .leftJoinAndSelect('user.role', 'userRole')
    .leftJoinAndSelect('group.users', 'users')
    .leftJoinAndSelect('users.role', 'usersRole')
    .where('group.status = :status', { status: 'active' });

  if (search && search.trim() !== '') {
    groupsQuery.andWhere('group.name ILIKE :search', {
      search: `%${search.trim()}%`,
    });
  }

  const groups = await groupsQuery
    .orderBy('group.createdAt', 'DESC')
    .getMany();

  const totalGroups = groups.length;
  const totalStudents = groups.reduce(
    (sum, group) =>
      sum + (group.users?.filter((u) => u.role?.name === 'student').length || 0),
    0,
  );
  const activeCourses = new Set(groups.map((group) => group.course.id)).size;

  const monthStart = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1,
  );
  const totalGroupsThisMonth = groups.filter(
    (group) => group.createdAt >= monthStart,
  ).length;

  const groupList = groups.map((group) => ({
    id: group.id,
    name: group.name,
    teacher: group.user
      ? `${group.user.firstName} ${group.user.lastName}`
      : 'N/A',
    course: group.course?.name || 'N/A',
    studentCount: group.users?.filter((u) => u.role?.name === 'student').length || 0,
    status: group.status,
    price: group.price,
    data: `${group.startTime} ${group.endTime}`,
    dataDays: group.daysOfWeek,
  }));

  return {
    statistics: {
      totalGroups,
      totalStudents,
      activeCourses,
      totalGroupsThisMonth,
    },
    groups: groupList,
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
      const monthFor = `${year}-${String(month).padStart(2, '0')}`;

      const groupCounts = await this.groupRepository
        .createQueryBuilder('g')
        .leftJoin('g.users', 'u')
        .where('g.status = :status', { status: 'active' })
        .andWhere('g.createdAt <= :endDate', { endDate })
        .andWhere('g.createdAt >= :startDate', { startDate })
        .select('g.id', 'id')
        .addSelect('g.price', 'price')
        .addSelect('COUNT(u.id)', 'studentCount')
        .groupBy('g.id')
        .addGroupBy('g.price')
        .getRawMany();

      console.log(`Previous Unpaid Group Counts for ${monthFor}:`, groupCounts);

      const expectedRevenue = groupCounts.reduce((acc, row) => {
        const price = Number(row.price ?? 0);
        const count = Number(row.studentCount ?? 0);
        return acc + price * count;
      }, 0);

      const paidRes = await this.paymentRepository
        .createQueryBuilder('payment')
        .select('SUM(payment.amount)', 'sum')
        .where('payment.paid = :paid', { paid: true })
        .andWhere('payment.monthFor = :monthFor', { monthFor })
        .getRawOne();

      const totalPaid = Number(paidRes?.sum || 0);
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