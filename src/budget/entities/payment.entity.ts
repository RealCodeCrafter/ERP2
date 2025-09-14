import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Group } from '../../groups/entities/group.entity';
import { Course } from '../../courses/entities/course.entity';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  amount: number;

  @ManyToOne(() => User, (user) => user.payments, { onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => Group, (group) => group.payments, { onDelete: 'CASCADE' })
  group: Group;

  @ManyToOne(() => Course, (course) => course.payments, { onDelete: 'CASCADE' })
  course: Course;

  @Column({ type: 'boolean', default: false })
  paid: boolean;

  @Column({ type: 'varchar', length: 7, nullable: true })
  monthFor: string;

  @Column({ type: 'enum', enum: ['click', 'naxt', 'percheslinei'], nullable: false })
  paymentType: 'click' | 'naxt' | 'percheslinei';

  @CreateDateColumn()
  createdAt: Date;
}
