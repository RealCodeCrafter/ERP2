import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { User } from './user/entities/user.entity';
import { Role } from './role/entities/role.entity';
import { Application } from './application/entities/application.entity';
import { Group } from './groups/entities/group.entity';
import { Course } from './courses/entities/course.entity';
import { Payment } from './budget/entities/payment.entity';
import { Attendance } from './attendance/entities/attendance.entity';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { RoleModule } from './role/role.module';
import { ApplicationModule } from './application/application.module';
import { BudgetModule } from './budget/budget.module';
import { DebtorModule } from './debtor/debtor.module';
import { GroupModule } from './groups/group.module';
import { CourseModule } from './courses/courses.module'
import { PaymentModule } from './payment/payment.module';
import { AttendanceModule } from './attendance/attendance.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: parseInt(configService.get<string>('DB_PORT'), 10),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_NAME'),
        entities: [
          User,
          Role,
          Application,
          Group,
          Course,
          Payment,
          Attendance,
        ],
        synchronize: true,
        autoLoadEntities: true,
        ssl: false,
      }),
    }),
    AuthModule,
    UserModule,
    RoleModule,
    ApplicationModule,
    BudgetModule,
    DebtorModule,
    GroupModule,
    CourseModule,
    PaymentModule,
    AttendanceModule
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}