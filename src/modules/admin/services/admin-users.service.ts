import { Injectable, NotFoundException } from '@nestjs/common'
import { AdminUsersRepo } from '../repos/admin-users.repo'
import { AuthService } from '../../auth/auth.service'
import { GetUsersQueryType, UpdateUserRoleBodyType } from '../admin.model'
import { TransactionHost } from '@nestjs-cls/transactional'
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma'
import { PrismaClient } from 'src/generated/prisma/client'

@Injectable()
export class AdminUsersService {
  constructor(
    private readonly adminUsersRepo: AdminUsersRepo,
    private readonly authService: AuthService,
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma<PrismaClient>>,
  ) {}

  async getUsers(query: GetUsersQueryType) {
    return this.adminUsersRepo.getUsersPaging(query)
  }

  async getUserDetail(id: string) {
    const user = await this.adminUsersRepo.getUserDetail(id)
    if (!user) throw new NotFoundException('User not found')
    return user
  }

  private async logAction(adminId: string, action: string, entity: string, entityId: string, details: any) {
    // // @Change thay đổi cho admin modules.Rules: Mọi thao tác từ Admin phải được ghi vết
    await this.txHost.tx.auditLog.create({
      data: {
        adminId,
        action,
        entity,
        entityId,
        details,
      },
    })
  }

  async updateUserRole(id: string, body: UpdateUserRoleBodyType, adminId: string) {
    // Check user exist
    const user = await this.getUserDetail(id)

    // Gọi AuthService để thực hiện việc ghi DB (module Auth own user role)
    const result = await this.authService.updateUserRole(id, body.role)

    // Ghi log
    await this.logAction(adminId, 'UPDATE_ROLE', 'USER', id, { from: user.role, to: body.role })

    return result
  }
}
