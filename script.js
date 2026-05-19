const fs = require('fs');
const path = 'D:/workspace/_capstone2/Project-LP/be_learn_proof/src/modules/quiz/processors/quiz-gen.processor.ts';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  /const lesson = await this\.txHost\.tx\.lesson\.findUnique\(\{\s+where: \{ id: lessonId \},\s+select: \{\s+id: true,\s+title: true,\s+shortDesc: true,\s+lessonDesc: true,\s+textContent: true,\s+transcript: true,\s+targetLevel: true,\s+\},\s+\}\)/,
  const lesson = await this.txHost.tx.lesson.findUnique({
        where: { id: lessonId },
        select: {
          id: true,
          title: true,
          shortDesc: true,
          lessonDesc: true,
          textContent: true,
          transcript: true,
          targetLevel: true,
          type: true,
          order: true,
          chapterId: true,
          chapter: {
            select: {
              id: true,
              order: true,
              courseId: true,
            },
          },
        },
      })
);

content = content.replace(
  /const existingQuiz = await this\.txHost\.tx\.quiz\.findFirst\(\{\s+where: \{ lessonId \},\s+select: \{\s+questions: \{\s+orderBy: \{ createdAt: 'asc' \},\s+select: \{\s+content: true,\s+\},\s+\},\s+\},\s+\}\)\s+const existingQuestionsList = existingQuiz\?.questions\?.map\(\(question\) => question\.content\) \|\| \[\]\s+const existingQuestions = this\.formatQuestionsForPrompt\(existingQuestionsList\)\s+\/\/ Build context\s+const fullContext = this\.chunkingService\.buildContext\(lesson\)\s+const context = fullContext\.length > 12000 \? fullContext\.slice\(0, 12000\) : fullContext/,
  let existingQuestionsList: string[] = []
      let context = ''
      let questionCountStr = '5'
      let expectedQuestions = 5

      if (lesson.type === 'QUIZ') {
        questionCountStr = '20'
        expectedQuestions = 20

        const lastChapter = await this.txHost.tx.chapter.findFirst({
          where: { courseId: lesson.chapter.courseId },
          orderBy: { order: 'desc' },
        })
        const isLastChapter = lastChapter?.id === lesson.chapter.id

        const lastLessonInChapter = await this.txHost.tx.lesson.findFirst({
          where: { chapterId: lesson.chapter.id },
          orderBy: { order: 'desc' },
        })
        const isLastLesson = lastLessonInChapter?.id === lesson.id

        const scope = isLastChapter && isLastLesson ? 'COURSE' : 'CHAPTER'

        let sourceLessons = []
        if (scope === 'COURSE') {
          sourceLessons = await this.txHost.tx.lesson.findMany({
            where: {
              chapter: { courseId: lesson.chapter.courseId },
              type: { in: ['VIDEO', 'TEXT'] },
            },
            orderBy: [{ chapter: { order: 'asc' } }, { order: 'asc' }],
          })
        } else {
          sourceLessons = await this.txHost.tx.lesson.findMany({
            where: {
              chapterId: lesson.chapter.id,
              order: { lt: lesson.order },
              type: { in: ['VIDEO', 'TEXT'] },
            },
            orderBy: { order: 'asc' },
          })
        }

        const fullContext = sourceLessons
          .map((l) => this.chunkingService.buildContext(l))
          .filter(Boolean)
          .join('\\n\\n---\\n\\n')
        
        context = fullContext.length > 30000 ? fullContext.slice(fullContext.length - 30000) : fullContext

        const sourceLessonIds = sourceLessons.map((l) => l.id)
        sourceLessonIds.push(lessonId)

        const relatedQuizzes = await this.txHost.tx.quiz.findMany({
          where: { lessonId: { in: sourceLessonIds } },
          select: { questions: { select: { content: true } } },
        })

        existingQuestionsList = relatedQuizzes.flatMap((q) => q.questions.map((question) => question.content))
      } else {
        const fullContext = this.chunkingService.buildContext(lesson)
        context = fullContext.length > 12000 ? fullContext.slice(0, 12000) : fullContext

        const existingQuiz = await this.txHost.tx.quiz.findFirst({
          where: { lessonId },
          select: {
            questions: {
              orderBy: { createdAt: 'asc' },
              select: { content: true },
            },
          },
        })

        existingQuestionsList = existingQuiz?.questions?.map((question) => question.content) || []
      }

      const existingQuestions = this.formatQuestionsForPrompt(existingQuestionsList)
);

fs.writeFileSync(path, content, 'utf8');
