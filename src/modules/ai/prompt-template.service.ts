import { Injectable } from '@nestjs/common'

export type AiOutputLanguage = 'vi' | 'en'

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
Output Language: {{outputLanguage}}

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
If existing quiz questions are provided, do not repeat or closely rephrase them. Create new questions that expand coverage and make the quiz more diverse.
All question text, options, and explanations must be written in the selected output language.
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
Output Language: {{outputLanguage}}
Lesson Description: {{lessonDesc}}

Context:
{{context}}

Existing Quiz Questions:
These are question texts only. Do not copy their answer options.
{{existingQuestions}}

Questions to Avoid in This Generation:
{{avoidQuestions}}

Question Coverage Plan:
Use these styles first, and try to make each question cover a different style:
{{coveragePlan}}
If a style is already covered by existing questions, prefer a different style.

Generate a quiz with {{questionCount}} questions now.`,
    },
    lesson_content_gen_v1: {
      version: 'v1',
      systemPrompt: `You are an expert educational content creator. Your goal is to write a detailed, engaging, and structured lesson content based on a title and optional keywords.
Use Markdown for formatting (headings, lists, bold text, code blocks).
The content should be professional, clear, and easy to follow.
Write the content in the selected output language.
Do NOT include any preamble or concluding remarks, just the lesson content itself.`,
      userTemplate: `Lesson Title: {{lessonTitle}}
Target Level: {{targetLevel}}
Output Language: {{outputLanguage}}
Keywords: {{keywords}}

Write a comprehensive lesson content for this topic now.`,
    },
  }

  getTemplate(name: 'rag_answer_v1' | 'quiz_gen_v1' | 'lesson_content_gen_v1') {
    return this.templates[name]
  }

  render(template: string, vars: Record<string, string>): string {
    let result = template
    for (const [key, value] of Object.entries(vars)) {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), value)
    }
    return result
  }

  getOutputLanguageLabel(language: AiOutputLanguage = 'vi') {
    return language === 'en' ? 'English' : 'Tiếng Việt'
  }
}
