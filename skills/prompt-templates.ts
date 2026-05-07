/**
 * prompt-template.service.ts
 * Hardcoded prompt templates — version string dùng để track trong AiJob.promptVersion
 *
 * Design principles (tối ưu cho model cheap — Gemini 2.5 Flash / gpt-4o-mini):
 *  1. System prompt ngắn, vai trò rõ ràng ngay câu đầu
 *  2. Output schema cứng trong system prompt — model cheap hay "sáng tạo" format nếu không ràng buộc
 *  3. Negative instruction (KHÔNG làm gì) đặt ngay sau positive — model cheap hay quên nếu để cuối
 *  4. Ví dụ output nhúng thẳng vào prompt — tốt hơn là mô tả abstract
 *  5. User prompt chỉ inject data, không thêm instruction — tránh conflict với system
 */

export type TemplateName = 'rag_answer_v1' | 'quiz_gen_v1'

export interface PromptTemplate {
  version: string
  systemPrompt: string
  /** Template string. Dùng {{VAR}} placeholder, replace bằng render() */
  userTemplate: string
}

// ---------------------------------------------------------------------------
// TEMPLATE 1: RAG Q&A
// Dùng cho: LessonService.askLesson()
// Input vars: {{context}}, {{question}}, {{lessonTitle}}, {{targetLevel}}
// ---------------------------------------------------------------------------

const RAG_ANSWER_V1: PromptTemplate = {
  version: 'rag_answer_v1',

  systemPrompt: `You are a teaching assistant for an online learning platform.
Your job: answer learner questions using ONLY the provided lesson context.

RULES:
- Answer in the SAME language as the question (Vietnamese question → Vietnamese answer).
- Use ONLY information from <context>. Do NOT use outside knowledge.
- If the context does not contain enough information, reply exactly: {"answer":"Nội dung bài học chưa đề cập đến câu hỏi này.","sources":[]}
- Keep answers concise: 2–5 sentences. No bullet lists unless the question asks for steps.
- NEVER make up facts, formulas, or code that are not in the context.

OUTPUT FORMAT — respond with valid JSON only, no markdown fences:
{
  "answer": "<your answer here>",
  "sources": ["<short quote or phrase from context that supports the answer, max 80 chars each>"]
}
Max 3 sources. Sources must be verbatim short excerpts from the context.`,

  userTemplate: `Lesson: {{lessonTitle}} (Level: {{targetLevel}})

<context>
{{context}}
</context>

Question: {{question}}`,
}

// ---------------------------------------------------------------------------
// TEMPLATE 2: Quiz Generation
// Dùng cho: QuizGenProcessor
// Input vars: {{lessonTitle}}, {{targetLevel}}, {{lessonDesc}}, {{context}}, {{questionCount}}
// ---------------------------------------------------------------------------

const QUIZ_GEN_V1: PromptTemplate = {
  version: 'quiz_gen_v1',

  systemPrompt: `You are an expert quiz writer for an online learning platform.
Your job: create multiple-choice questions that test understanding of lesson content.

RULES:
- Generate exactly {{questionCount}} questions. No more, no less.
- Each question must have exactly 4 answer options (A, B, C, D).
- Each question must have exactly 1 correct answer.
- Questions must be based ONLY on the provided lesson content. Do NOT invent facts.
- Write in the SAME language as the lesson content.
- Questions must test understanding, NOT just memorization of exact words.
- Each question must be at least 10 characters long.
- correctIndex is 0-based (0=A, 1=B, 2=C, 3=D).
- NEVER include "All of the above" or "None of the above" as an option.
- Distractors (wrong options) must be plausible but clearly wrong to someone who studied the lesson.

OUTPUT FORMAT — respond with valid JSON only, no markdown fences:
{
  "questions": [
    {
      "question": "<question text>",
      "options": ["<option A>", "<option B>", "<option C>", "<option D>"],
      "correctIndex": 0,
      "explanation": "<1 sentence explaining why the correct answer is right>"
    }
  ]
}

If the lesson content is too short or lacks enough information to generate {{questionCount}} valid questions, return:
{"questions":[],"error":"Nội dung bài học không đủ để sinh câu hỏi."}`,

  userTemplate: `Lesson: {{lessonTitle}}
Level: {{targetLevel}}
Description: {{lessonDesc}}

<lesson_content>
{{context}}
</lesson_content>

Generate {{questionCount}} multiple-choice questions for this lesson.`,
}

// ---------------------------------------------------------------------------
// Service class
// ---------------------------------------------------------------------------

const TEMPLATES: Record<TemplateName, PromptTemplate> = {
  rag_answer_v1: RAG_ANSWER_V1,
  quiz_gen_v1: QUIZ_GEN_V1,
}

export class PromptTemplateService {
  getTemplate(name: TemplateName): PromptTemplate {
    const tpl = TEMPLATES[name]
    if (!tpl) throw new Error(`Unknown prompt template: ${name}`)
    return tpl
  }

  /**
   * Replace all {{VAR}} placeholders in a template string.
   * Missing vars are left as-is (will surface as obvious bug in output → easy to catch).
   */
  render(template: string, vars: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`)
  }

  /**
   * Build the full system prompt for a given template + vars.
   * systemPrompt cũng có thể chứa {{questionCount}} (ví dụ quiz_gen_v1).
   */
  buildSystemPrompt(name: TemplateName, vars: Record<string, string>): string {
    return this.render(this.getTemplate(name).systemPrompt, vars)
  }

  /**
   * Build the full user prompt for a given template + vars.
   */
  buildUserPrompt(name: TemplateName, vars: Record<string, string>): string {
    return this.render(this.getTemplate(name).userTemplate, vars)
  }
}

// ---------------------------------------------------------------------------
// USAGE EXAMPLES (để trong comment — xóa khi ship)
// ---------------------------------------------------------------------------

/*
// --- RAG Ask ---
const svc = new PromptTemplateService()
const vars = {
  lessonTitle: 'Giới thiệu về REST API',
  targetLevel: 'BEGINNER',
  context: chunks.map(c => c.content).join('\n\n'),  // top-K chunks từ VectorStore
  question: 'HTTP method nào dùng để tạo resource mới?',
}
const systemPrompt = svc.buildSystemPrompt('rag_answer_v1', vars)
const userPrompt   = svc.buildUserPrompt('rag_answer_v1', vars)
// → gửi vào LlmService.chatCompletion({ systemPrompt, userPrompt, responseFormat: 'json', model: 'cheap' })
// → parse JSON → { answer: string, sources: string[] }


// --- Quiz Gen ---
const vars = {
  lessonTitle: 'Giới thiệu về REST API',
  targetLevel: 'BEGINNER',
  lessonDesc: 'Bài học giới thiệu các khái niệm cơ bản về REST API...',
  context: lesson.textContent ?? lesson.lessonDesc,  // full content (đã truncate)
  questionCount: '5',  // luôn truyền string vì render() là string replace
}
const systemPrompt = svc.buildSystemPrompt('quiz_gen_v1', vars)
const userPrompt   = svc.buildUserPrompt('quiz_gen_v1', vars)
// → gửi vào LlmService.chatCompletion({ systemPrompt, userPrompt, responseFormat: 'json', model: 'cheap' })
// → parse JSON → { questions: QuizQuestion[] }
// → validate: questions.length >= 3, mỗi câu có đúng 1 correctIndex, 4 options
*/
