import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Group } from '../../groups/entities/group.entity';

@Entity('attendance')
export class Attendance {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.attendances, { onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => Group, (group) => group.attendances, { onDelete: 'CASCADE', nullable: true })
  group: Group;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'enum', enum: ['present', 'absent', 'late', 'absent_with_reason', 'absent_without_reason'], default: 'present' })
  status: 'present' | 'absent' | 'late' | 'absent_with_reason' | 'absent_without_reason';

  @Column({ type: 'int', nullable: true })
  grade: number;

  @ManyToOne(() => User, (user) => user.attendances, { onDelete: 'SET NULL', nullable: true })
  teacher: User;

  @Column({ type: 'boolean', default: false })
  isTeacherAttendance: boolean;

  @CreateDateColumn()
  createdAt: Date;
}