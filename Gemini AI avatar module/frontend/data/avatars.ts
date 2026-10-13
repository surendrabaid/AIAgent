import { AvatarPersona } from '../types';

const AVATAR_BASE = 'https://www.gstatic.com/pantheon/images/aiplatform/vertex_ai_studio/avatars';

export const TUTOR_PERSONAS: AvatarPersona[] = [
  {
    id: 'jay',
    name: 'Tutor Jay',
    title: 'Lead STEM & Physics Mentor',
    specialty: 'Physics, Mechanics & Problem Solving',
    voiceName: 'fenrir',
    avatarName: 'Jay',
    imageUrl: `${AVATAR_BASE}/jay.png`,
    themeColor: 'from-blue-600 to-indigo-600',
    description: 'Patient, energetic, and uses real-world sports and mechanical analogies to demystify complex formulas.',
    accentQuote: "Let's turn confusion into clarity, one step at a time!"
  },
  {
    id: 'carmen',
    name: 'Dr. Carmen',
    title: 'Life Sciences & Biology Specialist',
    specialty: 'Cellular Biology, Anatomy & Physiology',
    voiceName: 'kore',
    avatarName: 'Carmen',
    imageUrl: `${AVATAR_BASE}/carmen_2.png`,
    themeColor: 'from-emerald-600 to-teal-600',
    description: 'Warm, intuitive, and explains cellular processes with vivid storytelling and clinical insights.',
    accentQuote: 'Biology is the code of life—let’s explore how your body truly works.'
  },
  {
    id: 'ben',
    name: 'Prof. Ben',
    title: 'Mathematics & Calculus Guide',
    specialty: 'Algebra, Geometry & Differential Calculus',
    voiceName: 'puck',
    avatarName: 'Ben',
    imageUrl: `${AVATAR_BASE}/ben.png`,
    themeColor: 'from-amber-600 to-orange-600',
    description: 'Methodical, friendly, and excels at breaking daunting proofs into intuitive geometric building blocks.',
    accentQuote: 'Math is not about memorization; it is the art of logical pattern discovery.'
  },
  {
    id: 'piper',
    name: 'Coach Piper',
    title: 'Computer Science & AI Specialist',
    specialty: 'Algorithms, Data Structures & Coding',
    voiceName: 'zephyr',
    avatarName: 'Piper',
    imageUrl: `${AVATAR_BASE}/piper.png`,
    themeColor: 'from-purple-600 to-pink-600',
    description: 'High-energy tech educator who connects abstract Big-O limits to game engines and modern AI architectures.',
    accentQuote: 'Write clean thoughts, write clean code. You’ve got this!'
  },
  {
    id: 'vera',
    name: 'Vera',
    title: 'Humanities & Socratic Mentor',
    specialty: 'Critical Thinking, History & Logic',
    voiceName: 'charon',
    avatarName: 'Vera',
    imageUrl: `${AVATAR_BASE}/vera.png`,
    themeColor: 'from-rose-600 to-red-600',
    description: 'Thoughtful and Socratic; challenges assumptions with gentle, piercing guiding questions.',
    accentQuote: 'The best answer begins with the courage to ask the right question.'
  }
];
