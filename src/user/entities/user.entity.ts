import { Entity, PrimaryGeneratedColumn, Column, ManyToMany, OneToMany, ManyToOne } from 'typeorm';
import { Group } from '../../groups/entities/group.entity';
import { Course } from '../../courses/entities/course.entity';
import { Attendance } from '../../attendance/entities/attendance.entity';
import { Payment } from '../../budget/entities/payment.entity';
import { Role } from '../../role/entities/role.entity';
import { Application } from '../../application/entities/application.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50 })
  firstName: string;

  @Column({ type: 'varchar', length: 50 })
  lastName: string;

  @Column({ type: 'varchar', length: 100, unique: true, nullable: true })
  username: string;

  @Column({ type: 'varchar', length: 255, select: false, nullable: true })
  password: string;

  @Column({ type: 'varchar', length: 15, unique: true })
  phone: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  address: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  specialty: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  salary: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  percent: number;

  @ManyToOne(() => Role, { onDelete: 'SET NULL', nullable: true })
  role: Role;

  @ManyToOne(() => Course, { onDelete: 'SET NULL', nullable: true })
  course: Course;

  @ManyToMany(() => Group, (group) => group.users)
  groups: Group[];

  @OneToMany(() => Attendance, (attendance) => attendance.user, { cascade: true })
  attendances: Attendance[];

  @OneToMany(() => Payment, (payment) => payment.user, { cascade: true })
  payments: Payment[];

  @OneToMany(() => Group, (group) => group.user)
  groupsAsTeacher: Group[];

  @OneToMany(() => Application, (application) => application.user, { cascade: true })
  applications: Application[];
}