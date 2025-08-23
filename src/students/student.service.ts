
import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Student } from './entities/student.entity';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { Group } from '../groups/entities/group.entity';
import { Profile } from '../profile/entities/profile.entity';
import { Attendance } from '../attendance/entities/attendance.entity';
import { Payment } from '../payment/entities/payment.entity';
import { Lesson } from '../lesson/entities/lesson.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class StudentsService {
  constructor(
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
    @InjectRepository(Profile)
    private readonly profileRepository: Repository<Profile>,
    @InjectRepository(Attendance)
    private readonly attendanceRepository: Repository<Attendance>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
  ) {}

  async getAllStudents(
  id?: number,
  firstName?: string,
  lastName?: string,
): Promise<any[]> {
  let studentsQuery = this.studentRepository
    .createQueryBuilder('student');

  // 🔹 ID bo‘yicha filtr
  if (id) {
    studentsQuery = studentsQuery.andWhere('student.id = :id', { id });
  }

  // 🔹 Ism bo‘yicha filtr
  if (firstName) {
    studentsQuery = studentsQuery.andWhere('student.firstName ILIKE :firstName', { firstName: `%${firstName}%` });
  }

  // 🔹 Familiya bo‘yicha filtr
  if (lastName) {
    studentsQuery = studentsQuery.andWhere('student.lastName ILIKE :lastName', { lastName: `%${lastName}%` });
  }

  const students = await studentsQuery
    .orderBy('student.id', 'ASC')
    .getMany();

  // 🔹 Formatlangan ro‘yxat
  return students.map(student => ({
    id: student.id,
    fullName: `${student.firstName} ${student.lastName}`,
    phone: student.phone || 'N/A',
  }));
}


  async getActiveStudents(name: string, groupId: number): Promise<Student[]> {
    const query: any = { groups: { status: 'active' } };
    if (name) {
      query.firstName = ILike(`%${name}%`);
    }
    if (groupId) {
      query.groups = { id: groupId, status: 'active' };
    }
    const students = await this.studentRepository.find({
      where: query,
      relations: ['groups', 'groups.course', 'profile', 'payments'],
    });
    if (students.length === 0) {
      throw new NotFoundException('No active students found');
    }
    return students;
  }

  async getGraduatedStudents(name: string, groupId: number): Promise<Student[]> {
    const query: any = { groups: { status: 'completed' } };
    if (name) {
      query.firstName = ILike(`%${name}%`);
    }
    if (groupId) {
      query.groups = { id: groupId, status: 'completed' };
    }
    const students = await this.studentRepository.find({
      where: query,
      relations: ['groups', 'groups.course', 'profile', 'payments'],
    });
    if (students.length === 0) {
      throw new NotFoundException('No graduated students found');
    }
    return students;
  }

  async getPaidStudents(name: string, groupId: number): Promise<Student[]> {
    const query: any = { payments: { paid: true } };
    if (name) {
      query.firstName = ILike(`%${name}%`);
    }
    if (groupId) {
      query.groups = { id: groupId };
    }
    const students = await this.studentRepository.find({
      where: query,
      relations: ['groups', 'groups.course', 'profile', 'payments'],
    });
    if (students.length === 0) {
      throw new NotFoundException('No students with paid status found');
    }
    return students;
  }

  async getUnpaidStudents(name: string, groupId: number): Promise<Student[]> {
    const query: any = { payments: { paid: false } };
    if (name) {
      query.firstName = ILike(`%${name}%`);
    }
    if (groupId) {
      query.groups = { id: groupId };
    }
    const students = await this.studentRepository.find({
      where: query,
      relations: ['groups', 'groups.course', 'profile', 'payments'],
    });
    if (students.length === 0) {
      throw new NotFoundException('No students with unpaid status found');
    }
    return students;
  }

  async getStudentById(id: number): Promise<Student> {
    const student = await this.studentRepository.findOne({
      where: { id },
      relations: ['groups', 'groups.course', 'profile', 'payments'],
    });
    if (!student) {
      throw new NotFoundException(`Student with ID ${id} not found`);
    }
    return student;
  }

  async searchStudents(name: string): Promise<Student[]> {
    const students = await this.studentRepository.createQueryBuilder('student')
      .leftJoinAndSelect('student.profile', 'profile')
      .leftJoinAndSelect('student.groups', 'groups')
      .leftJoinAndSelect('groups.course', 'course')
      .leftJoinAndSelect('student.payments', 'payments')
      .where('student.firstName ILIKE :name OR student.lastName ILIKE :name OR profile.parentsName ILIKE :name', { name: `%${name}%` })
      .getMany();

    if (students.length === 0) {
      throw new NotFoundException(`No students found for name "${name}"`);
    }
    return students;
  }

  async createStudent(createStudentDto: CreateStudentDto): Promise<Student> {
    const { phone, username, password, groupId, firstName, lastName, id, courseId } = createStudentDto;

    const existingStudent = await this.studentRepository.findOne({ where: { phone } });
    if (existingStudent) {
      throw new ConflictException(`Student with phone ${phone} already exists`);
    }

    const existingId = await this.studentRepository.findOne({ where: { id } });
    if (existingId) {
      throw new ConflictException(`Student with ID ${id} already exists`);
    }

    if (username) {
      const existingUsername = await this.studentRepository.findOne({ where: { username } });
      if (existingUsername) {
        throw new ConflictException(`Username ${username} already exists`);
      }
    }

    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

    const group = await this.groupRepository.findOne({ 
      where: { id: groupId, status: 'active', course: { id: courseId } }, 
      relations: ['course', 'students'] 
    });
    if (!group) {
      throw new NotFoundException(`Active group with ID ${groupId} and course ID ${courseId} not found`);
    }

    const profile = this.profileRepository.create({
      firstName,
      lastName,
      username,
      password: hashedPassword,
      phone,
    });
    const savedProfile = await this.profileRepository.save(profile);

    const student = this.studentRepository.create({
      id,
      firstName,
      lastName,
      phone,
      username,
      password: hashedPassword,
      groups: [group],
      role: 'student',
      profile: savedProfile,
    });
    const savedStudent = await this.studentRepository.save(student);

    group.students = group.students ? [...group.students, savedStudent] : [savedStudent];
    await this.groupRepository.save(group);

    return this.studentRepository.findOne({ 
      where: { id: savedStudent.id }, 
      relations: ['groups', 'groups.course', 'profile'] 
    });
  }

  async updateStudent(id: number, updateStudentDto: UpdateStudentDto): Promise<Student> {
    const student = await this.getStudentById(id);

    const { groupId, firstName, lastName, phone, username, password, courseId } = updateStudentDto;

    if (groupId) {
  const groupQuery: any = { id: groupId, status: 'active' as 'active' }; // enum sifatida cast
  if (courseId) {
    groupQuery.course = { id: courseId };
  }

  const group = await this.groupRepository.findOne({
    where: groupQuery,
    relations: ['course', 'students'],
  });

  if (!group) {
    throw new NotFoundException(
      `Active group with ID ${groupId}${courseId ? ` and course ID ${courseId}` : ''} not found`,
    );
  }

  if (!student.groups.some((g) => g.id === groupId)) {
    student.groups = [group];
    group.students = group.students ? [...group.students, student] : [student];
    await this.groupRepository.save(group);
  }
}


    if (username) {
      const existingUsername = await this.studentRepository.findOne({ where: { username } });
      if (existingUsername && existingUsername.id !== id) {
        throw new ConflictException(`Username ${username} already exists`);
      }
    }

    if (phone) {
      const existingStudent = await this.studentRepository.findOne({ where: { phone } });
      if (existingStudent && existingStudent.id !== id) {
        throw new ConflictException(`Student with phone ${phone} already exists`);
      }
    }

    if (password) {
      student.password = await bcrypt.hash(password, 10);
    } else if (updateStudentDto.password === null) {
      student.password = null;
    }

    Object.assign(student, {
      firstName: firstName || student.firstName,
      lastName: lastName || student.lastName,
      phone: phone || student.phone,
      username: username !== undefined ? username : student.username,
    });

    const updatedStudent = await this.studentRepository.save(student);

    if (firstName || lastName || phone || username !== undefined || password !== undefined) {
      const profile = await this.profileRepository.findOne({ where: { student: { id } } });
      if (profile) {
        Object.assign(profile, {
          firstName: firstName || profile.firstName,
          lastName: lastName || profile.lastName,
          phone: phone || profile.phone,
          username: username !== undefined ? username : profile.username,
          password: password ? await bcrypt.hash(password, 10) : (updateStudentDto.password === null ? null : profile.password),
        });
        await this.profileRepository.save(profile);
      }
    }

    return updatedStudent;
  }

  async deleteStudent(id: number): Promise<void> {
    const student = await this.getStudentById(id);

    for (const group of student.groups) {
      const groupWithStudents = await this.groupRepository.findOne({
        where: { id: group.id, status: 'active' },
        relations: ['students'],
      });

      if (groupWithStudents) {
        groupWithStudents.students = groupWithStudents.students.filter(s => s.id !== id);
        await this.groupRepository.save(groupWithStudents);
      }
    }

    await this.studentRepository.remove(student);
  }

  async getAttendanceRanking(): Promise<any[]> {
    const students = await this.studentRepository.find({
      relations: ['attendances', 'attendances.lesson', 'groups'],
    });

    return students
      .map(student => {
        const presentCount = student.attendances.filter(att => att.status === 'present').length;
        const totalCount = student.attendances.length;
        return {
          student,
          presentCount,
          totalCount,
          attendanceRate: totalCount > 0 ? (presentCount / totalCount) * 100 : 0,
        };
      })
      .sort((a, b) => b.presentCount - a.presentCount);
  }

  async getStudentProfile(id: number): Promise<any> {
    const student = await this.studentRepository.findOne({
      where: { id },
      relations: ['groups', 'groups.course', 'groups.teacher'],
    });
    if (!student) {
      throw new NotFoundException(`Student with ID ${id} not found`);
    }

    const dayTranslations: { [key: string]: string } = {
      Monday: 'Dushanba',
      Tuesday: 'Seshanba',
      Wednesday: 'Chorshanba',
      Thursday: 'Payshanba',
      Friday: 'Juma',
      Saturday: 'Shanba',
      Sunday: 'Yakshanba',
    };

    const groups = await Promise.all(
      student.groups.map(async (group) => {
        const firstLesson = await this.lessonRepository.findOne({
          where: { group: { id: group.id } },
          order: { lessonDate: 'ASC' },
        });

        const payments = await this.paymentRepository.find({
          where: { student: { id }, group: { id: group.id }, paid: true },
          order: { createdAt: 'ASC' },
        });

        const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);

        let nextPaymentDate = null;
        const currentDate = new Date();
        if (firstLesson) {
          const daysSinceFirstLesson = Math.floor(
            (currentDate.getTime() - firstLesson.lessonDate.getTime()) / (1000 * 60 * 60 * 24),
          );
          const cycleNumber = Math.floor(daysSinceFirstLesson / 30);
          const paymentDueDate = new Date(firstLesson.lessonDate);
          paymentDueDate.setDate(paymentDueDate.getDate() + (cycleNumber + 1) * 30);
          nextPaymentDate = paymentDueDate.toLocaleDateString('uz-UZ', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          });
        }

        const paymentHistory = payments.map((payment, index) => ({
          date: payment.createdAt.toLocaleDateString('uz-UZ', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          }),
          amount: `${payment.amount.toLocaleString('uz-UZ')} so'm`,
          status: 'To‘langan',
          note: `${index + 1}-oy`,
        }));

        const hasSchedule = group.daysOfWeek?.length && group.startTime && group.endTime;

        return {
          course: group.course?.name || 'N/A',
          group: group.name,
          teacher: group.teacher ? `${group.teacher.firstName} ${group.teacher.lastName}` : 'N/A',
          startDate: firstLesson
            ? firstLesson.lessonDate.toLocaleDateString('uz-UZ', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })
            : 'N/A',
          schedule: hasSchedule
            ? `${group.daysOfWeek.map(day => dayTranslations[day]).join(', ')} - ${group.startTime}-${group.endTime}`
            : '',
          totalPaid: `${totalPaid.toLocaleString('uz-UZ')} so'm`,
          nextPaymentDate: nextPaymentDate || 'N/A',
          payments: paymentHistory,
        };
      }),
    );

    return {
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      phone: student.phone,
      education: groups.length > 0 ? groups : [],
    };
  }
}
