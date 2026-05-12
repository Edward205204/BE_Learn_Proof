import { PrismaClient } from '../generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import axios from 'axios'
import jwt from 'jsonwebtoken'
import { config } from 'dotenv'
config()

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const API_URL = 'http://localhost:3000'
const SECRET = 'Acc@Secret123'

async function run() {
  try {
    const lesson = await prisma.lesson.findFirst({
      include: { chapter: { include: { course: true } } },
    })
    if (!lesson) throw new Error('No lesson found')

    const courseId = lesson.chapter.course.id
    const userId = lesson.chapter.course.creatorId

    console.log(`Testing with Lesson ID: ${lesson.id}, User ID: ${userId}, Course ID: ${courseId}`)

    // Clean up old drafts and jobs for this lesson
    await prisma.quizDraft.deleteMany({ where: { lessonId: lesson.id } })
    await prisma.aiJob.deleteMany({ where: { lessonId: lesson.id } })
    console.log('Cleaned up old AI jobs and drafts')

    // Need to enroll the user to test askLesson
    let enroll = await prisma.enrollment.findFirst({ where: { userId, courseId } })
    if (!enroll) {
      enroll = await prisma.enrollment.create({
        data: {
          userId,
          courseId,
        },
      })
      console.log('Created enrollment')
    }

    // Create Token
    const token = jwt.sign({ userId, role: 'USER' }, SECRET, { expiresIn: '1h' })
    const headers = { Authorization: `Bearer ${token}` }

    console.log('\n--- TEST 1: AI Q&A (RAG Ask) ---')
    try {
      const res = await axios.post(
        `${API_URL}/lesson/${lesson.id}/ask`,
        {
          question: 'What is this lesson about?',
        },
        { headers },
      )
      console.log('QA Result:', res.data)
    } catch (e: any) {
      console.error('QA Error:', e.response?.data || e.message)
    }

    console.log('\n--- TEST 2: AI Gen Quiz ---')
    try {
      const res1 = await axios.post(`${API_URL}/quiz/lessons/${lesson.id}/generate-ai`, {}, { headers })
      console.log('Quiz Gen Started:', res1.data)

      console.log('Waiting for job to complete...')
      await new Promise((r) => setTimeout(r, 5000))

      const res2 = await axios.get(`${API_URL}/quiz/lessons/${lesson.id}/drafts`, { headers })
      console.dir(res2.data, { depth: null })
    } catch (e: any) {
      console.error('Quiz Gen Error:', e.response?.data || e.message)
    }
  } finally {
    await prisma.$disconnect()
  }
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
run()
