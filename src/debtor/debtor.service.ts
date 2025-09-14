import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Payment } from '../budget/entities/payment.entity';
import { User } from '../user/entities/user.entity';
import { Group } from '../groups/entities/group.entity';

@Injectable()
export class DebtorService {
  constructor(
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Group)
    private groupRepository: Repository<Group>,
  ) {}

  async getDebtors(
  firstName?: string,
  lastName?: string,
  groupId?: number,
): Promise<any> {
  const query: any = { role: { name: 'student' } };

  if (firstName) {
    query.firstName = ILike(`%${firstName}%`);
  }
  if (lastName) {
    query.lastName = ILike(`%${lastName}%`);
  }

  const students = await this.userRepository.find({
    where: query,
    relations: ['groups', 'payments', 'payments.group'],
  });

  let totalDebt = 0;
  let debtorCount = 0;
  const debtors = [];

  for (const user of students) {
    const filteredGroups = user.groups.filter(
      (g) => g.status === 'active' && (!groupId || g.id === groupId),
    );

    for (const group of filteredGroups) {
      const payments = user.payments.filter(
        (p) => p.group && p.group.id === group.id && p.paid,
      );

      const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);

      if (totalPaid < Number(group.price)) {
        const debt = Number(group.price) - totalPaid;
        totalDebt += debt;
        debtorCount++;

        let unpaidMonth: string;

        if (payments.length > 0) {
          const lastPayment = payments.sort((a, b) =>
            a.monthFor.localeCompare(b.monthFor),
          )[payments.length - 1];

          const [year, month] = lastPayment.monthFor.split('-').map(Number);
          const next = new Date(year, month);
          unpaidMonth = `${next.getFullYear()}-${String(
            next.getMonth() + 1,
          ).padStart(2, '0')}`;
        } else {
          const now = new Date();
          unpaidMonth = `${now.getFullYear()}-${String(
            now.getMonth() + 1,
          ).padStart(2, '0')}`;
        }

        debtors.push({
          fullName: `${user.firstName} ${user.lastName}`,
          group: group.name,
          debt,
          unpaidMonth,
        });
      }
    }
  }

  return {
    totalDebt: totalDebt || 0,
    debtorCount: debtorCount || 0,
    debtors,
  };
}


}