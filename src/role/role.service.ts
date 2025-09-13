import { Injectable, ConflictException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './entities/role.entity';
import { CreateRoleDto } from './dto/crate-role.dto';

@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
  ) {}


  async create(createRoleDto: CreateRoleDto, currentUser: any): Promise<Role> {
  if (createRoleDto.name === 'superAdmin' && currentUser.role !== 'superAdmin') {
    throw new ForbiddenException('Faqat superAdmin yangi superAdmin rolini yaratishi mumkin');
  }

  const existingRole = await this.roleRepository.findOne({ where: { name: createRoleDto.name } });
  if (existingRole) {
    throw new ConflictException(`Role with name ${createRoleDto.name} already exists`);
  }

  const role = this.roleRepository.create(createRoleDto);
  return this.roleRepository.save(role);
}


  async findAll(): Promise<Role[]> {
    return this.roleRepository.find();
  }
}