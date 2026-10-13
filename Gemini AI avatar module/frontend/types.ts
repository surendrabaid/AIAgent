export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  isFinal: boolean;
}

export type VideoMode = 'none' | 'webcam' | 'screen';

export type TeachingMode = 'socratic' | 'eli5' | 'quiz' | 'deepdive';

export type AvatarMood = 'idle' | 'listening' | 'talking' | 'celebrating' | 'empathetic' | 'thinking';

export interface AvatarPersona {
  id: string;
  name: string;
  title: string;
  specialty: string;
  voiceName: 'fenrir' | 'puck' | 'charon' | 'kore' | 'zephyr';
  avatarName: string;
  imageUrl: string;
  themeColor: string;
  description: string;
  accentQuote: string;
}

export interface ConceptCard {
  title: string;
  summary: string;
  example?: string;
  formula?: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  hint?: string;
}

export interface QuizSessionState {
  isActive: boolean;
  currentIndex: number;
  selectedAnswers: Record<number, number>; // question index -> option index
  isAnswerSubmitted: Record<number, boolean>;
  score: number;
  isCompleted: boolean;
  streak: number;
}

export interface Chapter {
  id: string;
  subjectId: string;
  title: string;
  gradeLevel: string;
  summary: string;
  objectives: string[];
  keyConcepts: ConceptCard[];
  quickPrompts: string[];
  quiz: QuizQuestion[];
}

export interface Subject {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  chapters: Chapter[];
}
