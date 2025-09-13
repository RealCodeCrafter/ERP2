import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, ILike, Repository } from 'typeorm';
import { Attendance } from './entities/attendance.entity';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { User } from '../user/entities/user.entity';
import { Lesson } from '../lesson/entities/lesson.entity';
import { Group } from '../groups/entities/group.entity';
import moment from 'moment';
import { Role } from 'src/role/entities/role.entity';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(Attendance)
    private readonly attendanceRepository: Repository<Attendance>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
     @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {}

  async create(createAttendanceDto: CreateAttendanceDto, teacherId: number) {
  // teacher rolini olish
  const teacherRole = await this.roleRepository.findOne({ where: { name: 'teacher' } });
  if (!teacherRole) {
    throw new NotFoundException(`Role 'teacher' not found`);
  }

  const teacher = await this.userRepository.findOne({ where: { id: teacherId, role: teacherRole } });
  if (!teacher) {
    throw new NotFoundException('Teacher not found');
  }

  const lesson = await this.lessonRepository.findOne({
    where: { id: createAttendanceDto.lessonId },
    relations: ['group', 'group.user'],
  });
  if (!lesson) {
    throw new NotFoundException('Lesson not found');
  }

  if (lesson.group.user.id !== teacherId) {
    throw new ForbiddenException('You can only mark attendance for your own group');
  }

  const results = [];

  // student rolini olish
  const studentRole = await this.roleRepository.findOne({ where: { name: 'student' } });
  if (!studentRole) {
    throw new NotFoundException(`Role 'student' not found`);
  }

  for (const attendanceDto of createAttendanceDto.attendances) {
    const student = await this.userRepository.findOne({ where: { id: attendanceDto.studentId, role: studentRole } });
    if (!student) {
      throw new NotFoundException(`Student with ID ${attendanceDto.studentId} not found`);
    }

    const existingAttendance = await this.attendanceRepository.findOne({
      where: {
        user: { id: attendanceDto.studentId },
        lesson: { id: createAttendanceDto.lessonId },
      },
    });
    if (existingAttendance) {
      throw new ForbiddenException(
        `Attendance for student ${attendanceDto.studentId} already exists for this lesson`,
      );
    }

    const attendance = this.attendanceRepository.create({
      user: student,
      lesson,
      status: attendanceDto.status,
      teacher: teacher,
    });

    const savedAttendance = await this.attendanceRepository.save(attendance);
    results.push(savedAttendance);
  }

  return results;
}

  async findAll() {
    return this.attendanceRepository.find({
      relations: ['user', 'lesson', 'lesson.group', 'lesson.group.course'],
    });
  }

  async findOne(id: number) {
    const attendance = await this.attendanceRepository.findOne({
      where: { id },
      relations: ['user', 'lesson', 'lesson.group', 'lesson.group.course'],
    });
    if (!attendance) {
      throw new NotFoundException('Attendance not found');
    }
    return attendance;
  }

  async bulkUpdateByLesson(
  lessonId: number,
  updateAttendanceDto: UpdateAttendanceDto,
  teacherId: number,
) {
  // 1️⃣ Teacher rolini topamiz
  const teacherRole = await this.roleRepository.findOne({ where: { name: 'teacher' } });
  if (!teacherRole) {
    throw new NotFoundException(`Role 'teacher' not found`);
  }

  const teacher = await this.userRepository.findOne({
    where: { id: teacherId, role: teacherRole },
  });
  if (!teacher) {
    throw new NotFoundException('Teacher not found');
  }

  // 2️⃣ Lessonni tekshiramiz
  const lesson = await this.lessonRepository.findOne({
    where: { id: lessonId },
    relations: ['group', 'group.user'],
  });
  if (!lesson) {
    throw new NotFoundException(`Lesson with ID ${lessonId} not found`);
  }

  if (lesson.group.user.id !== teacherId) {
    throw new ForbiddenException('You can only update attendance for your own group');
  }

  const results = [];

  // 3️⃣ Student rolini olish
  const studentRole = await this.roleRepository.findOne({ where: { name: 'student' } });
  if (!studentRole) {
    throw new NotFoundException(`Role 'student' not found`);
  }

  // 4️⃣ Har bir attendance update
  for (const aDto of updateAttendanceDto.attendances) {
    const student = await this.userRepository.findOne({
      where: { id: aDto.studentId, role: studentRole },
    });
    if (!student) {
      throw new NotFoundException(`Student with ID ${aDto.studentId} not found`);
    }

    if (!['present', 'absent', 'late'].includes(aDto.status)) {
      throw new BadRequestException(`Invalid status for student ID ${aDto.studentId}`);
    }

    const studentAttendance = await this.attendanceRepository.findOne({
      where: {
        lesson: { id: lessonId },
        user: { id: aDto.studentId },
      },
      relations: ['user', 'lesson'],
    });

    if (!studentAttendance) {
      throw new NotFoundException(
        `Attendance record not found for student ID ${aDto.studentId} in lesson ID ${lessonId}`,
      );
    }

    studentAttendance.status = aDto.status;
    studentAttendance.teacher = teacher;

    const updated = await this.attendanceRepository.save(studentAttendance);
    results.push(updated);
  }

  return results;
}


  async getGroupsWithoutAttendance(date: string) {
    const now = moment().utcOffset('+05:00');
    const dayOfWeek = moment(date, 'YYYY-MM-DD').format('dddd');
    const targetDate = moment(date, 'YYYY-MM-DD');

    const groups = await this.groupRepository.find({
      where: { status: 'active' },
      relations: ['user', 'lessons', 'lessons.attendances'],
    });

    const results = [];

    for (const group of groups) {
      if (!group.daysOfWeek?.includes(dayOfWeek)) {
        const invalidLessons = group.lessons.filter(l =>
          moment(l.lessonDate).isSame(targetDate, 'day'),
        );
        if (invalidLessons.length) {
          console.warn(
            `Xato: Guruh ${group.name} uchun ${dayOfWeek} kuni dars bo'lmasligi kerak, lekin ${invalidLessons.length} ta dars topildi.`,
          );
        }
        continue;
      }

      if (!group.lessons || group.lessons.length === 0) {
        console.log(`Guruh ${group.name}: Hali birinchi dars yaratilmagan`);
        continue;
      }

      const lessons = group.lessons.filter(l =>
        moment(l.lessonDate).isSame(targetDate, 'day'),
      );

      if (!lessons.length) {
        const groupEnd = moment(
          `${targetDate.format('YYYY-MM-DD')} ${group.endTime}`,
          'YYYY-MM-DD HH:mm',
        ).utcOffset('+05:00');
        if (now.isAfter(groupEnd)) {
          console.log(`Guruh ${group.name}: Dars yaratilmagan, vaqt o'tgan`);
          results.push({
            groupName: group.name,
            date: targetDate.format('YYYY-MM-DD'),
            lessonName: 'yaratilmagan',
            lessonTime: `${group.startTime} - ${group.endTime}`,
            teacher: group.user
              ? `${group.user.firstName} ${group.user.lastName}`
              : null,
            phone: group.user?.phone,
            reason: 'Lesson not created',
          });
        } else {
          console.log(`Guruh ${group.name}: Dars yaratilmagan, lekin vaqt hali o'tmagan`);
        }
        continue;
      }

      for (const lesson of lessons) {
        const hasAttendance = lesson.attendances?.length > 0;
        const lessonStart = moment(lesson.lessonDate).utcOffset('+05:00');
        const lessonEnd = moment(lesson.endDate).utcOffset('+05:00');

        if (lessonStart.isBefore(moment(group.createdAt).utcOffset('+05:00'))) {
          console.warn(
            `Xato: Guruh ${group.name} uchun dars (ID: ${lesson.id}) guruh yaratilishidan oldin (${lesson.lessonDate}) ro'yxatga olingan.`,
          );
          continue;
        }

        if (!hasAttendance && now.isAfter(lessonEnd)) {
          console.log(`Guruh ${group.name}: Davomat qilinmagan, dars tugagan`);
          results.push({
            groupName: group.name,
            date: targetDate.format('YYYY-MM-DD'),
            lessonName: lesson.lessonName ?? 'yaratilmagan',
            lessonTime: `${lessonStart.format('HH:mm')} - ${lessonEnd.format('HH:mm')}`,
            teacher: group.user
              ? `${group.user.firstName} ${group.user.lastName}`
              : null,
            phone: group.user?.phone,
            reason: 'Attendance not created',
          });
        } else if (hasAttendance) {
          console.log(`Guruh ${group.name}: Davomat qilingan (Dars: ${lesson.lessonName})`);
        } else {
          console.log(
            `Guruh ${group.name}: Davomat qilinmagan, lekin dars hali tugamagan (Dars: ${lesson.lessonName})`,
          );
        }
      }
    }

    return results;
  }

  async remove(id: number) {
    const attendance = await this.findOne(id);
    return this.attendanceRepository.remove(attendance);
  }

  async getAttendanceByGroup(groupId: number) {
    const group = await this.groupRepository.findOne({ where: { id: groupId } });
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    return this.attendanceRepository.find({
      where: { lesson: { group: { id: groupId } } },
      relations: ['user', 'lesson', 'lesson.group', 'lesson.group.course'],
    });
  }

  async getDailyAttendance(groupId: number, date: string, studentName?: string) {
    const group = await this.groupRepository.findOne({ where: { id: groupId } });
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const startDate = new Date(date);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);

    const query: any = {
      lesson: { group: { id: groupId }, lessonDate: Between(startDate, endDate) },
    };
    if (studentName) {
      query.user = [
        { firstName: ILike(`%${studentName}%`) },
        { lastName: ILike(`%${studentName}%`) },
      ];
    }

    const attendances = await this.attendanceRepository.find({
      where: query,
      relations: ['user', 'lesson', 'lesson.group', 'lesson.group.course', 'lesson.group.user'],
    });

    const totalStudents = (
      await this.groupRepository.findOne({
        where: { id: groupId },
        relations: ['users'],
      })
    ).users.length;

    const present = attendances.filter(a => a.status === 'present').length;
    const absent = attendances.filter(a => a.status === 'absent').length;
    const late = attendances.filter(a => a.status === 'late').length;

    return {
      totalStudents,
      present,
      absent,
      late,
      attendances,
    };
  }

  async getAttendanceStatistics(groupId?: number): Promise<any[]> {
    const query: any = {};
    if (groupId) {
      query.lesson = { group: { id: groupId } };
    }

    const attendances = await this.attendanceRepository.find({
      where: query,
      relations: ['user', 'lesson', 'lesson.group'],
    });

    const studentStats = attendances.reduce((acc, curr) => {
      const studentId = curr.user.id;
      if (!acc[studentId]) {
        acc[studentId] = {
          user: curr.user,
          present: 0,
          absent: 0,
          late: 0,
        };
      }
      if (curr.status === 'present') acc[studentId].present += 1;
      if (curr.status === 'absent') acc[studentId].absent += 1;
      if (curr.status === 'late') acc[studentId].late += 1;
      return acc;
    }, {});

    const result = Object.values(studentStats)
      .map((stat: any) => ({
        user: stat.user,
        present: stat.present,
        absent: stat.absent,
        late: stat.late,
        total: stat.present + stat.absent + stat.late,
      }))
      .sort((a, b) => b.present - a.present);

    return result;
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
        totalUsers: 0,
        totalAttendances: 0,
        present: 0,
        absent: 0,
        late: 0,
        attendances: [],
      };
    }

    const allUsers = new Set(attendances.map(a => a.user.id));
    const totalUsers = allUsers.size;
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
      totalUsers,
      totalAttendances,
      present,
      absent,
      late,
      attendances: attendancesList,
    };
  }
}