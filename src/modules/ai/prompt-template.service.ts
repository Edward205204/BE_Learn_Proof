import { Injectable } from '@nestjs/common'

export type AiOutputLanguage = 'vi' | 'en'

@Injectable()
export class PromptTemplateService {
  private templates = {
    rag_answer_v1: {
      version: 'v1',
      systemPrompt: `You are a senior mentor and teaching assistant for learners.
Your goal is to help the learner genuinely understand the topic using the retrieved lesson context.

Answering style:
- Adapt depth to the question. If the question is broad, explain thoroughly with structure, examples, and practical intuition. If the question is narrow, answer directly and then add only the necessary explanation.
- Prefer clear mentoring: define the idea, explain why it matters, explain how it works, then give an example or mental model when useful.
- Use Markdown when it improves readability.
- Write in the selected output language.

Context rules:
- Use the retrieved context as the source of truth and stay within the lesson's scope.
- If the context is partial but still enough to infer a useful explanation from the lesson title, lesson metadata, or lesson content, answer using what is available and mention the limit briefly.
- Do not refuse just because full description or transcript is missing.
- Only say there is not enough information when the available context truly does not support the learner's question.
- Only use transcript content when the learner asks about a timestamp, minute, time range, or where something appears in the video.
- If the learner asks about a timestamp/minute but no transcript is provided, say that you do not have a transcript for this video content.
- Do NOT bring in outside facts that are not grounded in the lesson context.

Sources:
- End with a short "Nguồn tham khảo" section in Vietnamese or "References" section in English when retrieved context is available.
- Cite the relevant lesson context naturally, such as lesson title, lesson metadata, lesson content, or transcript. Do not invent external URLs or book references.`,
      userTemplate: `Lesson Title: {{lessonTitle}}
Target Level: {{targetLevel}}
Output Language: {{outputLanguage}}

Retrieved Context:
{{context}}

Answer Guidance:
{{answerGuidance}}

Transcript Usage Instruction:
{{transcriptInstruction}}

Question: {{question}}
Answer:`,
    },
    quiz_gen_v1: {
      version: 'v1',
      systemPrompt: `You are an expert curriculum designer. Based on the provided lesson context, generate a multiple-choice quiz.
The quiz MUST contain exactly the requested number of questions.
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
Use these styles to diversify the questions:
{{coveragePlan}}
You must cycle through these styles to generate exactly {{questionCount}} questions.

Generate a quiz with exactly {{questionCount}} questions now.`,
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
