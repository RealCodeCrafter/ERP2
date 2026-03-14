import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../user/entities/user.entity';
import { Role } from '../role/entities/role.entity';

@Injectable()
export class SuperAdminSeedService implements OnModuleInit {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {}

  async onModuleInit() {
    const username = 'superadmin';
    const plainPassword = '1234'; // siz so'ragan parol

    // superadmin allaqachon bormi?
    const existing = await this.userRepository.findOne({
      where: { username },
      relations: ['role'],
    });

    if (existing) {
      console.log('SuperAdmin allaqachon mavjud, yangidan yaratilmaydi.');
      return;
    }

    // role superadmin bormi?
    let role = await this.roleRepository.findOne({ where: { name: 'superadmin' } });
    if (!role) {
      role = this.roleRepository.create({ name: 'superadmin' });
      role = await this.roleRepository.save(role);
      console.log('Yangi "superadmin" roli yaratildi.');
    }

    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const superAdmin = this.userRepository.create({
      firstName: 'Super',
      lastName: 'Admin',
      username,
      password: hashedPassword,
      phone: 'superadmin', // unique bo‘lishi uchun o‘ziga xos qiymat
      address: 'System',
      role,
    } as Partial<User>);

    await this.userRepository.save(superAdmin);

    console.log('Yangi SuperAdmin foydalanuvchi yaratildi:');
    console.log('Login:', username);
    console.log('Parol:', plainPassword);
  }
}

