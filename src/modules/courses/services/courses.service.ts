import { Injectable } from '@nestjs/common'
import { GetCoursesQueryType, GetSearchSuggestionsQueryType } from '../courses.model'
import { CourseRepo } from '../courses.repo'
import { CourseNotFoundException } from '../error.model'

@Injectable()
export class CourseService {
  constructor(private readonly repo: CourseRepo) {}

  getCourses(query: GetCoursesQueryType) {
    return this.repo.getCoursesCatalog(query)
  }

  checkCourseExists(id: string) {
    return this.repo.checkCourseExists(id)
  }

  getCourseById(id: string) {
    return this.repo.getCourseById(id)
  }

  getCourseByIdOrSlug(idOrSlug: string) {
    return this.repo.getCourseByIdOrSlug(idOrSlug)
  }

  getChapterById(id: string) {
    return this.repo.getChapterById(id)
  }

  findChapterUnique(payload: { id: string; creatorId: string }) {
    return this.repo.findChapterUnique(payload)
  }

  getEnrollment(userId: string, courseId: string) {
    return this.repo.getEnrollment(userId, courseId)
  }

  async getCourseDetail(slug: string) {
    const course = await this.repo.getCourseDetail(slug)
    if (!course) throw new CourseNotFoundException()
    return course
  }

  async getHomeSections() {
    const data = await this.repo.getHomeSections()
    console.log(data)
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
}
