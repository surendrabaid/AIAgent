import { Subject, Chapter } from '../types';

export const EMPTY_CHAPTER: Chapter = {
  id: 'empty-placeholder',
  subjectId: 'pdf-curriculum',
  title: 'Upload a PDF Chapter to Start',
  gradeLevel: 'All Grades',
  summary: 'No textbook chapter uploaded yet. Click "Choose Your Chapter to Study" at the top to upload or select a PDF chapter.',
  objectives: [
    'Upload a PDF or TXT textbook chapter',
    'Explore core concepts with your real-time AI avatar mentor',
    'Test your understanding with practice quizzes'
  ],
  keyConcepts: [
    {
      title: 'Upload Your Textbook',
      summary: 'Upload any school textbook chapter, study guide, or notes to automatically extract core concepts and quiz questions.',
      example: 'Supports .pdf and .txt formats.'
    }
  ],
  quickPrompts: [
    'Tutor Jay, how do I upload a chapter from my textbook?',
    'What subjects can you help me study?'
  ],
  quiz: [],
  status: 'not_started'
};

// All static chapters removed - chapters now come strictly from uploaded PDFs
export const CURRICULUM_DATA: Subject[] = [];
