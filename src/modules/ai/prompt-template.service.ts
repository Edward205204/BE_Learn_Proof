import { Injectable } from '@nestjs/common'

@Injectable()
export class PromptTemplateService {
  private templates = {
    rag_answer_v1: {
      version: 'v1',
      systemPrompt: `You are an AI teaching assistant. Your goal is to answer the learner's question based strictly on the provided lesson context.
If the context does not contain the answer, say "I don't have enough information to answer that based on the lesson."
Do NOT invent information or bring in outside knowledge.`,
      userTemplate: `Lesson Title: {{lessonTitle}}
Target Level: {{targetLevel}}

Context:
{{context}}

Question: {{question}}
Answer:`,
    },
    quiz_gen_v1: {
      version: 'v1',
      systemPrompt: `You are an expert curriculum designer. Based on the provided lesson context, generate a multiple-choice quiz.
The quiz MUST contain at least 3 questions.
Each question MUST have at least 4 options ("A", "B", "C", "D").
Each question MUST have exactly one correct option index (0-indexed).
Provide an explanation for why the correct option is correct.
Return the output strictly as a JSON object matching this schema:
{
  "questions": [
    {
      "question": "string (min 10 chars)",
      "options": ["A", "B", "C", "D"],
      "correctIndex": 0,
      "explanation": "string"
    }
  ]
}`,
      userTemplate: `Lesson Title: {{lessonTitle}}
Target Level: {{targetLevel}}
Lesson Description: {{lessonDesc}}

Context:
{{context}}

Generate a quiz with {{questionCount}} questions now.`,
    },
  }

  getTemplate(name: 'rag_answer_v1' | 'quiz_gen_v1') {
    return this.templates[name]
  }

  render(template: string, vars: Record<string, string>): string {
    let result = template
    for (const [key, value] of Object.entries(vars)) {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), value)
    }
    return result
  }
}
