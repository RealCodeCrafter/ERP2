import { Injectable, ConflictException, NotFoundException, HttpException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, Between, Not, IsNull } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Role } from '../role/entities/role.entity';
import { Group } from '../groups/entities/group.entity';
import { Course } from '../courses/entities/course.entity';
import { Payment } from '../budget/entities/payment.entity';
import { Attendance } from '../attendance/entities/attendance.entity';
import * as bcrypt from 'bcrypt';
import axios from 'axios';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(Group)
    private groupRepository: Repository<Group>,
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(Attendance)
    private attendanceRepository: Repository<Attendance>,
  ) {}

  async create(createUserDto: CreateUserDto, currentUser: any): Promise<User> {
    let {
      role,
      firstName,
      lastName,
      phone,
      address,
      username,
      password,
      specialty,
      salary,
      courseId,
      groupId,
    } = createUserDto;

    if (!role) {
      role = 'student';
    }

    if (role === 'student') {
      if (!firstName || !lastName || !phone || !courseId || !groupId) {
        throw new NotFoundException(
          'firstName, lastName, phone, courseId, and groupId are required for students',
        );
      }
    }

    const roleEntity = await this.roleRepository.findOne({ where: { name: role } });
    if (!roleEntity) {
      throw new NotFoundException(`Role ${role} not found`);
    }

    let courseEntity: Course | null = null;
    if (role === 'student' && courseId) {
      courseEntity = await this.courseRepository.findOne({ where: { id: courseId } });
      if (!courseEntity) {
        throw new NotFoundException(`Course with ID ${courseId} not found`);
      }
    }

    let groupEntity: Group | null = null;
    if (role === 'student' && groupId) {
      groupEntity = await this.groupRepository.findOne({ where: { id: groupId } });
      if (!groupEntity) {
        throw new NotFoundException(`Group with ID ${groupId} not found`);
      }
    }

    const existingUser = username ? await this.userRepository.findOne({ where: { username } }) : null;
    if (existingUser) {
      throw new ConflictException(`Username ${username} already exists`);
    }

    const existingPhone = phone ? await this.userRepository.findOne({ where: { phone } }) : null;
    if (existingPhone) {
      throw new ConflictException(`Phone ${phone} already exists`);
    }

    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

    const user = this.userRepository.create({
      firstName,
      lastName,
      phone,
      address: address || null,
      username: username || null,
      password: hashedPassword,
      role: roleEntity,
      specialty: specialty || null,
      salary: salary || null,
      course: courseEntity || null,
      groups: groupEntity ? [groupEntity] : [], // Assign group for students
    });

    return this.userRepository.save(user);
  }

  async getDashboard(): Promise<any> {
  const totalStudents = await this.userRepository
    .createQueryBuilder('user')
    .innerJoin('user.groups', 'group')
    .innerJoin('user.role', 'role')
    .where('group.status = :status', { status: 'active' })
    .andWhere('role.name = :roleName', { roleName: 'student' })
    .distinct(true)
    .getCount();

  const activeStudents = totalStudents; // Faol guruhlardagi o‘quvchilar soni

  const activeGroups = await this.groupRepository.count({
    where: { status: 'active' },
  });

  const now = new Date();
  const year = now.getFullYear();
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const monthlyRevenueRaw = await this.paymentRepository
    .createQueryBuilder('payment')
    .select('payment.monthFor', 'month')
    .addSelect('SUM(payment.amount)', 'income')
    .where('payment.paid = :paid', { paid: true })
    .andWhere('payment.monthFor LIKE :year', { year: `${year}%` })
    .groupBy('payment.monthFor')
    .getRawMany();

  let annualRevenue = 0;
  const monthlyRevenue = monthNames.map((month, index) => {
    const monthKey = `${year}-${String(index + 1).padStart(2, '0')}`;
    const incomeRow = monthlyRevenueRaw.find(row => row.month === monthKey);
    const income = incomeRow ? Number(incomeRow.income) : 0;
    annualRevenue += income;
    return { month, income };
  });

  let usdExchangeRate = 0.000079;
  try {
    const response = await axios.get('https://www.floatrates.com/daily/uzs.json');
    usdExchangeRate = response.data.usd.rate || usdExchangeRate;
  } catch (error) {
    console.error('Valyuta kursi xatosi:', error);
  }

  const annualRevenueUSD = (annualRevenue * usdExchangeRate).toFixed(2);

  const currentMonthKey = `${year}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const paidStudentsRaw = await this.paymentRepository
    .createQueryBuilder('payment')
    .select('COUNT(DISTINCT payment.userId)', 'count')
    .where('payment.paid = :paid', { paid: true })
    .andWhere('payment.monthFor = :monthFor', { monthFor: currentMonthKey })
    .getRawOne();
  const paidStudents = Number(paidStudentsRaw?.count || 0);

  const activeStudentsList = await this.userRepository
    .createQueryBuilder('user')
    .innerJoin('user.groups', 'group')
    .innerJoin('user.role', 'role')
    .where('group.status = :status', { status: 'active' })
    .andWhere('role.name = :roleName', { roleName: 'student' })
    .distinct(true)
    .getMany();

  const paidUserIdsRaw = await this.paymentRepository
    .createQueryBuilder('payment')
    .select('DISTINCT payment.userId', 'userId')
    .where('payment.paid = :paid', { paid: true })
    .andWhere('payment.monthFor = :monthFor', { monthFor: currentMonthKey })
    .getRawMany();

  const paidUserIdsSet = new Set(paidUserIdsRaw.map(p => p.userId));
  const unpaidStudents = activeStudentsList.filter(user => !paidUserIdsSet.has(user.id)).length;

  return {
    totalStudents,
    paidStudents,
    averageStudentsPerGroup: activeGroups > 0 ? Math.round(totalStudents / activeGroups) : 0,
    activeGroups,
    monthlyRevenue,
    annualRevenue,
    annualRevenueUSD: `$${annualRevenueUSD}`,
    usdExchangeRate,
    paidStudentsCount: paidStudents,
    unpaidStudents,
    reportDate: now.toLocaleDateString('uz-UZ', { year: 'numeric' }),
  };
}

  async findAll(role?: string, firstName?: string, lastName?: string, phone?: string): Promise<User[]> {
    const query: any = {};
    if (role) {
      query.role = { name: role };
    }
    if (firstName) {
      query.firstName = ILike(`%${firstName}%`);
    }
    if (lastName) {
      query.lastName = ILike(`%${lastName}%`);
    }
    if (phone) {
      query.phone = ILike(`%${phone}%`);
    }

    return this.userRepository.find({
      where: query,
      relations: ['groups', 'groups.course', 'role'],
    });
  }

  async findOne(id: number): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['groups', 'groups.course', 'role'],
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    if (updateUserDto.username && updateUserDto.username !== user.username) {
      const existingUsername = await this.userRepository.findOne({ where: { username: updateUserDto.username } });
      if (existingUsername) {
        throw new ConflictException(`Username ${updateUserDto.username} already exists`);
      }
    }

    if (updateUserDto.phone && updateUserDto.phone !== user.phone) {
      const existingPhone = await this.userRepository.findOne({ where: { phone: updateUserDto.phone } });
      if (existingPhone) {
        throw new ConflictException(`Phone ${updateUserDto.phone} already exists`);
      }
    }


    if (updateUserDto.password) {
      user.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    Object.assign(user, {
      firstName: updateUserDto.firstName ?? user.firstName,
      lastName: updateUserDto.lastName ?? user.lastName,
      phone: updateUserDto.phone ?? user.phone,
      address: updateUserDto.address ?? user.address,
      username: updateUserDto.username ?? user.username,
      specialty: updateUserDto.specialty ?? user.specialty,
      salary: updateUserDto.salary ?? user.salary,
    });

    return this.userRepository.save(user);
  }

  async updateMe(id: number, updateUserDto: UpdateUserDto): Promise<User> {
  const user = await this.findOne(id);

  if ('role' in updateUserDto) {
    delete updateUserDto.role;
  }

  if (
    updateUserDto.username &&
    updateUserDto.username !== user.username
  ) {
    const existingUsername = await this.userRepository.findOne({
      where: { username: updateUserDto.username },
    });
    if (existingUsername) {
      throw new ConflictException(
        `Username ${updateUserDto.username} already exists`,
      );
    }
  }

  if (updateUserDto.phone && updateUserDto.phone !== user.phone) {
    const existingPhone = await this.userRepository.findOne({
      where: { phone: updateUserDto.phone },
    });
    if (existingPhone) {
      throw new ConflictException(
        `Phone ${updateUserDto.phone} already exists`,
      );
    }
  }

  if (updateUserDto.password) {
    user.password = await bcrypt.hash(updateUserDto.password, 10);
  }

  Object.assign(user, {
    firstName: updateUserDto.firstName ?? user.firstName,
    lastName: updateUserDto.lastName ?? user.lastName,
    phone: updateUserDto.phone ?? user.phone,
    address: updateUserDto.address ?? user.address,
    username: updateUserDto.username ?? user.username,
    specialty: updateUserDto.specialty ?? user.specialty,
    salary: updateUserDto.salary ?? user.salary,
  });

  return this.userRepository.save(user);
}


async remove(id: number): Promise<{ message: string }> {
  const user = await this.userRepository.findOne({ where: { id } });
  if (!user) {
    return { message: `User with id ${id} does not exist` };
  }

  await this.userRepository.remove(user);
  return { message: `User with id ${id} has been successfully deleted` };
}


  async getAdmins(firstName?: string, lastName?: string, phone?: string): Promise<User[]> {
    const query: any = { role: { name: 'admin' } };
    if (firstName) {
      query.firstName = ILike(`%${firstName}%`);
    }
    if (lastName) {
      query.lastName = ILike(`%${lastName}%`);
    }
    if (phone) {
      query.phone = ILike(`%${phone}%`);
    }

    return this.userRepository.find({ where: query, relations: ['role'] });
  }

  async getStudents(id?: number, firstName?: string, lastName?: string): Promise<any[]> {
    let studentsQuery = this.userRepository
      .createQueryBuilder('user')
      .where('user.role = :role', { role: { name: 'student' } });

    if (id) {
      studentsQuery = studentsQuery.andWhere('user.id = :id', { id });
    }

    if (firstName) {
      studentsQuery = studentsQuery.andWhere('user.firstName ILIKE :firstName', { firstName: `%${firstName}%` });
    }

    if (lastName) {
      studentsQuery = studentsQuery.andWhere('user.lastName ILIKE :lastName', { lastName: `%${lastName}%` });
    }

    const students = await studentsQuery
      .orderBy('user.id', 'ASC')
      .getMany();

    return students.map(user => ({
      id: user.id,
      fullName: `${user.firstName} ${user.lastName}`,
      phone: user.phone || 'N/A',
    }));
  }

  async getMe(id: number): Promise<User> {
    return this.findOne(id);
  }
async getAllStudents(filters: {
  groupId?: number;
  paid?: 'true' | 'false';
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
  monthFor?: string;
}) {
  const { groupId, paid, firstName, lastName, phone, address, monthFor } = filters;

  const query: any = { role: { name: 'student' } };
  if (firstName) query.firstName = ILike(`%${firstName}%`);
  if (lastName) query.lastName = ILike(`%${lastName}%`);
  if (phone) query.phone = ILike(`%${phone}%`);
  if (address) query.address = ILike(`%${address}%`);

  const students = await this.userRepository.find({
    where: query,
    relations: ['groups', 'groups.course', 'groups.user', 'payments', 'payments.group'],
  });

  const monthQuery =
    monthFor ||
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

  let filteredStudents = students.map(s => ({
    ...s,
    groups: s.groups || [],
    payments: s.payments || [],
  }));

  if (groupId !== undefined) {
    filteredStudents = filteredStudents.filter(s =>
      s.groups.some(g => g && g.id === groupId),
    );
  }

  const studentsWithPayments = filteredStudents.map(s => {
    
    const groupsList = s.groups.map(g => ({
      id: g.id,
      name: g.name,
      teacher: g.user ? `${g.user.firstName} ${g.user.lastName}`.trim() : null,
      course: g.course ? g.course.name : null,
      studentCount: g.users?.length || 0,
      status: g.status,
      price: Number(g.price ?? 0),
      data: g.startTime && g.endTime ? `${g.startTime} ${g.endTime}` : null,
      dataDays: g.daysOfWeek || [],
    }));

    const paymentsList = s.groups.flatMap(group => {
      const groupPayments = s.payments.filter(
        p => p.group?.id === group.id && p.monthFor === monthQuery
      );

      if (groupPayments.length === 0) {
        return [
          {
            id: null,
            amount: 0,
            monthFor: monthQuery,
            paid: false,
            paymentType: null,
            groupId: group.id,
            createdAt: null,
          },
        ];
      }

      return groupPayments.map(p => ({
        id: p.id,
        amount: Number(p.amount ?? 0),
        monthFor: p.monthFor,
        paid: p.paid ?? (Number(p.amount ?? 0) >= Number(group.price ?? 0)),
        paymentType: p.paymentType,
        groupId: group.id,
        createdAt: p.createdAt,
      }));
    });

    return {
      id: s.id,
      fullName: `${s.firstName ?? ''} ${s.lastName ?? ''}`.trim(),
      phone: s.phone,
      address: s.address,
      groups: groupsList,
      payments: paymentsList,
    };
  });

  if (paid) {
    return studentsWithPayments.filter(s =>
      s.payments.some(p => (paid === 'true' ? p.paid : !p.paid))
    );
  }

  return studentsWithPayments;
}


async getWorkers(): Promise<any> {
    const workers = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .leftJoinAndSelect('user.groups', 'groups')
      .leftJoinAndSelect('user.groupsAsTeacher', 'groupsAsTeacher') 
      .leftJoinAndSelect('groups.course', 'course')
      .leftJoinAndSelect('groupsAsTeacher.course', 'teacherCourse')
      .where('user.salary IS NOT NULL')
      .getMany();

    return workers.map(worker => {
      const courses = Array.from(
        new Set(
          [
            ...worker.groups
              .filter(group => group?.course)
              .map(group => group.course.name),
            ...worker.groupsAsTeacher
              .filter(group => group?.course)
              .map(group => group.course.name),
          ]
        )
      );
      const groupNames = [
        ...worker.groups?.map(group => group.name) || [],
        ...worker.groupsAsTeacher?.map(group => group.name) || [],
      ];

      return {
        id: worker.id,
        firstName: worker.firstName || null,
        lastName: worker.lastName || null,
        username: worker.username || null,
        phone: worker.phone || null,
        address: worker.address || null,
        specialty: worker.specialty || null,
        salary: worker.salary || null,
        role: worker.role?.name || null,
        groups: groupNames.length ? groupNames : [],
        courses: courses.length ? courses : null,
      };
    });
  }

}