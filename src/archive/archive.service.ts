import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, In } from 'typeorm';
import { ArchivedUser } from './entities/archive.entity';
import { User } from '../user/entities/user.entity';
import { Role } from '../role/entities/role.entity';

@Injectable()
export class ArchiveService {
  constructor(
    @InjectRepository(ArchivedUser)
    private archivedUserRepository: Repository<ArchivedUser>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
  ) {}

  async create(archivedUser: Partial<ArchivedUser>, adminId: number): Promise<ArchivedUser> {
    const adminRoles = await this.roleRepository.find({
      where: { name: In(['admin', 'superAdmin']) },
    });
    if (!adminRoles.length) throw new NotFoundException('Admin roles not found');

    const admin = await this.userRepository.findOne({
      where: { id: adminId, role: { id: In(adminRoles.map(r => r.id)) } },
    });
    if (!admin) throw new ForbiddenException('Only admins or superAdmins can create archived users');

    const entity = this.archivedUserRepository.create(archivedUser);
    return this.archivedUserRepository.save(entity);
  }

  async findAll(filters: { firstName?: string; lastName?: string; phone?: string; roleId?: number }): Promise<ArchivedUser[]> {
    const query: any = {};
    if (filters.firstName) query.firstName = ILike(`%${filters.firstName}%`);
    if (filters.lastName) query.lastName = ILike(`%${filters.lastName}%`);
    if (filters.phone) query.phone = ILike(`%${filters.phone}%`);
    if (filters.roleId) query.roleId = filters.roleId;

    return this.archivedUserRepository.find({ where: query });
  }

  async findOne(id: number): Promise<ArchivedUser> {
    const archivedUser = await this.archivedUserRepository.findOne({
      where: { id },
    });
    if (!archivedUser) {
      throw new NotFoundException(`Archived user with ID ${id} not found`);
    }
    return archivedUser;
  }

  async restore(id: number, adminId: number): Promise<User> {
    const adminRoles = await this.roleRepository.find({
      where: { name: In(['admin', 'superAdmin']) },
    });
    if (!adminRoles.length) throw new NotFoundException('Admin roles not found');

    const admin = await this.userRepository.findOne({
      where: { id: adminId, role: { id: In(adminRoles.map(r => r.id)) } },
    });
    if (!admin) throw new ForbiddenException('Only admins or superAdmins can restore archived users');

    const archivedUser = await this.findOne(id);
    const role = await this.roleRepository.findOne({ where: { id: archivedUser.roleId } });
    if (!role) {
      throw new NotFoundException(`Role with ID ${archivedUser.roleId} not found`);
    }

    const user = this.userRepository.create({
      firstName: archivedUser.firstName,
      lastName: archivedUser.lastName,
      username: archivedUser.username,
      password: archivedUser.password,
      phone: archivedUser.phone,
      address: archivedUser.address,
      specialty: archivedUser.specialty,
      salary: archivedUser.salary,
      percent: archivedUser.percent,
      role,
    });

    const restoredUser = await this.userRepository.save(user);
    await this.archivedUserRepository.remove(archivedUser);

    return restoredUser;
  }

  async remove(id: number, adminId: number): Promise<void> {
    const adminRoles = await this.roleRepository.find({
      where: { name: In(['admin', 'superAdmin']) },
    });
    if (!adminRoles.length) throw new NotFoundException('Admin roles not found');

    const admin = await this.userRepository.findOne({
      where: { id: adminId, role: { id: In(adminRoles.map(r => r.id)) } },
    });
    if (!admin) throw new ForbiddenException('Only admins or superAdmins can delete archived users');

    const archivedUser = await this.findOne(id);
    await this.archivedUserRepository.remove(archivedUser);
  }
}