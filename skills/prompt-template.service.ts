import { Injectable } from '@nestjs/common'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TemplateName = 'rag_answer_v1' | 'quiz_gen_v1'

export interface PromptTemplate {
  version: string
  systemPrompt: string
  /** {{VAR}} placeholders — replaced bằng render() */
  userTemplate: string
}

export interface BuiltPrompt {
  systemPrompt: string
  userPrompt: string
  version: string
}

// ---------------------------------------------------------------------------
// Template 1 — RAG Q&A
//
// Dùng cho: LessonService.askLesson()
// Vars:
//   {{lessonTitle}}   — tên bài học
//   {{targetLevel}}   — BEGINNER | INTERMEDIATE | ADVANCED
//   {{context}}       — nội dung top-K chunks từ VectorStore (đã join bằng \n\n)
//   {{question}}      — câu hỏi của learner
// ---------------------------------------------------------------------------

const RAG_ANSWER_V1: PromptTemplate = {
  version: 'rag_answer_v1',

  systemPrompt: `\
You are a teaching assistant for an online learning platform.
Your ONLY job: answer learner questions using the provided lesson context.

RULES (follow all, in order):
1. Answer in the SAME language as the question. Vietnamese question → Vietnamese answer.
2. Use ONLY information inside <context>. Do NOT use outside knowledge.
3. If context lacks the answer, return EXACTLY this JSON and nothing else:
   {"answer":"Nội dung bài học chưa đề cập đến câu hỏi này.","sources":[]}
4. Keep the answer to 2–5 sentences. Use bullet points ONLY if the question explicitly asks for a list or steps.
5. NEVER invent facts, numbers, code, or names not present in the context.

OUTPUT — return valid JSON only. No markdown fences. No preamble. No explanation outside the JSON.
Schema:
{
  "answer": "<answer text>",
  "sources": ["<exact short excerpt from context, max 80 chars>"]
}
Rules for sources: max 3 items, each must be a verbatim excerpt from the context.`,

  userTemplate: `\
Lesson: {{lessonTitle}} (Level: {{targetLevel}})

<context>
{{context}}
</context>

Question: {{question}}`,
}

// ---------------------------------------------------------------------------
// Template 2 — Quiz Generation
//
// Dùng cho: QuizGenProcessor
// Vars:
//   {{lessonTitle}}     — tên bài học
//   {{targetLevel}}     — BEGINNER | INTERMEDIATE | ADVANCED
//   {{lessonDesc}}      — mô tả ngắn bài học (luôn có)
//   {{context}}         — full content đã truncate (textContent ?? lessonDesc)
//   {{questionCount}}   — số câu cần sinh (string, VD: "5")
// ---------------------------------------------------------------------------

const QUIZ_GEN_V1: PromptTemplate = {
  version: 'quiz_gen_v1',

  systemPrompt: `\
You are an expert quiz writer for an online learning platform.
Your ONLY job: generate multiple-choice questions from the provided lesson content.

RULES (follow all, in order):
1. Generate EXACTLY {{questionCount}} questions — not more, not less.
2. Each question: exactly 4 answer options labeled A, B, C, D.
3. Each question: exactly 1 correct answer. correctIndex is 0-based (A=0, B=1, C=2, D=3).
4. Base ALL questions ONLY on the lesson content. Do NOT invent facts.
5. Write in the SAME language as the lesson content.
6. Test UNDERSTANDING, not word-for-word memorization.
7. Each question text must be at least 10 characters.
8. FORBIDDEN options: "All of the above", "None of the above", duplicate options within one question.
9. Wrong options (distractors) must be plausible for someone who did NOT study, but clearly wrong for someone who did.
10. Each explanation: 1 sentence, says WHY the correct answer is right (not just restates it).

If content is insufficient for {{questionCount}} valid questions, return EXACTLY:
{"questions":[],"error":"Nội dung bài học không đủ để sinh câu hỏi."}

OUTPUT — return valid JSON only. No markdown fences. No preamble. No extra keys.
Schema:
{
  "questions": [
    {
      "question": "<question text>",
      "options": ["<A>", "<B>", "<C>", "<D>"],
      "correctIndex": 0,
      "explanation": "<1 sentence why correct answer is right>"
    }
  ]
}`,

  userTemplate: `\
Lesson: {{lessonTitle}}
Level: {{targetLevel}}
Description: {{lessonDesc}}

<lesson_content>
{{context}}
</lesson_content>

Generate EXACTLY {{questionCount}} multiple-choice questions based on the lesson content above.`,
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

const TEMPLATES: Record<TemplateName, PromptTemplate> = {
  rag_answer_v1: RAG_ANSWER_V1,
  quiz_gen_v1: QUIZ_GEN_V1,
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class PromptTemplateService {
  // ---------- core ----------

  getTemplate(name: TemplateName): PromptTemplate {
    const tpl = TEMPLATES[name]
    if (!tpl) throw new Error(`Unknown prompt template: "${name}"`)
    return tpl
  }

  /**
   * Replace {{VAR}} placeholders.
   * Missing key → giữ nguyên {{KEY}} để lộ bug ngay trong output (dễ debug hơn crash).
   */
  render(template: string, vars: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`)
  }

  // ---------- convenience ----------

  /**
   * Build cả systemPrompt + userPrompt cùng lúc.
   * systemPrompt cũng chạy qua render() vì quiz_gen_v1 có {{questionCount}} trong system.
   *
   * @example
   * // RAG
   * const prompt = promptSvc.build('rag_answer_v1', {
   *   lessonTitle: 'REST API cơ bản',
   *   targetLevel: 'BEGINNER',
   *   context: chunks.map(c => c.content).join('\n\n'),
   *   question: 'GET và POST khác nhau như thế nào?',
   * })
   * // Quiz
   * const prompt = promptSvc.build('quiz_gen_v1', {
   *   lessonTitle: 'REST API cơ bản',
   *   targetLevel: 'BEGINNER',
   *   lessonDesc: 'Bài học giới thiệu REST API...',
   *   context: lesson.textContent ?? lesson.lessonDesc ?? '',
   *   questionCount: '5',   // luôn truyền string
   * })
   */
  build(name: TemplateName, vars: Record<string, string>): BuiltPrompt {
    const tpl = this.getTemplate(name)
    return {
      systemPrompt: this.render(tpl.systemPrompt, vars),
      userPrompt: this.render(tpl.userTemplate, vars),
      version: tpl.version,
    }
  }
}
