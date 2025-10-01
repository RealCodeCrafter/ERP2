import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('archived_users')
export class ArchivedUser {
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

  @Column({ type: 'int' })
  roleId: number;
}