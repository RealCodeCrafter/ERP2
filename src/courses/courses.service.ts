import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Course } from './entities/course.entity';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { Group } from '../groups/entities/group.entity';
import { User } from '../user/entities/user.entity';
import { Payment } from '../budget/entities/payment.entity';

@Injectable()
export class CourseService {
  constructor(
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
  ) {}

   async create(createCourseDto: CreateCourseDto): Promise<Course> {
    const existingCourse = await this.courseRepository.findOne({
      where: { name: createCourseDto.name },
    });

    if (existingCourse) {
      throw new BadRequestException(
        `Course with name "${createCourseDto.name}" already exists`,
      );
    }

    const course = this.courseRepository.create({
      ...createCourseDto,
      description: createCourseDto.description || null,
    });

    return this.courseRepository.save(course);
  }

  async findAll(name?: string): Promise<any> {
  const query: any = {};
  if (name) {
    query.name = ILike(`%${name}%`);
  }

  const courses = await this.courseRepository.find({
    where: query,
    relations: ['groups', 'groups.users', 'groups.users.role'],
    order: { id: 'ASC' },
  });

  const totalCourses = await this.courseRepository.count();

  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  let totalStudents = 0;
  let thisMonthGroups = 0;

  const courseData = courses.map(course => {
    const activeGroups = course.groups.filter(g => g.status === 'active');

    activeGroups.forEach(g => {
      totalStudents += g.users?.filter(u => u.role?.name === 'student').length || 0;
    });

    course.groups.forEach(g => {
      if (g.createdAt >= firstDayOfMonth && g.createdAt <= lastDayOfMonth) {
        thisMonthGroups++;
      }
    });

    return {
      id: course.id,
      name: course.name,
      description: course.description,
      totalGroups: activeGroups.length,
      totalStudents: activeGroups.reduce(
        (acc, g) => acc + (g.users?.filter(u => u.role?.name === 'student').length || 0),
        0
      ),
    };
  });

  return {
    stats: {
      totalCourses,
      totalStudents,
      thisMonthGroups,
    },
    data: courseData,
  };
}



  async findOne(id: number): Promise<Course> {
    const course = await this.courseRepository.findOne({
      where: { id },
      relations: ['groups', 'groups.users', 'payments'],
    });
    if (!course) {
      throw new NotFoundException(`Course with ID ${id} not found`);
    }
    return course;
  }

  async update(id: number, updateCourseDto: UpdateCourseDto): Promise<Course> {
    const course = await this.findOne(id);
    Object.assign(course, updateCourseDto);
    return this.courseRepository.save(course);
  }

  async remove(id: number): Promise<void> {
    const course = await this.findOne(id);
    await this.courseRepository.remove(course);
  }
}