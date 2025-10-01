import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, ILike, In, Repository } from 'typeorm';
import { Attendance } from './entities/attendance.entity';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { User } from '../user/entities/user.entity';
import { Group } from '../groups/entities/group.entity';
import { Role } from '../role/entities/role.entity';
import * as moment from 'moment';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(Attendance)
    private readonly attendanceRepository: Repository<Attendance>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {}

  async createOrUpdate(createAttendanceDto: CreateAttendanceDto, teacherId: number) {
    const teacherRole = await this.roleRepository.findOne({ where: { name: 'teacher' } });
    if (!teacherRole) throw new NotFoundException(`Role 'teacher' not found`);

    const teacher = await this.userRepository.findOne({ where: { id: teacherId, role: teacherRole } });
    if (!teacher) throw new NotFoundException('Teacher not found');

    const group = await this.groupRepository.findOne({
      where: { id: createAttendanceDto.groupId },
      relations: ['user', 'users'],
    });
    if (!group) throw new NotFoundException('Group not found');

    if (group.user.id !== teacherId) {
      throw new ForbiddenException('You can only mark attendance for your own group');
    }

    const targetDate = moment(createAttendanceDto.date, 'YYYY-MM-DD');
    if (!targetDate.isValid()) {
      throw new BadRequestException('Invalid date format, use YYYY-MM-DD');
    }

    const dayOfWeek = targetDate.format('dddd');
    if (!group.daysOfWeek?.includes(dayOfWeek)) {
      throw new BadRequestException(`Group ${group.name} does not have a lesson on ${dayOfWeek}`);
    }

    const studentRole = await this.roleRepository.findOne({ where: { name: 'student' } });
    if (!studentRole) throw new NotFoundException(`Role 'student' not found`);

    const existingAttendances = await this.attendanceRepository.find({
      where: { group: { id: group.id }, date: targetDate.format('YYYY-MM-DD') },
      relations: ['user'],
    });

    const results = [];
    for (const attendanceDto of createAttendanceDto.attendances) {
      const studentInGroup = group.users.some(u => u.id === attendanceDto.studentId);
      if (!studentInGroup) {
        throw new BadRequestException(`Student with ID ${attendanceDto.studentId} is not in group ${group.id}`);
      }

      const student = await this.userRepository.findOne({
        where: { id: attendanceDto.studentId, role: studentRole },
      });
      if (!student) throw new NotFoundException(`Student with ID ${attendanceDto.studentId} not found`);

      let attendance = existingAttendances.find(a => a.user.id === student.id);
      if (!attendance) {
        attendance = this.attendanceRepository.create({
          user: student,
          group,
          date: targetDate.format('YYYY-MM-DD'),
          teacher,
        });
      }

      attendance.status = attendanceDto.status;
      attendance.grade = attendanceDto.grade ?? null;

      const saved = await this.attendanceRepository.save(attendance);
      results.push(saved);
    }

    return {
      date: targetDate.format('YYYY-MM-DD'),
      group: {
        id: group.id,
        name: group.name,
        startTime: group.startTime,
        endTime: group.endTime,
        daysOfWeek: group.daysOfWeek,
      },
      teacher: {
        id: teacher.id,
        firstName: teacher.firstName,
        lastName: teacher.lastName,
        phone: teacher.phone,
      },
      students: results.map(r => ({
        id: r.user.id,
        firstName: r.user.firstName,
        lastName: r.user.lastName,
        address: r.user.address,
        phone: r.user.phone,
        grade: r.grade,
        status: r.status,
      })),
    };
  }

  async markTeacherAttendance(
  teacherId: number,
  groupId: number,
  date: string,
  status: 'absent_with_reason' | 'absent_without_reason',
  adminId: number,
) {
  const adminRoles = await this.roleRepository.find({
    where: { name: In(['admin', 'superAdmin']) },
  });
  if (!adminRoles.length) throw new NotFoundException('Admin roles not found');

  const admin = await this.userRepository.findOne({
    where: { id: adminId, role: { id: In(adminRoles.map(r => r.id)) } },
  });
  if (!admin) throw new ForbiddenException('Only admins or superAdmins can mark teacher attendance');

  const teacherRole = await this.roleRepository.findOne({ where: { name: 'teacher' } });
  if (!teacherRole) throw new NotFoundException(`Role 'teacher' not found`);

  const teacher = await this.userRepository.findOne({ where: { id: teacherId, role: teacherRole } });
  if (!teacher) throw new NotFoundException('Teacher not found');

  const group = await this.groupRepository.findOne({ where: { id: groupId, user: { id: teacherId } } });
  if (!group) throw new BadRequestException('Teacher is not assigned to this group');

  const targetDate = moment(date, 'YYYY-MM-DD');
  if (!targetDate.isValid()) {
    throw new BadRequestException('Invalid date format, use YYYY-MM-DD');
  }

  // Tekshirish: shu kunda shu guruh uchun yo‘qlama yozilganmi?
  const existing = await this.attendanceRepository.findOne({
    where: {
      user: { id: teacherId },
      group: { id: groupId },
      date: targetDate.format('YYYY-MM-DD'),
      isTeacherAttendance: true,
    },
  });

  if (existing) {
    existing.status = status;
    return await this.attendanceRepository.save(existing);
  }

  const attendance = this.attendanceRepository.create({
    date: targetDate.format('YYYY-MM-DD'),
    status,
    isTeacherAttendance: true,
    user: teacher,
    group: group,
    teacher: admin,
  });

  return await this.attendanceRepository.save(attendance);
}

