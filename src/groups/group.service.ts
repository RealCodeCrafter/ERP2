import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Group } from './entities/group.entity';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { Course } from '../courses/entities/course.entity';
import { User } from '../user/entities/user.entity';

@Injectable()
export class GroupService {
  constructor(
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(createGroupDto: CreateGroupDto): Promise<Group> {
    const { name, courseId, teacherId, userIds, startTime, endTime, daysOfWeek, price } =
      createGroupDto;

    // 1️⃣ Course tekshirish
    const course = await this.courseRepository.findOne({ where: { id: courseId } });
    if (!course) throw new BadRequestException('Course not found');

    // 2️⃣ Teacher tekshirish
    let teacher: User | null = null;
    if (teacherId) {
      teacher = await this.userRepository.findOne({
        where: { id: teacherId },
        relations: ['role'],
      });
      if (!teacher || teacher.role?.name !== 'teacher') {
        throw new BadRequestException('Teacher not found');
      }
    }

    // 3️⃣ Studentlarni olish (userIds orqali)
    let studentEntities: User[] = [];
    if (Array.isArray(userIds) && userIds.length) {
      studentEntities = await this.userRepository.find({
        where: { 
          id: In(userIds), 
          role: { name: 'student' } 
        },
        relations: ['role'],
      });
    }

    const existingGroup = await this.groupRepository.findOne({
      where: { name, course: { id: courseId } },
      relations: ['course'],
    });
    if (existingGroup) {
      throw new BadRequestException(
        'Group with the same name already exists for this course',
      );
    }

    const group = this.groupRepository.create({
      name,
      course,
      user: teacher,
      users: studentEntities,
      status: 'active',
      startTime,
      endTime,
      daysOfWeek,
      price,
    });
    const saved = await this.groupRepository.save(group);
    const teacherSalary = teacher ? await this.computeTeacherSalary(teacher.id) : null;
    if (teacher && teacherSalary !== null) {
      await this.userRepository.update(teacher.id, { salary: teacherSalary });
    }
    return Object.assign(saved, { teacherSalary }) as any;
  }

  async addStudentToGroup(groupId: number, userId: number): Promise<any> {
    const group = await this.groupRepository.findOne({
      where: { id: groupId, status: 'active' },
      relations: ['users', 'user'],
    });
    if (!group) throw new NotFoundException('Active group not found');

    const user = await this.userRepository.findOne({
      where: { id: userId, role: { name: 'student' } },
      relations: ['role'],
    });
    if (!user) throw new NotFoundException('Student not found');

    if (group.users.some((s) => s.id === userId)) {
      throw new BadRequestException('Student already in group');
    }

    group.users.push(user);
    const saved = await this.groupRepository.save(group);
    const fresh = await this.groupRepository.findOne({ where: { id: saved.id }, relations: ['user', 'users'] });
    const teacherId = fresh?.user?.id;
    const teacherSalary = teacherId ? await this.computeTeacherSalary(teacherId) : null;
    if (teacherId && teacherSalary !== null) {
      await this.userRepository.update(teacherId, { salary: teacherSalary });
    }
    return Object.assign(fresh || saved, { teacherSalary });
  }

  async restoreStudentToGroup(groupId: number, userId: number): Promise<any> {
    const group = await this.groupRepository.findOne({
      where: { id: groupId, status: 'active' },
      relations: ['users', 'user'],
    });
    if (!group) throw new NotFoundException('Active group not found');

    const user = await this.userRepository.findOne({
      where: { id: userId, role: { name: 'student' } },
      relations: ['role'],
    });
    if (!user) throw new NotFoundException('Student not found');

    if (group.users.some((s) => s.id === userId)) {
      throw new BadRequestException('Student already in group');
    }

    group.users.push(user);
    const saved = await this.groupRepository.save(group);
    const fresh = await this.groupRepository.findOne({ where: { id: saved.id }, relations: ['user', 'users'] });
    const teacherId = fresh?.user?.id;
    const teacherSalary = teacherId ? await this.computeTeacherSalary(teacherId) : null;
    if (teacherId && teacherSalary !== null) {
      await this.userRepository.update(teacherId, { salary: teacherSalary });
    }
    return Object.assign(fresh || saved, { teacherSalary });
  }

  async transferStudentToGroup(
    fromGroupId: number,
    toGroupId: number,
    userId: number,
  ): Promise<any> {
    if (fromGroupId === toGroupId) {
      throw new BadRequestException('Source and target groups are the same');
    }

    const fromGroup = await this.getGroupById(fromGroupId);
    const toGroup = await this.getGroupById(toGroupId);

    const user = await this.userRepository.findOne({
      where: { id: userId, role: { name: 'student' } },
      relations: ['role'],
    });
    if (!user) throw new NotFoundException('Student not found');

    if (!fromGroup.users.some((s) => s.id === userId)) {
      throw new BadRequestException('Student not found in source group');
    }
    if (toGroup.users.some((s) => s.id === userId)) {
      throw new BadRequestException('Student already in target group');
    }

    fromGroup.users = fromGroup.users.filter((s) => s.id !== userId);
    await this.groupRepository.save(fromGroup);

    toGroup.users.push(user);
    const savedTo = await this.groupRepository.save(toGroup);

    const fromTeacherId = fromGroup.user?.id;
    const toTeacherId = savedTo.user?.id;
    const fromTeacherSalary = fromTeacherId ? await this.computeTeacherSalary(fromTeacherId) : null;
    const toTeacherSalary = toTeacherId ? await this.computeTeacherSalary(toTeacherId) : null;
    if (fromTeacherId && fromTeacherSalary !== null) {
      await this.userRepository.update(fromTeacherId, { salary: fromTeacherSalary });
    }
    if (toTeacherId && toTeacherSalary !== null) {
      await this.userRepository.update(toTeacherId, { salary: toTeacherSalary });
    }

    return {
      fromGroup,
      toGroup: savedTo,
      fromTeacherSalary,
      toTeacherSalary,
    };
  }

  async getGroupById(id: number): Promise<Group> {
    const group = await this.groupRepository.findOne({
      where: { id },
      relations: ['course', 'user', 'users'],
    });
    if (!group) throw new NotFoundException('Group not found');
    return group;
  }

  async getGroupsByTeacherId(teacherId: number): Promise<any> {
    const groups = await this.groupRepository.find({
      where: { user: { id: teacherId }, status: 'active' },
      relations: ['users', 'course'],
    });

    if (!groups.length) {
      throw new NotFoundException('No groups found for this teacher');
    }

    const now = new Date();
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);

    const totalGroups = groups.length;
    const activeGroups = groups.filter(g => g.status === 'active').length;
    const newGroupsLastWeek = groups.filter(
      g => g.createdAt && g.createdAt >= lastWeek,
    ).length;
    const totalStudents = groups.reduce(
      (sum, group) => sum + (group.users?.length || 0),
      0,
    );

    const dayTranslations: { [key: string]: string } = {
      Monday: 'Dushanba',
      Tuesday: 'Seshanba',
      Wednesday: 'Chorshanba',
      Thursday: 'Payshanba',
      Friday: 'Juma',
      Saturday: 'Shanba',
      Sunday: 'Yakshanba',
    };

    return {
      stats: {
        totalGroups,
        newGroupsLastWeek,
        activeGroups,
        totalStudents,
      },
      groups: groups.map(g => ({
        id: g.id,
        name: g.name,
        studentCount: g.users?.length || 0,
        daysOfWeek: g.daysOfWeek
          ? g.daysOfWeek.map(day => dayTranslations[day]).join(', ')
          : 'N/A',
        time: g.startTime && g.endTime ? `${g.startTime} - ${g.endTime}` : 'N/A',
        course: g.course?.name || 'N/A',
      })),
    };
  }

