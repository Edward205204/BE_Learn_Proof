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
