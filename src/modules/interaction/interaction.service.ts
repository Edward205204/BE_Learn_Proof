import { Injectable, NotFoundException } from '@nestjs/common'
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

  async pinComment(id: string) {
    const comment = await this.repo.findCommentById(id)

    if (!comment) {
      throw new NotFoundException('Comment khong ton tai')
    }

    return this.repo.updateComment(id, {
      isPinned: true,
    })
  }

  async unpinComment(id: string) {
    const comment = await this.repo.findCommentById(id)

    if (!comment) {
      throw new NotFoundException('Comment khong ton tai')
    }

    return this.repo.updateComment(id, {
      isPinned: false,
    })
  }
}