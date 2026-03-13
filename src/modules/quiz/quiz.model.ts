export type CreateQuizBodyType = {
  lessonId: string
  title?: string
  description?: string
}

export type UpdateQuizBodyType = {
  title?: string
  description?: string
}

export type AddQuestionBodyType = {
  quizId: string
  content: string
  answers: {
    content: string
    isCorrect: boolean
  }[]
}

export type SubmitQuizBodyType = {
  quizId: string
  answers: {
    questionId: string
    answerId: string
  }[]
}