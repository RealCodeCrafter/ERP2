import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn } from 'typeorm';
import { Group } from '../../groups/entities/group.entity';
import { Payment } from '../../budget/entities/payment.entity';
import { Application } from 'src/application/entities/application.entity';

@Entity('courses')
export class Course {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string | null;

  @OneToMany(() => Group, (group) => group.course, { cascade: true })
  groups: Group[];

  @OneToMany(() => Payment, (payment) => payment.course, { cascade: true })
  payments: Payment[];

   @OneToMany(() => Application, (application) => application.course)
  applications: Application[];

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
