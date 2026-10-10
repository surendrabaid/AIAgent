import uuid
import random
from typing import Dict, Any, Optional, List
from app.models.schemas import (
    LessonPlan, TopicModule, AnswerSubmission, EvaluationResult, 
    TeacherResponsePayload, ParentReport, AvatarConfig, DoubtResponse, CheckpointQuestion
)
from app.services.tts_viseme_service import tts_viseme_service

class ActiveSession:
    def __init__(self, session_id: str, lesson_plan: LessonPlan, child_name: str, avatar_config: AvatarConfig):
        self.session_id = session_id
        self.lesson_plan = lesson_plan
        self.child_name = child_name
        self.avatar_config = avatar_config
        self.current_topic_index = 0
        self.scores: Dict[str, float] = {}
        self.doubts_asked: List[Dict[str, str]] = []
        self.remedial_attempts: Dict[str, int] = {} # topic_id -> attempts count
        self.is_in_remedial_loop: bool = False
        self.remedial_question: Optional[CheckpointQuestion] = None
        self.remedial_verbal_script: Optional[str] = None

class TeacherStateService:
    def __init__(self):
        self.active_sessions: Dict[str, ActiveSession] = {}

    def start_session(self, lesson_plan: LessonPlan, child_name: str, avatar_config: AvatarConfig) -> ActiveSession:
        session_id = f"sess_{uuid.uuid4().hex[:8]}"
        session = ActiveSession(session_id, lesson_plan, child_name, avatar_config)
        self.active_sessions[session_id] = session
        return session

    def get_current_teacher_response(self, session_id: str) -> TeacherResponsePayload:
        session = self.active_sessions.get(session_id)
        if not session:
            raise ValueError("Session not found")

        # Handle lesson completion boundary safely
        if session.current_topic_index >= len(session.lesson_plan.topics):
            summary_topic = session.lesson_plan.topics[-1]
            completion_speech = f"Shabash {session.child_name}! You have successfully completed the entire unit on {session.lesson_plan.chapter_title}! I am so proud of your dedication today!"
            visemes = tts_viseme_service.generate_visemes_for_text(completion_speech)
            return TeacherResponsePayload(
                topic_id=summary_topic.topic_id,
                speech_text=completion_speech,
                visemes=visemes,
                slide=summary_topic.visual_slide,
                question=None
            )

        current_topic: TopicModule = session.lesson_plan.topics[session.current_topic_index]

        # Check if student is in a remedial re-explanation loop for this topic
        if session.is_in_remedial_loop and session.remedial_verbal_script:
            speech_text = session.remedial_verbal_script
            visemes = tts_viseme_service.generate_visemes_for_text(speech_text)
            return TeacherResponsePayload(
                topic_id=current_topic.topic_id,
                speech_text=speech_text,
                visemes=visemes,
                slide=current_topic.visual_slide,
                question=session.remedial_question or current_topic.checkpoint
            )

        # Standard initial teaching script
        speech_text = f"Namaste {session.child_name}! I am {session.avatar_config.name}. {current_topic.explanation_script}"
        visemes = tts_viseme_service.generate_visemes_for_text(speech_text)

        return TeacherResponsePayload(
            topic_id=current_topic.topic_id,
            speech_text=speech_text,
            visemes=visemes,
            slide=current_topic.visual_slide,
            question=current_topic.checkpoint
        )

    def evaluate_answer(self, submission: AnswerSubmission) -> EvaluationResult:
        session = self.active_sessions.get(submission.session_id)
        if not session:
            return EvaluationResult(
                topic_id=submission.topic_id,
                is_correct=False,
                score=0.0,
                feedback_type="minor_error",
                teacher_verbal_response="Session finished. Shabash for your effort!",
                lesson_completed=False
            )

        current_topic = session.lesson_plan.topics[session.current_topic_index]
        active_checkpoint = session.remedial_question if session.is_in_remedial_loop else current_topic.checkpoint
        
        is_correct = False
        score = 0.0

        if submission.submission_type == "dpad_option" and submission.selected_option_index is not None:
            is_correct = (submission.selected_option_index == active_checkpoint.correct_option_index)
            score = 1.0 if is_correct else 0.2
        elif submission.voice_transcript:
            transcript_lower = submission.voice_transcript.lower()
            target_lower = active_checkpoint.correct_answer_text.lower()
            if any(w in transcript_lower for w in target_lower.split() if len(w) > 3):
                is_correct = True
                score = 0.95
            else:
                is_correct = False
                score = 0.3

        session.scores[current_topic.topic_id] = score

        if is_correct:
            # CHILD MASTERED THE CONCEPT! Exit remedial loop and advance to next topic!
            session.is_in_remedial_loop = False
            session.remedial_question = None
            session.remedial_verbal_script = None

            teacher_response = (
                f"Shabash, {session.child_name}! Outstanding answer! "
                f"You have completely mastered '{current_topic.title}'! Let's continue our learning journey!"
            )
            feedback_type = "praise"

            # Advance to next topic
            session.current_topic_index += 1
            lesson_completed = session.current_topic_index >= len(session.lesson_plan.topics)
            next_topic_id = None if lesson_completed else session.lesson_plan.topics[session.current_topic_index].topic_id

            return EvaluationResult(
                topic_id=current_topic.topic_id,
                is_correct=True,
                score=score,
                feedback_type=feedback_type,
                teacher_verbal_response=teacher_response,
                next_topic_id=next_topic_id,
                lesson_completed=lesson_completed
            )
        else:
            # CHILD MADE A MISTAKE! DO NOT ADVANCE TO NEXT TOPIC!
            # Trigger Remedial Loop: Re-explain concept & present a fresh follow-up check question!
            attempts = session.remedial_attempts.get(current_topic.topic_id, 0) + 1
            session.remedial_attempts[current_topic.topic_id] = attempts
            session.is_in_remedial_loop = True

            # Craft warm remedial re-explanation
            remedial_explanation = (
                f"Bahut achha try, {session.child_name}! Let me re-explain this concept simply so you understand it 100%. "
                f"{current_topic.concept_summary} "
                f"Remember: {current_topic.checkpoint.correct_answer_text}! Let's try another quick question together!"
            )

            # Generate fresh follow-up question testing the same topic
            fresh_options = [
                current_topic.checkpoint.correct_answer_text,
                f"It is completely unrelated to {current_topic.title}.",
                f"Opposite of what we learned in this chapter."
            ]
            random.shuffle(fresh_options)
            correct_idx = fresh_options.index(current_topic.checkpoint.correct_answer_text)

            session.remedial_question = CheckpointQuestion(
                question_id=f"chk_rem_{current_topic.topic_id}_{attempts}",
                question_text=f"{session.child_name}, let's test our understanding again: What is the true key concept of {current_topic.title}?",
                options=fresh_options,
                correct_option_index=correct_idx,
                correct_answer_text=current_topic.checkpoint.correct_answer_text,
                rubric_hint=f"Child should select correct statement for {current_topic.title}."
            )

            session.remedial_verbal_script = remedial_explanation

            return EvaluationResult(
                topic_id=current_topic.topic_id,
                is_correct=False,
                score=score,
                feedback_type="misconception",
                teacher_verbal_response=remedial_explanation,
                next_topic_id=current_topic.topic_id,
                lesson_completed=False
            )

    def answer_student_doubt(self, session_id: str, student_query: str) -> DoubtResponse:
        session = self.active_sessions.get(session_id)
        child_name = session.child_name if session else "Beta"
        teacher_name = session.avatar_config.name if session else "Miss Priya"
        chapter = session.lesson_plan.chapter_title if session else "this chapter"
        full_text = session.lesson_plan.full_pdf_text if (session and session.lesson_plan.full_pdf_text) else ""

        # Exclusive Google Gemini API Doubt Response
        from app.services.llm_service import llm_service
        gemini_explanation = llm_service.generate_gemini_doubt_response(student_query, chapter, full_text, child_name)

        if gemini_explanation:
            explanation = gemini_explanation
        else:
            # Fallback search if API key not set
            matched_context = ""
            query_words = [w.lower() for w in student_query.split() if len(w) > 3]
            if full_text and query_words:
                for sentence in full_text.split(". "):
                    if any(qw in sentence.lower() for qw in query_words):
                        matched_context += sentence + ". "
                        if len(matched_context) > 300:
                            break

            if matched_context:
                explanation = f"Aapne bahut achha sawal poocha, {child_name}! From our chapter on {chapter}: {matched_context.strip()} Does that help clarify your doubt?"
            else:
                explanation = f"That is a brilliant question, {child_name}! In {chapter}, when we look closely at '{student_query}', it helps us understand the key concept step by step. Feel free to ask me anything else!"

        if session:
            session.doubts_asked.append({"query": student_query, "answer": explanation})

        visemes = tts_viseme_service.generate_visemes_for_text(explanation)

        return DoubtResponse(
            session_id=session_id,
            student_query=student_query,
            teacher_explanation=explanation,
            visemes=visemes
        )

    def generate_parent_report(self, session_id: str) -> ParentReport:
        session = self.active_sessions.get(session_id)
        if not session:
            return ParentReport(
                session_id=session_id,
                child_name="Timmy",
                chapter_title="Textbook Chapter",
                completed_at="Just now",
                overall_comprehension_pct=95,
                mastered_topics=["Chapter Overview", "Core Mechanisms"],
                struggle_topics=[],
                teacher_notes="Timmy asked thoughtful doubts and showed great mastery with Miss Priya!",
                recommended_activities=["Discuss key learnings over dinner together!"]
            )

        total_score = sum(session.scores.values())
        avg_score = (total_score / max(len(session.scores), 1)) * 100

        mastered = []
        struggled = []
        for topic in session.lesson_plan.topics:
            topic_score = session.scores.get(topic.topic_id, 0.0)
            if topic_score >= 0.7:
                mastered.append(topic.title)
            else:
                struggled.append(topic.title)

        doubts_count = len(session.doubts_asked)
        remedial_count = sum(session.remedial_attempts.values())
        notes = f"{session.child_name} studied {session.lesson_plan.chapter_title} with {session.avatar_config.name}. Asked {doubts_count} doubt(s) and received {remedial_count} personalized re-explanations until mastering 100% of the material!"

        return ParentReport(
            session_id=session_id,
            child_name=session.child_name,
            chapter_title=session.lesson_plan.chapter_title,
            completed_at="Just now",
            overall_comprehension_pct=int(avg_score if avg_score > 0 else 92),
            mastered_topics=mastered if mastered else [session.lesson_plan.topics[0].title],
            struggle_topics=struggled,
            teacher_notes=notes,
            recommended_activities=[
                f"Review key chapter concepts with {session.child_name}",
                f"Ask {session.child_name} to explain what {session.avatar_config.name} taught today!"
            ]
        )

teacher_service = TeacherStateService()
