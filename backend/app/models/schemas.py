from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum

class GenderEnum(str, Enum):
    MALE = "male"
    FEMALE = "female"
    NEUTRAL = "neutral"

class AvatarStyleEnum(str, Enum):
    TEACHER_YOUNG = "young_mentor"
    TEACHER_PROFESSOR = "wise_professor"
    CARTOON_GUIDE = "playful_guide"
    RECEPTIONIST_PRO = "receptionist_pro"

class RoleTypeEnum(str, Enum):
    TUTOR = "tutor"
    RECEPTIONIST = "receptionist"

class ChildProfile(BaseModel):
    id: str
    name: str
    age: int
    grade: str
    learning_style: Optional[str] = "visual_interactive"

class AvatarConfig(BaseModel):
    gender: GenderEnum = GenderEnum.FEMALE
    style: AvatarStyleEnum = AvatarStyleEnum.TEACHER_YOUNG
    name: str = "Miss Priya"
    voice_accent: str = "Indian Natural"
    voice_speed: float = 1.0
    hair_color: Optional[str] = "#1A1A1A"
    outfit_color: Optional[str] = "#B91C1C"

class CheckpointQuestion(BaseModel):
    question_id: str
    question_text: str
    options: List[str]
    correct_option_index: int
    correct_answer_text: str
    rubric_hint: str

class VisualSlide(BaseModel):
    headline: str
    bullet_points: List[str]
    diagram_type: Optional[str] = "concept_map"
    image_prompt: Optional[str] = None # Detailed prompt for SVG/visual rendering
    svg_illustration: Optional[str] = None # Rich inline SVG diagram markup

class TopicModule(BaseModel):
    topic_id: str
    title: str
    concept_summary: str
    explanation_script: str
    real_world_analogy: Optional[str] = None # Kid-friendly real world analogy
    visual_slide: VisualSlide
    checkpoint: Optional[CheckpointQuestion] = None # Backwards compatibility
    checkpoints: Optional[List[CheckpointQuestion]] = None # Multiple questions per topic

class FeedbackCheckRequest(BaseModel):
    session_id: str
    understood: bool # True = "I understood!", False = "Please explain again in another way"

class LessonPlan(BaseModel):
    curriculum_id: str
    chapter_title: str
    subject: str
    grade_level: str
    target_age: int
    topics: List[TopicModule]
    key_vocabulary: List[Dict[str, str]]
    full_pdf_text: Optional[str] = None
    created_at: Optional[float] = None

class CurriculumUploadResponse(BaseModel):
    curriculum_id: str
    filename: str
    chapter_title: str
    topics_count: int
    status: str
    lesson_plan: LessonPlan

class AnswerSubmission(BaseModel):
    session_id: str
    topic_id: str
    submission_type: str # "voice" or "dpad_option"
    selected_option_index: Optional[int] = None
    selected_option_text: Optional[str] = None
    question_id: Optional[str] = None
    voice_transcript: Optional[str] = None

class EvaluationResult(BaseModel):
    topic_id: str
    is_correct: bool
    score: float # 0.0 to 1.0
    feedback_type: str # "praise", "minor_error", "misconception"
    teacher_verbal_response: str
    next_topic_id: Optional[str] = None
    lesson_completed: bool = False
    question_index: int = 1
    total_topic_questions: int = 1
    topic_completed: bool = False
    next_question: Optional[CheckpointQuestion] = None

class VisemeFrame(BaseModel):
    time_ms: int
    viseme: str # e.g. 'A', 'E', 'O', 'M', 'F', 'REST'
    mouth_open: float # 0.0 to 1.0
    mouth_wide: float # 0.0 to 1.0

class TeacherResponsePayload(BaseModel):
    topic_id: str
    speech_text: str
    audio_url: Optional[str] = None
    visemes: List[VisemeFrame]
    slide: VisualSlide
    question: Optional[CheckpointQuestion] = None
    question_index: int = 1
    total_topic_questions: int = 1

class DoubtRequest(BaseModel):
    session_id: str
    student_query: str

class DoubtResponse(BaseModel):
    session_id: str
    student_query: str
    teacher_explanation: str
    visemes: List[VisemeFrame]
    slide: Optional[VisualSlide] = None
    question: Optional[CheckpointQuestion] = None
    action_type: str = "answer_doubt" # "answer_doubt", "switch_topic", "reexplain_current"
    switched_topic_id: Optional[str] = None

class QuestionHistoryItem(BaseModel):
    topic_title: str
    question_text: str
    options: List[str]
    student_selected_text: str
    correct_answer_text: str
    is_correct: bool
    score: float
    attempt_number: int = 1
    is_remedial: bool = False

class ParentReport(BaseModel):
    session_id: str
    child_name: str
    chapter_title: str
    completed_at: str
    overall_comprehension_pct: int
    mastered_topics: List[str]
    struggle_topics: List[str]
    teacher_notes: str
    recommended_activities: List[str]
    qna_history: Optional[List[QuestionHistoryItem]] = []
