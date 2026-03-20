import { BadRequestException, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import { Role } from 'src/generated/prisma/enums'
import { InteractionRepo } from './interaction.repo'

@Injectable()
export class InteractionService {
  constructor(private readonly repo: InteractionRepo) { }

  async getLessonComments(courseId: string, lessonId: string, page = 1, limit = 10) {
    const lesson = await this.repo.findLessonInCourse(courseId, lessonId)
    if (!lesson) {
      throw new NotFoundException('Lesson khong thuoc course')
    }

    const data = await this.repo.findLessonComments(courseId, lessonId, page, limit)

    return {
      data,
      page,
      limit,
    }
  }

  async getAllComments(page = 1, limit = 10) {
    const data = await this.repo.findAllComments(page, limit)

    return {
      data,
      page,
      limit,
    }
  }

  async changePin(id: string, isPinnedFromFE: boolean) {
    const comment = await this.repo.findCommentById(id)

    if (!comment) {
      throw new NotFoundException('Comment khong ton tai')
    }

    // check trạng thái FE gửi lên có đúng với DB không
    if (comment.isPinned !== isPinnedFromFE) {
      throw new BadRequestException('Trang thai pin khong hop le (stale data)')
    }

    // toggle
    return this.repo.updateComment(id, {
      isPinned: !comment.isPinned,
    })
  }
  async createComment(courseId: string, lessonId: string, content: string, userId: string, role: Role) {
    const lesson = await this.repo.findLessonInCourse(courseId, lessonId)

    if (!lesson) {
      throw new NotFoundException('Lesson khong thuoc course')
    }

    if (role === Role.LEARNER) {
      const enrollment = await this.repo.checkUserEnrollment(userId, courseId)
      if (!enrollment) {
        throw new BadRequestException('Ban phai mua khoa hoc de binh luan')
      }
    } else if (role === Role.CONTENT_MANAGER) {
      const creatorId = await this.repo.findCourseCreatorId(courseId)
      if (!creatorId || creatorId !== userId) {
        throw new ForbiddenException('Ban khong co quyen binh luan tren khoa hoc nay')
      }
    }

    return this.repo.createComment({
      courseId,
      lessonId,
      content,
      userId,
    })
  }
  async updateCommentContent(id: string, content: string, userId: string) {
    const comment = await this.repo.findCommentById(id)

    if (!comment) {
      throw new NotFoundException('Comment khong ton tai')
    }

    if (comment.userId !== userId) {
      throw new ForbiddenException('Ban khong co quyen chinh sua binh luan nay')
    }

    return this.repo.updateComment(id, {
      content,
    })
  }
  async deleteComment(id: string, userId: string) {
    const comment = await this.repo.findCommentById(id)

    if (!comment) {
      throw new NotFoundException('Comment khong ton tai')
    }

    if (comment.userId !== userId) {
      throw new ForbiddenException('Ban khong co quyen xoa binh luan nay')
    }

    return this.repo.updateComment(id, {
      isDeleted: true,
    })
  }
  async createReply(discussionId: string, content: string, userId: string, role: Role) {
    const discussion = await this.repo.findCommentById(discussionId)

    if (!discussion) {
      throw new NotFoundException('Comment khong ton tai')
    }

    if (role === Role.LEARNER) {
      const enrollment = await this.repo.checkUserEnrollment(userId, discussion.courseId)
      if (!enrollment) {
        throw new BadRequestException('Ban phai mua khoa hoc de tra loi binh luan')
      }
    } else if (role === Role.CONTENT_MANAGER) {
      if (!discussion.course || discussion.course.creatorId !== userId) {
        throw new ForbiddenException('Ban khong co quyen tra loi binh luan tren khoa hoc nay')
      }
    }

    return this.repo.createReply({
      discussionId,
      content,
      userId,
    })
  }
  async updateReply(id: string, content: string, userId: string) {
    const reply = await this.repo.findReplyById(id)

    if (!reply) {
      throw new NotFoundException('Reply khong ton tai')
    }

    if (reply.userId !== userId) {
      throw new ForbiddenException('Ban khong co quyen chinh sua phan hoi nay')
    }

    return this.repo.updateReply(id, {
      content,
    })
  }
  async deleteReply(id: string, userId: string) {
    const reply = await this.repo.findReplyById(id)

    if (!reply) {
      throw new NotFoundException('Reply khong ton tai')
    }

    if (reply.userId !== userId) {
      throw new ForbiddenException('Ban khong co quyen xoa phan hoi nay')
    }

    return this.repo.updateReply(id, {
      isDeleted: true,
    })
  }
}
