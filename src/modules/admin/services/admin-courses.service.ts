import { Injectable, NotFoundException } from '@nestjs/common'
import { AdminCoursesRepo } from '../repos/admin-courses.repo'
import { GetCoursesQueryType, UpdateCourseStatusBodyType } from '../admin.model'
import { TransactionHost } from '@nestjs-cls/transactional'
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma'
import { PrismaClient } from 'src/generated/prisma/client'

@Injectable()
export class AdminCoursesService {
  constructor(
    private readonly adminCoursesRepo: AdminCoursesRepo,
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma<PrismaClient>>,
  ) {}

  async getCourses(query: GetCoursesQueryType) {
    return this.adminCoursesRepo.getCoursesPaging(query)
  }

  async getCourseDetail(id: string) {
    const course = await this.adminCoursesRepo.getCourseDetail(id)
    if (!course) throw new NotFoundException('Course not found')
    return course
  }

  async updateCourseStatus(id: string, body: UpdateCourseStatusBodyType, adminId: string) {
    const course = await this.getCourseDetail(id)

    const updated = await this.txHost.tx.course.update({
      where: { id },
      data: { status: body.status },
    })

    await this.txHost.tx.auditLog.create({
      data: {
        adminId,
        action: 'UPDATE_COURSE_STATUS',
        entity: 'COURSE',
        entityId: id,
        details: { from: course.status, to: body.status },
      },
    })

    return updated
  }
}
