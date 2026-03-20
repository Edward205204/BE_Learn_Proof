import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InteractionRepo } from './interaction.repo'

@Injectable()
export class InteractionService {
  constructor(private readonly repo: InteractionRepo) {}

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
  async createComment(courseId: string, lessonId: string, content: string) {
    const lesson = await this.repo.findLessonInCourse(courseId, lessonId)

    if (!lesson) {
      throw new NotFoundException('Lesson khong thuoc course')
    }

    return this.repo.createComment({
      courseId,
      lessonId,
      content,
      // TODO: sau này add userId từ auth
      userId: 'temp-user-id',
    })
  }
  async updateCommentContent(id: string, content: string) {
    const comment = await this.repo.findCommentById(id)

    if (!comment) {
      throw new NotFoundException('Comment khong ton tai')
    }

    return this.repo.updateComment(id, {
      content,
    })
  }
  async deleteComment(id: string) {
    const comment = await this.repo.findCommentById(id)

    if (!comment) {
      throw new NotFoundException('Comment khong ton tai')
    }

    return this.repo.updateComment(id, {
      isDeleted: true,
    })
  }
  async createReply(discussionId: string, content: string) {
    const discussion = await this.repo.findCommentById(discussionId)

    if (!discussion) {
      throw new NotFoundException('Comment khong ton tai')
    }

    return this.repo.createReply({
      discussionId,
      content,
      userId: 'temp-user-id', // sau này lấy từ auth
    })
  }
  async updateReply(id: string, content: string) {
    const reply = await this.repo.findReplyById(id)

    if (!reply) {
      throw new NotFoundException('Reply khong ton tai')
    }

    return this.repo.updateReply(id, {
      content,
    })
  }
  async deleteReply(id: string) {
    const reply = await this.repo.findReplyById(id)

    if (!reply) {
      throw new NotFoundException('Reply khong ton tai')
    }

    return this.repo.updateReply(id, {
      isDeleted: true,
    })
  }
}
