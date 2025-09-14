import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Application } from './entities/application.entity';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application';
import { User } from '../user/entities/user.entity';
import { Group } from '../groups/entities/group.entity';
import { Role } from 'src/role/entities/role.entity';
import { Course } from 'src/courses/entities/course.entity';

@Injectable()
export class ApplicationService {
  constructor(
    @InjectRepository(Application)
    private applicationRepository: Repository<Application>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Group)
    private groupRepository: Repository<Group>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
  ) {}

async create(createApplicationDto: CreateApplicationDto): Promise<Application> {
  const { firstName, lastName, phone, groupId, courseId } = createApplicationDto;

  const application = this.applicationRepository.create({ firstName, lastName, phone });

  let user: User = null;

  if (groupId || courseId) {
    let group = null;
    let course = null;

    if (groupId) {
      group = await this.groupRepository.findOne({ where: { id: groupId, status: 'active' } });
      if (!group) throw new NotFoundException(`Group with ID ${groupId} not found`);
    }

    if (courseId) {
      course = await this.courseRepository.findOne({ where: { id: courseId } });
      if (!course) throw new NotFoundException(`Course with ID ${courseId} not found`);
    }

    const role = await this.roleRepository.findOne({ where: { name: 'student' } });
    if (!role) throw new NotFoundException(`Role 'student' not found`);

    user = await this.userRepository.findOne({ where: { phone } });

    if (!user) {
      user = this.userRepository.create({
        firstName,
        lastName,
        phone,
        role,
        groups: group ? [group] : [],
        course: course || null,
      });
      await this.userRepository.save(user);
    } else {
      if (!user.groups) user.groups = [];
      if (group && !user.groups.some(g => g.id === group.id)) {
        user.groups.push(group);
      }
      if (course) user.course = course;
      await this.userRepository.save(user);
    }

    application.user = user;
    application.group = group || null;
    application.status = true;
  } else {
    application.status = false;
  }

  return this.applicationRepository.save(application);
}


  async findAll(firstName?: string, lastName?: string, phone?: string): Promise<any> {
    const query: any = {};
    if (firstName) {
      query.firstName = ILike(`%${firstName}%`);
    }
    if (lastName) {
      query.lastName = ILike(`%${lastName}%`);
    }
    if (phone) {
      query.phone = ILike(`%${phone}%`);
    }

    const applications = await this.applicationRepository.find({
      where: query,
      relations: ['user', 'group'],
      order: { createdAt: 'DESC' },
    });

    const totalApplications = applications.length;
    const newApplications = applications.filter(app => !app.status).length;
    const inContact = applications.filter(app => app.status).length;

    return {
      statistics: {
        totalApplications,
        newApplications,
        inContact,
      },
      applications: applications.map(app => ({
        id: app.id,
        firstName: app.firstName,
        lastName: app.lastName,
        phone: app.phone,
        createdAt: app.createdAt,
        status: app.status,
        group: app.group ? app.group.name : null,
      })),
    };
  }

  async findOne(id: number): Promise<Application> {
    const application = await this.applicationRepository.findOne({
      where: { id },
      relations: ['user', 'group'],
    });
    if (!application) {
      throw new NotFoundException(`Application with ID ${id} not found`);
    }
    return application;
  }

  async update(id: number, updateApplicationDto: UpdateApplicationDto): Promise<Application> {
    const application = await this.findOne(id);
    Object.assign(application, updateApplicationDto);
    return this.applicationRepository.save(application);
  }

  async remove(id: number): Promise<{ message: string }> {
    const application = await this.findOne(id);
    await this.applicationRepository.remove(application);
    return { message: `Application with id ${id} has been successfully deleted` };
  }

  async assignGroup(id: number, groupId: number): Promise<Application> {
  const application = await this.findOne(id);

  const group = await this.groupRepository.findOne({ 
    where: { id: groupId, status: 'active' }, 
    relations: ['course']
  });

  if (!group) {
    throw new NotFoundException(`Active group with ID ${groupId} not found`);
  }

  const role = await this.roleRepository.findOne({ where: { name: 'student' } });
  if (!role) {
    throw new NotFoundException(`Role 'student' not found`);
  }

  const user = this.userRepository.create({
    firstName: application.firstName,
    lastName: application.lastName,
    phone: application.phone,
    role: role,
    groups: [group],   
  });

  await this.userRepository.save(user);

  application.user = user;
  application.group = group;
  application.status = true;

  return this.applicationRepository.save(application);
}

  async removeGroup(id: number): Promise<Application> {
    const application = await this.findOne(id);
    application.group = null;
    return this.applicationRepository.save(application);
  }
}