import { Injectable } from '@nestjs/common'
import { PrismaService } from './prisma.service'
import slugify from 'slugify'

@Injectable()
export class SlugService {
  constructor(private readonly prisma: PrismaService) {}

  async generateUniqueSlug(text: string): Promise<string> {
    const base = slugify(text, { lower: true, strict: true, locale: 'vi' })

    const existingSlugs = await this.prisma.course.findMany({
      where: {
        slug: {
          startsWith: base,
        },
      },
      select: { slug: true },
    })

    if (existingSlugs.length === 0) return base

    const slugSet = new Set(existingSlugs.map((s) => s.slug))

    if (!slugSet.has(base)) return base

    let attempt = 1
    while (slugSet.has(`${base}-${attempt}`)) {
      attempt++
    }

    return `${base}-${attempt}`
  }
}
