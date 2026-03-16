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

    console.log('LOGIN START:', { username });

    const user = await this.findUserWithPassword(username);
    console.log('LOGIN USER FOUND:', !!user);
    if (!user) {
      console.log('LOGIN ERROR: user not found');
      throw new UnauthorizedException('Foydalanuvchi topilmadi');
    }

    if (!user.password) {
      console.log('LOGIN ERROR: no password for user');
      throw new UnauthorizedException('Ushbu foydalanuvchi uchun parol o‘rnatilmagan');
    }

    const isValid = await bcrypt.compare(password, user.password);
    console.log('LOGIN PASSWORD VALID:', isValid);
    if (!isValid) {
      console.log('LOGIN ERROR: wrong password');
      throw new UnauthorizedException('Parol noto‘g‘ri');
    }

    const payload = {
      id: user.id,
      username: user.username,
      role: user.role.name,
    };

    const accessToken = this.jwtService.sign(payload);
    console.log('LOGIN SUCCESS, TOKEN CREATED');

    const { password: _, ...safeUser } = user;
    return { accessToken, user: { ...safeUser, role: user.role.name } };
  }

  async logout(userId: number): Promise<{ message: string }> {
    return { message: `User ${userId} logged out successfully` };
  }
}