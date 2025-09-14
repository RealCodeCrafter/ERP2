import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Lesson } from '../../lesson/entities/lesson.entity';

@Entity('attendance')
export class Attendance {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.attendances, { onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => Lesson, (lesson) => lesson.attendances, { onDelete: 'CASCADE' })
  lesson: Lesson;

  @Column({ type: 'enum', enum: ['present', 'absent', 'late'], default: 'absent' })
  status: 'present' | 'absent' | 'late';

  @ManyToOne(() => User, (user) => user.attendances, { onDelete: 'SET NULL', nullable: true })
  teacher: User;

  @CreateDateColumn()
  createdAt: Date;
}
