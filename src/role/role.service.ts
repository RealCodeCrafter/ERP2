import { Injectable, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './entities/role.entity';
import { CreateRoleDto } from './dto/crate-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
  ) {}

  async create(createRoleDto: CreateRoleDto, currentUser: any): Promise<Role> {
    if (createRoleDto.name === 'superAdmin' && currentUser.role !== 'superAdmin') {
      throw new ForbiddenException('Only superAdmin can create new superAdmin role');
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

  async findOne(id: number): Promise<Role> {
    const role = await this.roleRepository.findOne({ where: { id } });
    if (!role) {
      throw new NotFoundException(`Role with id ${id} does not exist`);
    }
    return role;
  }

  async update(id: number, updateRoleDto: UpdateRoleDto, currentUser: any): Promise<Role> {
    const role = await this.findOne(id);

    if (role.name === 'superAdmin' && currentUser.role !== 'superAdmin') {
      throw new ForbiddenException('Only superAdmin can update superAdmin role');
    }

    Object.assign(role, updateRoleDto);
    return this.roleRepository.save(role);
  }

  async remove(id: number): Promise<{ message: string }> {
    const role = await this.findOne(id);

    if (role.name === 'superAdmin') {
      throw new ForbiddenException('Cannot delete superAdmin role');
    }

    await this.roleRepository.remove(role);
    return { message: `Role with id ${id} has been successfully deleted` };
  }
}