  async getGroupsByStudentId(username: string): Promise<Group[]> {
    return this.groupRepository
      .createQueryBuilder('g')
      .leftJoinAndSelect('g.course', 'course')
      .leftJoinAndSelect('g.user', 'user')
      .leftJoinAndSelect('g.users', 'users')
      .where('users.username = :username', { username })
      .andWhere('g.status = :status', { status: 'active' })
      .getMany();
  }

  async getStudentGroups(groupId: number): Promise<User[]> {
    const group = await this.groupRepository.findOne({
      where: { id: groupId, status: 'active' },
      relations: ['users', 'users.role'],
    });
    if (!group) throw new NotFoundException('Active group not found');
    return group.users.filter((u) => u.role?.name === 'student');
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

  async searchGroups(name?: string, teacherName?: string): Promise<Group[]> {
    const qb = this.groupRepository
      .createQueryBuilder('g')
      .leftJoinAndSelect('g.course', 'course')
      .leftJoinAndSelect('g.user', 'user')
      .leftJoinAndSelect('user.role', 'userRole')
      .leftJoinAndSelect('g.users', 'users')
      .leftJoinAndSelect('users.role', 'usersRole')
      .where('g.status = :status', { status: 'active' });

    if (name) {
      qb.andWhere('g.name ILIKE :name', { name: `%${name}%` });
    }
    if (teacherName) {
      qb.andWhere('(user.firstName ILIKE :q OR user.lastName ILIKE :q)', {
        q: `%${teacherName}%`,
      });
    }

    return qb.getMany();
  }

  async updateStatus(id: number, status: 'active' | 'completed' | 'planned') {
    const group = await this.groupRepository.findOne({ where: { id }, relations: ['user'] });
    if (!group) throw new NotFoundException('Group not found');
    if (!['active', 'completed', 'planned'].includes(status)) {
      throw new BadRequestException('Invalid status. Must be one of: active, completed, planned');
    }
    group.status = status;
    const saved = await this.groupRepository.save(group);
    const teacherId = saved.user?.id;
    const teacherSalary = teacherId ? await this.computeTeacherSalary(teacherId) : null;
    if (teacherId && teacherSalary !== null) {
      await this.userRepository.update(teacherId, { salary: teacherSalary });
    }
    return Object.assign(saved, { teacherSalary });
  }

  async removeStudentFromGroup(
    groupId: number,
    userId: number,
  ): Promise<{ message: string; teacherSalary: number | null }> {
    const group = await this.groupRepository.findOne({
      where: { id: groupId },
      relations: ['users', 'users.role', 'user'],
    });
    if (!group) throw new NotFoundException('Group not found');

    const inGroup = group.users.find(
      (s) => s.id === userId && s.role?.name === 'student',
    );
    if (!inGroup) {
      throw new NotFoundException('Student not found in this group');
    }

    group.users = group.users.filter((u) => u.id !== userId);
    await this.groupRepository.save(group);
    const fresh = await this.groupRepository.findOne({ where: { id: group.id }, relations: ['user', 'users'] });
    const teacherId = fresh?.user?.id;
    const teacherSalary = teacherId ? await this.computeTeacherSalary(teacherId) : null;
    if (teacherId && teacherSalary !== null) {
      await this.userRepository.update(teacherId, { salary: teacherSalary });
    }

    return { message: 'Student removed from group successfully', teacherSalary };
  }

  async update(id: number, updateGroupDto: UpdateGroupDto): Promise<any> {
    const group = await this.getGroupById(id);
    const oldTeacherId = group.user?.id;

    if (updateGroupDto.name) group.name = updateGroupDto.name;
    if (updateGroupDto.price !== undefined) group.price = updateGroupDto.price;
    if (updateGroupDto.startTime) group.startTime = updateGroupDto.startTime;
    if (updateGroupDto.endTime) group.endTime = updateGroupDto.endTime;
    if (updateGroupDto.daysOfWeek)
      group.daysOfWeek = updateGroupDto.daysOfWeek;
    if (updateGroupDto.status) group.status = updateGroupDto.status;

    if (updateGroupDto.courseId) {
      const course = await this.courseRepository.findOne({
        where: { id: updateGroupDto.courseId },
      });
      if (!course) throw new NotFoundException('Course not found');
      group.course = course;
    }

    if (updateGroupDto.teacherId) {
      const teacher = await this.userRepository.findOne({
        where: { id: updateGroupDto.teacherId, role: { name: 'teacher' } },
        relations: ['role'],
      });
      if (!teacher) throw new NotFoundException('Teacher not found');
      group.user = teacher;
    }

    if (updateGroupDto.userIds !== undefined) {
      const userIds = updateGroupDto.userIds ?? [];
      const users = await this.userRepository.find({
        where: { id: In(userIds), role: { name: 'student' } },
        relations: ['role'],
      });
      if (users.length !== userIds.length) {
        throw new NotFoundException('One or more students not found');
      }
      group.users = users;
    }

    const saved = await this.groupRepository.save(group);
    const teacherId = saved.user?.id;
    const teacherSalary = teacherId ? await this.computeTeacherSalary(teacherId) : null;
    if (teacherId && teacherSalary !== null) {
      await this.userRepository.update(teacherId, { salary: teacherSalary });
    }
    if (oldTeacherId && oldTeacherId !== teacherId) {
      const oldSalary = await this.computeTeacherSalary(oldTeacherId);
      await this.userRepository.update(oldTeacherId, { salary: oldSalary });
    }
    return Object.assign(saved, { teacherSalary });
  }

  async delete(id: number): Promise<{ message: string; teacherSalary: number | null }> {
    const group = await this.groupRepository.findOne({ where: { id }, relations: ['user'] });
    if (!group) {
      throw new NotFoundException(`Group with id ${id} does not exist`);
    }
    const teacherId = group.user?.id;
    await this.groupRepository.remove(group);
    const teacherSalary = teacherId ? await this.computeTeacherSalary(teacherId) : null;
    if (teacherId && teacherSalary !== null) {
      await this.userRepository.update(teacherId, { salary: teacherSalary });
    }
    return { message: `Group with id ${id} has been successfully deleted`, teacherSalary };
  }

  async getGroupsByCourseId(courseId: number): Promise<Group[]> {
    return this.groupRepository.find({
      where: { course: { id: courseId }, status: 'active' },
      relations: ['course', 'user', 'user.role', 'users', 'users.role'],
    });
  }

  async getStudentsByGroupId(groupId: number): Promise<User[]> {
    const group = await this.getGroupById(groupId);
    return group.users.filter((u) => u.role?.name === 'student');
  }

  async getTeacherCurrentMonthSchedules(teacherId: number, month?: number, year?: number): Promise<any> {
  const today = new Date();
  const yearVal = year || today.getFullYear();
  const monthVal = month || (today.getMonth() + 1);

  const groups = await this.groupRepository.find({
    where: { user: { id: teacherId }, status: 'active' },
    relations: ['course', 'user', 'users', 'users.role', 'attendances', 'attendances.user'],
  });

  if (!groups.length) {
    throw new NotFoundException('No groups found for this teacher');
  }

  const isLeapYear = (yearVal % 4 === 0 && yearVal % 100 !== 0) || (yearVal % 400 === 0);
  const daysInMonth = [31, isLeapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const daysInCurrentMonth = daysInMonth[monthVal - 1];

  const startDate = `${yearVal}-${monthVal.toString().padStart(2, '0')}-01`;
  const endDate = `${yearVal}-${monthVal.toString().padStart(2, '0')}-${daysInCurrentMonth}`;

  const results = groups.map(group => {
    const lessonDates: number[] = [];
    for (let day = 1; day <= daysInCurrentMonth; day++) {
      const date = new Date(yearVal, monthVal - 1, day);
      const dayOfWeek = date.toLocaleString('en-US', { weekday: 'long' });
      if (group.daysOfWeek?.includes(dayOfWeek)) {
        if (day === daysInCurrentMonth && group.endTime && group.endTime.startsWith('00:')) {
          continue;
        }
        lessonDates.push(day);
      }
    }

    const students = group.users
      .filter(user => user.role?.name === 'student')
      .map(user => {
        const studentAttendances = group.attendances
          .filter(att => att.user.id === user.id && att.date >= startDate && att.date <= endDate)
          .map(att => ({
            date: att.date,
            status: att.status,
            grade: att.grade,
          }));

        return {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          attendances: studentAttendances,
        };
      });

    const groupDetails = {
      id: group.id,
      name: group.name,
      teacher: group.user ? `${group.user.firstName} ${group.user.lastName}` : 'N/A',
      course: group.course?.name || 'N/A',
      startTime: group.startTime || 'N/A',
      endTime: group.endTime || 'N/A',
      daysOfWeek: group.daysOfWeek ? group.daysOfWeek.join(', ') : 'N/A',
      createdAt: group.createdAt.toISOString().split('T')[0],
      price: group.price,
      totalLessons: lessonDates.length,
      lessonDates,
      students,
    };

    return groupDetails;
  });

  return results;
}



  private async computeTeacherSalary(teacherId: number): Promise<number> {
    const teacher = await this.userRepository.findOne({ where: { id: teacherId }, relations: ['role'] });
    if (!teacher || teacher.role?.name !== 'teacher') return Number(teacher?.salary ?? 0);
    const percent = Number(teacher.percent ?? 0);
    if (percent <= 0) return 0;

    const rows = await this.groupRepository
      .createQueryBuilder('g')
      .leftJoin('g.users', 'u')
      .where('g.userId = :teacherId', { teacherId })
      .andWhere('g.status = :status', { status: 'active' })
      .select('g.id', 'id')
      .addSelect('g.price', 'price')
      .addSelect('COUNT(u.id)', 'studentCount')
      .groupBy('g.id')
      .addGroupBy('g.price')
      .getRawMany();

    const totalRevenue = rows.reduce((sum, r) => sum + Number(r.price ?? 0) * Number(r.studentcount ?? r.studentCount ?? 0), 0);
    return Number(((totalRevenue * percent) / 100).toFixed(2));
  }
}