async getTeacherAttendances(filters: { groupId?: number; date?: string; teacherId?: number }) {
  const query: any = { isTeacherAttendance: true };

  if (filters.teacherId) {
    query.user = { id: filters.teacherId };
  }
  if (filters.groupId) {
    query.group = { id: filters.groupId };
  }
  if (filters.date) {
    query.date = filters.date;
  }

  const attendances = await this.attendanceRepository.find({
    where: query,
    relations: ['user', 'group', 'teacher'],
    order: { date: 'DESC' },
  });

  return attendances.map(a => ({
    id: a.id,
    teacherName: `${a.user.firstName} ${a.user.lastName}`,
    groupName: a.group?.name || null,
    date: a.date,
    status: a.status,
    markedBy: `${a.teacher?.firstName} ${a.teacher?.lastName}`,
  }));
}

  async findAll() {
    return this.attendanceRepository.find({
      relations: ['user', 'group', 'group.course'],
    });
  }

  async findOne(id: number) {
    const attendance = await this.attendanceRepository.findOne({
      where: { id },
      relations: ['user', 'group', 'group.course'],
    });
    if (!attendance) {
      throw new NotFoundException('Attendance not found');
    }
    return attendance;
  }

  async bulkUpdateByGroupAndDate(
    groupId: number,
    date: string,
    updateAttendanceDto: UpdateAttendanceDto,
    teacherId: number,
  ) {
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

    const group = await this.groupRepository.findOne({
      where: { id: groupId },
      relations: ['user', 'users'],
    });
    if (!group) {
      throw new NotFoundException(`Group with ID ${groupId} not found`);
    }

    if (group.user.id !== teacherId) {
      throw new ForbiddenException('You can only update attendance for your own group');
    }

    const targetDate = moment(date, 'YYYY-MM-DD');
    if (!targetDate.isValid()) {
      throw new BadRequestException('Invalid date format, use YYYY-MM-DD');
    }

    const dayOfWeek = targetDate.format('dddd');
    if (!group.daysOfWeek?.includes(dayOfWeek)) {
      throw new BadRequestException(`Group ${group.name} does not have a lesson on ${dayOfWeek}`);
    }

    const results = [];
    const studentRole = await this.roleRepository.findOne({ where: { name: 'student' } });
    if (!studentRole) {
      throw new NotFoundException(`Role 'student' not found`);
    }

    for (const aDto of updateAttendanceDto.attendances) {
      const studentInGroup = group.users.some(u => u.id === aDto.studentId);
      if (!studentInGroup) {
        throw new BadRequestException(`Student with ID ${aDto.studentId} is not in group ${group.id}`);
      }

      const student = await this.userRepository.findOne({
        where: { id: aDto.studentId, role: studentRole },
      });
      if (!student) {
        throw new NotFoundException(`Student with ID ${aDto.studentId} not found`);
      }

      if (!['present', 'absent', 'late'].includes(aDto.status)) {
        throw new BadRequestException(`Invalid status for student ID ${aDto.studentId}`);
      }

      if (aDto.grade && (aDto.grade < 0 || aDto.grade > 100)) {
        throw new BadRequestException(`Invalid grade for student ID ${aDto.studentId}, must be between 0 and 100`);
      }

      const studentAttendance = await this.attendanceRepository.findOne({
        where: {
          group: { id: groupId },
          user: { id: aDto.studentId },
          date: targetDate.format('YYYY-MM-DD'),
        },
        relations: ['user', 'group'],
      });

      if (!studentAttendance) {
        throw new NotFoundException(
          `Attendance record not found for student ID ${aDto.studentId} on ${targetDate.format('YYYY-MM-DD')}`,
        );
      }

      studentAttendance.status = aDto.status;
      studentAttendance.grade = aDto.grade || null;
      studentAttendance.teacher = teacher;

      const updated = await this.attendanceRepository.save(studentAttendance);
      results.push(updated);
    }

    return results;
  }

  async getGroupsWithoutAttendance(date: string) {
    const now = moment().utcOffset('+05:00');
    const targetDate = moment(date, 'YYYY-MM-DD');
    if (!targetDate.isValid()) {
      throw new BadRequestException('Invalid date format, use YYYY-MM-DD');
    }

    const dayOfWeek = targetDate.format('dddd');
    const groups = await this.groupRepository.find({
      where: { status: 'active' },
      relations: ['user', 'users'],
    });

    const results = [];

    for (const group of groups) {
      if (!group.daysOfWeek?.includes(dayOfWeek)) {
        continue;
      }

      const groupEnd = moment(
        `${targetDate.format('YYYY-MM-DD')} ${group.endTime}`,
        'YYYY-MM-DD HH:mm',
      ).utcOffset('+05:00');

      const attendanceExists = await this.attendanceRepository.findOne({
        where: {
          group: { id: group.id },
          date: targetDate.format('YYYY-MM-DD'),
        },
      });

      if (!attendanceExists && now.isAfter(groupEnd)) {
        results.push({
          groupName: group.name,
          date: targetDate.format('YYYY-MM-DD'),
          lessonTime: `${group.startTime} - ${group.endTime}`,
          teacher: group.user ? `${group.user.firstName} ${group.user.lastName}` : null,
          phone: group.user?.phone,
          reason: 'Attendance not recorded',
        });
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
      where: { group: { id: groupId } },
      relations: ['user', 'group', 'group.course'],
      order: { date: 'ASC' },
    });
  }

  async getDailyAttendance(groupId: number, date: string, studentName?: string) {
    const group = await this.groupRepository.findOne({ where: { id: groupId } });
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const targetDate = moment(date, 'YYYY-MM-DD');
    if (!targetDate.isValid()) {
      throw new BadRequestException('Invalid date format, use YYYY-MM-DD');
    }

    const dayOfWeek = targetDate.format('dddd');
    if (!group.daysOfWeek?.includes(dayOfWeek)) {
      throw new BadRequestException(`Group ${group.name} does not have a lesson on ${dayOfWeek}`);
    }

    const query: any = {
      group: { id: groupId },
      date: targetDate.format('YYYY-MM-DD'),
    };
    if (studentName) {
      query.user = [
        { firstName: ILike(`%${studentName}%`) },
        { lastName: ILike(`%${studentName}%`) },
      ];
    }

    const attendances = await this.attendanceRepository.find({
      where: query,
      relations: ['user', 'group', 'group.course', 'group.user'],
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
      attendances: attendances.map(a => ({
        userId: a.user.id,
        userName: `${a.user.firstName} ${a.user.lastName}`,
        status: a.status,
        grade: a.grade,
        date: a.date,
      })),
    };
  }

  async getAttendanceStatistics(groupId?: number): Promise<any[]> {
    const query: any = {};
    if (groupId) {
      query.group = { id: groupId };
    }

    const attendances = await this.attendanceRepository.find({
      where: query,
      relations: ['user', 'group'],
    });

    const studentStats = attendances.reduce((acc, curr) => {
      const studentId = curr.user.id;
      if (!acc[studentId]) {
        acc[studentId] = {
          user: curr.user,
          present: 0,
          absent: 0,
          late: 0,
          totalGrade: 0,
          gradeCount: 0,
        };
      }
      if (curr.status === 'present') acc[studentId].present += 1;
      if (curr.status === 'absent') acc[studentId].absent += 1;
      if (curr.status === 'late') acc[studentId].late += 1;
      if (curr.grade !== null) {
        acc[studentId].totalGrade += curr.grade;
        acc[studentId].gradeCount += 1;
      }
      return acc;
    }, {});

    const result = Object.values(studentStats)
      .map((stat: any) => ({
        user: stat.user,
        present: stat.present,
        absent: stat.absent,
        late: stat.late,
        total: stat.present + stat.absent + stat.late,
        averageGrade: stat.gradeCount > 0 ? stat.totalGrade / stat.gradeCount : null,
      }))
      .sort((a, b) => b.present - a.present);

    return result;
  }

  async getAttendanceHistoryByGroupAndDate(groupId: number, userId: number, date: string): Promise<any> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const group = await this.groupRepository.findOne({
      where: { id: groupId },
      relations: ['user', 'users'],
    });
    if (!group) {
      throw new NotFoundException(`Group with ID ${groupId} not found`);
    }

    const targetDate = moment(date, 'YYYY-MM-DD');
    if (!targetDate.isValid()) {
      throw new BadRequestException('Invalid date format, use YYYY-MM-DD');
    }

    const isTeacher = group.user.id === userId;
    const isStudent = group.users.some(student => student.id === userId);

    if (!isTeacher && !isStudent) {
      throw new ForbiddenException('You can only view attendance history for your own group');
    }

    const attendances = await this.attendanceRepository
      .createQueryBuilder('attendance')
      .leftJoinAndSelect('attendance.user', 'user')
      .leftJoinAndSelect('attendance.group', 'group')
      .where('attendance.groupId = :groupId', { groupId })
      .andWhere('attendance.date = :date', { date: targetDate.format('YYYY-MM-DD') })
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
        totalStudents,
        present: presentCount,
        absent: absentCount,
        late: lateCount,
      },
      date: targetDate.format('YYYY-MM-DD'),
      exportable: true,
      students: filteredAttendances.map((attendance) => ({
        userId: attendance.user.id,
        userName: `${attendance.user.firstName} ${attendance.user.lastName}`,
        phone: attendance.user.phone,
        groupName: group.name,
        status: attendance.status,
        grade: attendance.grade,
      })),
    };
  }
}