import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Lesson } from './entities/lesson.entity';
import { Group } from '../groups/entities/group.entity';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { User } from '../user/entities/user.entity';
import { Attendance } from '../attendance/entities/attendance.entity';
import * as moment from 'moment-timezone';

@Injectable()
export class LessonService {
  constructor(
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Attendance)
    private readonly attendanceRepository: Repository<Attendance>,
  ) {}

  async create(userId: number, lessonData: CreateLessonDto): Promise<Lesson> {
  const user = await this.userRepository.findOne({
    where: { id: userId },
    relations: ['role'],
  });
  if (!user) throw new NotFoundException('User not found');

  const group = await this.groupRepository.findOne({
    where: { id: lessonData.groupId },
    relations: ['user', 'user.role', 'users', 'users.role', 'course'],
  });

  if (!group) throw new NotFoundException('Group not found');

  if (user.role?.name !== 'teacher' || group.user?.id !== user.id) {
    throw new ForbiddenException(
      'Only the assigned teacher can create a lesson for this group',
    );
  }

  const lessonCount = await this.lessonRepository.count({
    where: { group: { id: lessonData.groupId } },
  });

  const now = moment().utcOffset('+05:00');
  const targetDate = now.clone().startOf('day');
  const dayOfWeek = now.format('dddd');

  if (!group.daysOfWeek.includes(dayOfWeek)) {
    throw new BadRequestException(
      `Today (${dayOfWeek}) is not a valid lesson day for group ${group.name}. Valid days: ${group.daysOfWeek.join(', ')}`,
    );
  }

  const lessonDate = now.toDate();

  let endDate: Date | null = null;
  if (group.startTime && group.endTime) {
    const startTime = moment(
      `${targetDate.format('YYYY-MM-DD')} ${group.startTime}`,
      'YYYY-MM-DD HH:mm',
    ).utcOffset('+05:00');

    const endTime = moment(
      `${targetDate.format('YYYY-MM-DD')} ${group.endTime}`,
      'YYYY-MM-DD HH:mm',
    ).utcOffset('+05:00');

    const duration = endTime.diff(startTime, 'hours', true);
    endDate = moment(lessonDate).add(duration, 'hours').toDate();
  } else {
    endDate = moment(lessonDate).add(2, 'hours').toDate();
  }

  const lesson = this.lessonRepository.create({
    lessonName: lessonData.lessonName,
    lessonNumber: lessonCount + 1,
    lessonDate,
    endDate,
    group,
  });

  return this.lessonRepository.save(lesson);
}


  async findAll(userId: number) {
    await this.getUserById(userId);
    return this.lessonRepository.find({ relations: ['group', 'group.course', 'group.user'] });
  }



   private async getUserById(id: number): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['role'],
    });
    if (!user) throw new NotFoundException(`User with ID ${id} not found`);
    return user;
  }

  async findLessonsByGroup(
    groupId: number,
    userId: number,
    date?: string,
  ): Promise<Lesson[]> {
    const user = await this.getUserById(userId);

    const group = await this.groupRepository.findOne({
      where: { id: groupId },
      relations: ['user', 'user.role', 'users', 'users.role'],
    });

    if (!group) throw new NotFoundException('Group not found');

    const isTeacher =
      group.user?.id === userId && group.user.role?.name === 'teacher';
    const isStudent = group.users.some(
      (student) => student.id === userId && student.role?.name === 'student',
    );

    if (!isTeacher && !isStudent) {
      throw new ForbiddenException('You can only view lessons in your own group');
    }

    const query: any = { group: { id: groupId } };
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
      query.lessonDate = Between(startDate, endDate);
    }

    return this.lessonRepository.find({
      where: query,
      relations: [
        'group',
        'group.course',
        'group.user',
        'group.user.role',
        'attendances',
        'attendances.user',
        'attendances.user.role',
      ],
    });
  }

  async update(
    id: number,
    updateLessonDto: UpdateLessonDto,
    userId: number,
  ): Promise<Lesson> {
    const user = await this.getUserById(userId);

    const lesson = await this.lessonRepository.findOne({
      where: { id },
      relations: ['group', 'group.user', 'group.user.role'],
    });

    if (!lesson) {
      throw new NotFoundException(`Lesson with ID ${id} not found`);
    }

    if (user.role?.name !== 'teacher' || lesson.group.user.id !== userId) {
      throw new ForbiddenException('You can only update lessons in your own group');
    }

    lesson.lessonName = updateLessonDto.lessonName || lesson.lessonName;

    return this.lessonRepository.save(lesson);
  }

  async remove(id: number, userId: number) {
    const user = await this.getUserById(userId);

    const lesson = await this.lessonRepository.findOne({
      where: { id },
      relations: ['group', 'group.user', 'group.user.role'],
    });

    if (!lesson) {
      throw new NotFoundException(`Lesson with ID ${id} not found`);
    }

    if (user.role?.name !== 'teacher' || lesson.group.user.id !== userId) {
      throw new ForbiddenException('You can only delete lessons from your own group');
    }

    await this.lessonRepository.delete(id);
    return { message: `Lesson with ID ${id} successfully deleted` };
  }

  async getLessonStatistics(groupId?: number, date?: string) {
    const query: any = {};
    if (groupId) {
      query.group = { id: groupId };
    }
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
      query.lessonDate = Between(startDate, endDate);
    }

    const lessons = await this.lessonRepository.find({
      where: query,
      relations: [
        'group',
        'group.user',
        'group.user.role',
        'group.course',
        'group.users',
        'group.users.role',
        'attendances',
        'attendances.user',
        'attendances.user.role',
      ],
    });

    return lessons.map((lesson) => {
      const totalAttendances = lesson.attendances.length;
      const presentCount = lesson.attendances.filter(
        (att) => att.status === 'present',
      ).length;
      const attendanceRate =
        totalAttendances > 0 ? (presentCount / totalAttendances) * 100 : 0;

      return {
        lesson,
        group: lesson.group,
        teacher: lesson.group.user,
        course: lesson.group.course,
        totalStudents: lesson.group.users.filter(
          (u) => u.role?.name === 'student',
        ).length,
        presentCount,
        attendanceRate: Number(attendanceRate.toFixed(2)),
      };
    });
  }


  async getAttendanceHistoryByLesson(lessonId: number, userId: number): Promise<any> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const lesson = await this.lessonRepository.findOne({
      where: { id: lessonId },
      relations: ['group', 'group.user', 'group.users', 'attendances', 'attendances.user'],
    });

    if (!lesson) {
      throw new NotFoundException(`Lesson with ID ${lessonId} not found`);
    }

    const isTeacher = lesson.group.user.id === userId;
    const isStudent = lesson.group.users.some(student => student.id === userId);

    if (!isTeacher && !isStudent) {
      throw new ForbiddenException('You can only view attendance history for lessons in your own group');
    }

    const attendances = await this.attendanceRepository
      .createQueryBuilder('attendance')
      .leftJoinAndSelect('attendance.user', 'user')
      .leftJoinAndSelect('attendance.lesson', 'lesson')
      .leftJoinAndSelect('lesson.group', 'group')
      .where('attendance.lessonId = :lessonId', { lessonId })
      .orderBy('user.firstName', 'ASC')
      .getMany();

    const filteredAttendances = isStudent
      ? attendances.filter(attendance => attendance.user.id === userId)
      : attendances;

    const totalStudents = filteredAttendances.length;
    const presentCount = filteredAttendances.filter(a => a.status === 'present').length;
    const absentCount = filteredAttendances.filter(a => a.status === 'absent').length;
    const lateCount = filteredAttendances.filter(a => a.status === 'late').length;

    return {
      statistics: {
        totalStudents: totalStudents,
        present: presentCount,
        absent: absentCount,
        late: lateCount,
      },
      date: filteredAttendances.length > 0 
        ? filteredAttendances[0].createdAt.toISOString().split('T')[0]
        : lesson.lessonDate.toISOString().split('T')[0],
      exportable: true,
      students: filteredAttendances.map((attendance, index) => ({
        userId: attendance.user.id,
        userName: `${attendance.user.firstName} ${attendance.user.lastName}`,
        phone: attendance.user.phone,
        groupName: lesson.group.name,
        status: attendance.status === 'present' ? 'present' : attendance.status === 'absent' ? 'absent' : 'late',
      })),
    };
  }

  async getDailyAttendanceStats(
    groupId?: number,
    date?: string,
    period?: 'daily' | 'weekly' | 'monthly',
    studentName?: string,
  ): Promise<any> {
    const moment = require('moment');

    let startDate = date
      ? moment(date, 'YYYY-MM-DD').startOf('day')
      : moment().utcOffset('+05:00').startOf('day');

    if (!startDate.isValid()) {
      throw new BadRequestException('Sana formati noto‘g‘ri. YYYY-MM-DD formatidan foydalaning');
    }

    let endDate = startDate.clone();
    if (period === 'daily' || !period) {
      endDate.add(1, 'day');
    } else if (period === 'weekly') {
      endDate.add(7, 'days');
    } else if (period === 'monthly') {
      endDate.add(1, 'month');
    } else {
      throw new BadRequestException('Noto‘g‘ri davr. "daily", "weekly" yoki "monthly" dan foydalaning');
    }

    const qb = this.attendanceRepository
      .createQueryBuilder('attendance')
      .leftJoinAndSelect('attendance.user', 'user')
      .leftJoinAndSelect('attendance.lesson', 'lesson')
      .leftJoinAndSelect('lesson.group', 'group')
      .leftJoinAndSelect('group.course', 'course')
      .leftJoinAndSelect('group.user', 'teacher')
      .where('attendance.createdAt BETWEEN :start AND :end', {
        start: startDate.toDate(),
        end: endDate.toDate(),
      })
      .andWhere('group.status = :status', { status: 'active' });

    if (groupId) {
      qb.andWhere('group.id = :groupId', { groupId });
    }

    if (studentName && studentName.trim() !== '') {
      qb.andWhere(
        `(user.firstName ILIKE :name OR user.lastName ILIKE :name)`,
        { name: `%${studentName.trim()}%` },
      );
    }

    const attendances = await qb.orderBy('attendance.createdAt', 'DESC').getMany();

    if (!attendances.length) {
      return {
        totalStudents: 0,
        totalAttendances: 0,
        present: 0,
        absent: 0,
        late: 0,
        attendances: [],
      };
    }

    const allStudents = new Set(attendances.map(a => a.user.id));
    const totalStudents = allStudents.size;
    const totalAttendances = attendances.length;
    const present = attendances.filter(a => a.status === 'present').length;
    const absent = attendances.filter(a => a.status === 'absent').length;
    const late = attendances.filter(a => a.status === 'late').length;

    const attendancesList = attendances.map((a) => ({
      userId: a.user.id,
      user: `${a.user.firstName} ${a.user.lastName}`,
      group: a.lesson.group.name,
      course: a.lesson.group.course?.name ?? 'N/A',
      time: a.lesson.lessonDate
        ? `${a.lesson.lessonDate.toISOString().split('T')[0]} ${a.lesson.group.startTime || 'N/A'}`
        : 'N/A',
      teacher: a.lesson.group.user
        ? `${a.lesson.group.user.firstName} ${a.lesson.group.user.lastName}`
        : 'N/A',
      status: a.status,
    }));

    return {
      totalStudents,
      totalAttendances,
      present,
      absent,
      late,
      attendances: attendancesList,
    };
  }
}