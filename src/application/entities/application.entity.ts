import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Group } from '../../groups/entities/group.entity';
import { Course } from 'src/courses/entities/course.entity';

@Entity('applications')
export class Application {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50 })
  firstName: string;

  @Column({ type: 'varchar', length: 50 })
  lastName: string;

  @Column({ type: 'varchar', length: 15 })
  phone: string;

  @Column({ type: 'boolean', default: false })
  status: boolean;

  @Column({ type: 'boolean', default: false })
  isContacted: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User, (user) => user.applications, { nullable: true, onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => Group, (group) => group.applications, { nullable: true, onDelete: 'CASCADE' })
  group: Group;

  @ManyToOne(() => Course, (course) => course.applications, { nullable: true, onDelete: 'CASCADE' })
  course: Course;
}