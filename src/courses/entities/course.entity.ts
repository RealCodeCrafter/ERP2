import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Group } from '../../groups/entities/group.entity';
import { Payment } from '../../budget/entities/payment.entity';

@Entity('courses')
export class Course {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 500 })
  description: string;

  @OneToMany(() => Group, (group) => group.course)
  groups: Group[];

  @OneToMany(() => Payment, (payment) => payment.course)
  payments: Payment[];
}