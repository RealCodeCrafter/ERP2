import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../user/entities/user.entity';
import { Role } from '../role/entities/role.entity';
import { LoginDto } from './dto/create-auth.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    private readonly jwtService: JwtService,
  ) {}

  // Foydalanuvchini password bilan olib kelish
  private async findUserWithPassword(username: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { username },
      relations: ['role'], // role ham yuklanadi
      select: ['id', 'username', 'password', 'firstName', 'lastName'], // select:false passwordni ochish
    });
  }

  async login(loginDto: LoginDto): Promise<{ accessToken: string; user: any }> {
    const { username, password } = loginDto;

    const user = await this.findUserWithPassword(username);
    if (!user) {
      throw new UnauthorizedException('Foydalanuvchi topilmadi');
    }

    if (!user.password) {
      throw new UnauthorizedException('Ushbu foydalanuvchi uchun parol o‘rnatilmagan');
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new UnauthorizedException('Parol noto‘g‘ri');
    }

    const payload = {
      id: user.id,
      username: user.username,
      role: user.role.name,
    };

    const accessToken = this.jwtService.sign(payload);

    const { password: _, ...safeUser } = user;
    return { accessToken, user: { ...safeUser, role: user.role.name } };
  }

  async logout(userId: number): Promise<{ message: string }> {
    return { message: `User ${userId} logged out successfully` };
  }
}