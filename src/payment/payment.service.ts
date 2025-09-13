import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, Between } from 'typeorm';
import { Payment } from '../budget/entities/payment.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { User } from '../user/entities/user.entity';
import { Group } from '../groups/entities/group.entity';
import { Course } from '../courses/entities/course.entity';
import { Lesson } from '../lesson/entities/lesson.entity';

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
  ) {}

  async create(createPaymentDto: CreatePaymentDto): Promise<Payment> {
  const { userId, groupId, courseId, amount, monthFor, paymentType } = createPaymentDto;

  const user = await this.userRepository.findOne({
    where: { id: userId },
    relations: ['role'],
  });
  if (!user || user.role?.name !== 'student') {
    throw new NotFoundException(`Student with ID ${userId} not found`);
  }

  const group = await this.groupRepository.findOne({
    where: { id: groupId, status: 'active' },
  });
  if (!group) {
    throw new NotFoundException(`Active group with ID ${groupId} not found`);
  }

  const course = await this.courseRepository.findOne({ where: { id: courseId } });
  if (!course) {
    throw new NotFoundException(`Course with ID ${courseId} not found`);
  }

  if (!monthFor || !/^\d{4}-\d{2}$/.test(monthFor)) {
    throw new BadRequestException('monthFor must be in YYYY-MM format');
  }

  const previousPayments = await this.paymentRepository.find({
    where: {
      user: { id: userId },
      group: { id: groupId },
      monthFor,
    },
  });

  const totalPaidBefore = previousPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalAfterThis = totalPaidBefore + Number(amount);

  const paidStatus = totalAfterThis >= Number(group.price);

  const payment = this.paymentRepository.create({
    amount,
    user,
    group,
    course,
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

  async findAll(): Promise<Payment[]> {
    return this.paymentRepository.find({
      relations: ['user', 'group', 'group.user', 'course'],
    });
  }

  async findOne(id: number): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({
      where: { id },
      relations: ['user', 'group', 'group.user', 'course'],
    });
    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }
    return payment;
  }

  async update(id: number, updatePaymentDto: UpdatePaymentDto): Promise<Payment> {
    const payment = await this.findOne(id);
    let group = payment.group;

    if (updatePaymentDto.userId) {
      const user = await this.userRepository.findOne({ where: { id: updatePaymentDto.userId } });
      if (!user) {
        throw new NotFoundException(`Student with ID ${updatePaymentDto.userId} not found`);
      }
      payment.user = user;
    }
    if (updatePaymentDto.groupId) {
      group = await this.groupRepository.findOne({ where: { id: updatePaymentDto.groupId, status: 'active' } });
      if (!group) {
        throw new NotFoundException(`Active group with ID ${updatePaymentDto.groupId} not found`);
      }
      payment.group = group;
    }
    if (updatePaymentDto.courseId) {
      const course = await this.courseRepository.findOne({ where: { id: updatePaymentDto.courseId } });
      if (!course) {
        throw new NotFoundException(`Course with ID ${updatePaymentDto.courseId} not found`);
      }
      payment.course = course;
    }
    if (updatePaymentDto.amount !== undefined) {
      payment.amount = updatePaymentDto.amount;
    }
    if (updatePaymentDto.monthFor) {
      if (!/^\d{4}-\d{2}$/.test(updatePaymentDto.monthFor)) {
        throw new BadRequestException('monthFor must be in YYYY-MM format');
      }
      payment.monthFor = updatePaymentDto.monthFor;
    }

    return this.paymentRepository.save(payment);
  }

  async remove(id: number): Promise<void> {
    const payment = await this.findOne(id);
    await this.paymentRepository.remove(payment);
  }

  async findPaidPayments(studentName: string, groupId: number, monthFor: string): Promise<Payment[]> {
    const query: any = { paid: true };
    if (studentName) {
      query.user = [
        { firstName: ILike(`%${studentName}%`) },
        { lastName: ILike(`%${studentName}%`) },
      ];
    }
    if (groupId) {
      query.group = { id: groupId, status: 'active' };
    }
    if (monthFor) {
      query.monthFor = monthFor;
    }
    return this.paymentRepository.find({
      where: query,
      relations: ['user', 'group', 'course'],
    });
  }

  async getPaymentsByGroupAndStudentName(groupId: number, studentName?: string): Promise<Payment[]> {
    const group = await this.groupRepository.findOne({
      where: { id: groupId, status: 'active' },
    });
    if (!group) {
      throw new NotFoundException(`Active group with ID ${groupId} not found`);
    }

    const query: any = {
      group: { id: groupId },
    };

    if (studentName && studentName.trim() !== '') {
      query.user = [
        { firstName: ILike(`%${studentName.trim()}%`) },
        { lastName: ILike(`%${studentName.trim()}%`) },
      ];
    }

    const payments = await this.paymentRepository.find({
      where: query,
      relations: ['user', 'group', 'group.user', 'course'],
      order: { createdAt: 'DESC' },
    });

    return payments;
  }

  async findUnpaidPayments(studentName: string, groupId: number, monthFor: string): Promise<Payment[]> {
    const query: any = { paid: false };
    if (studentName) {
      query.user = [
        { firstName: ILike(`%${studentName}%`) },
        { lastName: ILike(`%${studentName}%`) },
      ];
    }
    if (groupId) {
      query.group = { id: groupId, status: 'active' };
    }
    if (monthFor) {
      query.monthFor = monthFor;
    }
    return this.paymentRepository.find({
      where: query,
      relations: ['user', 'group', 'course'],
    });
  }

    async getUnpaidMonths(userId: number, groupId: number): Promise<string[]> {
    const group = await this.groupRepository.findOne({
      where: { id: groupId, status: 'active' },
      relations: ['users', 'users.role'],
    });
    if (!group) {
      throw new NotFoundException(`Active group with ID ${groupId} not found`);
    }

    // ✅ Check student inside group
    const user = group.users.find(
      (s) => s.id === userId && s.role?.name === 'student',
    );
    if (!user) {
      throw new NotFoundException(
        `Student with ID ${userId} not found in group`,
      );
    }

    const firstLesson = await this.lessonRepository.findOne({
      where: { group: { id: groupId } },
      order: { lessonDate: 'ASC' },
    });
    if (!firstLesson) {
      throw new NotFoundException(`No lessons found for group with ID ${groupId}`);
    }

    const firstLessonDate = new Date(firstLesson.lessonDate);
    const today = new Date();
    const unpaidMonths: string[] = [];

    let currentDate = new Date(
      firstLessonDate.getFullYear(),
      firstLessonDate.getMonth(),
      1,
    );
    while (currentDate <= today) {
      const monthFor = `${currentDate.getFullYear()}-${String(
        currentDate.getMonth() + 1,
      ).padStart(2, '0')}`;

      const payment = await this.paymentRepository.findOne({
        where: {
          user: { id: userId },
          group: { id: groupId },
          monthFor,
          paid: true,
        },
      });

      if (!payment) {
        unpaidMonths.push(monthFor);
      }
      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    return unpaidMonths;
  }

  async getMonthlyIncome(month: number, year: number): Promise<number> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    const payments = await this.paymentRepository.find({
      where: {
        paid: true,
        createdAt: Between(startDate, endDate),
      },
    });
    return payments.reduce((sum, payment) => sum + payment.amount, 0);
  }

  async getYearlyIncome(year: number): Promise<number> {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);
    const payments = await this.paymentRepository.find({
      where: {
        paid: true,
        createdAt: Between(startDate, endDate),
      },
    });
    return payments.reduce((sum, payment) => sum + payment.amount, 0);
  }
}