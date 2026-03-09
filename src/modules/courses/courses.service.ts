import { Injectable } from '@nestjs/common'
import { GetCoursesQueryType, GetSearchSuggestionsQueryType } from './courses.model'
import { CourseRepo } from './courses.repo'
import { CourseNotFoundException } from './error.model'

@Injectable()
export class CourseService {
  constructor(private readonly repo: CourseRepo) {}

  getCourses(query: GetCoursesQueryType) {
    return this.repo.getCoursesCatalog(query)
  }

  async getCourseDetail(slug: string) {
    const course = await this.repo.getCourseDetail(slug)
    if (!course) throw new CourseNotFoundException()
    return course
  }

  getHomeSections() {
    return this.repo.getHomeSections()
  }

  getCategories() {
    return this.repo.getCategories()
  }

  getSearchSuggestions(query: GetSearchSuggestionsQueryType) {
    return this.repo.getSearchSuggestions(query.q)
  }

  getAllSlugs() {
    return this.repo.getAllSlugs()
  }
}
