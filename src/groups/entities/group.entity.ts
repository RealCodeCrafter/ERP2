import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, ManyToMany, JoinTable, OneToMany, CreateDateColumn } from 'typeorm';
import { Course } from '../../courses/entities/course.entity';
import { User } from '../../user/entities/user.entity';
import { Lesson } from '../../lesson/entities/lesson.entity';
import { Payment } from '../../budget/entities/payment.entity';
import { Attendance } from '../../attendance/entities/attendance.entity';
import { Application } from '../../application/entities/application.entity';

@Entity('groups')
export class Group {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  price: number;

  @Column({ type: 'varchar', length: 5, nullable: true })
  startTime: string;

  @Column({ type: 'varchar', length: 5, nullable: true })
  endTime: string;

  @Column({ type: 'varchar', array: true, nullable: true })
  daysOfWeek: string[];

  @Column({ type: 'enum', enum: ['active', 'completed', 'planned'], default: 'active' })
  status: 'active' | 'completed' | 'planned';

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @ManyToOne(() => Course, (course) => course.groups, { onDelete: 'CASCADE' })
  course: Course;

  @ManyToOne(() => User, (user) => user.groups, { onDelete: 'SET NULL', nullable: true })
  user: User;

  @ManyToMany(() => User, (user) => user.groups, {
  cascade: false, 
  onDelete: 'CASCADE',
})
@JoinTable({
  name: 'users_groups_groups', 
})
users: User[];


  @OneToMany(() => Lesson, (lesson) => lesson.group, { cascade: true })
  lessons: Lesson[];

  @OneToMany(() => Payment, (payment) => payment.group, { cascade: true })
  payments: Payment[];

  @OneToMany(() => Attendance, (attendance) => attendance.lesson.group, { cascade: true })
  attendances: Attendance[];

  @OneToMany(() => Application, (application) => application.group, { cascade: true })
  applications: Application[];
}
