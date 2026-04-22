import { Injectable } from '@nestjs/common'
import { GetCoursesQueryType, GetSearchSuggestionsQueryType } from '../courses.model'
import { CourseRepo } from '../courses.repo'
import { CourseNotFoundException } from '../error.model'

@Injectable()
export class CourseService {
  constructor(private readonly repo: CourseRepo) {}

  getCourses(query: GetCoursesQueryType & { userId?: string }) {
    const { userId, ...rest } = query
    return this.repo.getCoursesCatalog(rest, userId)
  }

  async getCourseDetail(slug: string, userId?: string) {
    const course = await this.repo.getCourseDetail(slug, userId)
    if (!course) throw new CourseNotFoundException()
    return course
  }

  async getHomeSections(userId?: string) {
    const data = await this.repo.getHomeSections(userId)
    return data
  }

  async getCategories() {
    const data = await this.repo.getCategories()
    return data
  }

  getSearchSuggestions(query: GetSearchSuggestionsQueryType) {
    return this.repo.getSearchSuggestions(query.q)
  }

  getAllSlugs() {
    return this.repo.getAllSlugs()
  }

  findCoursePublic(courseId: string) {
    return this.repo.findCoursePublic(courseId)
  }

  getCourseProgress(userId: string, courseId: string) {
    return this.repo.getCourseProgress(userId, courseId)
  }

  getProgressSummary(userId: string, courseId: string) {
    return this.repo.getProgressSummary(userId, courseId)
  }
}
