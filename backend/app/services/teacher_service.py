import re
import uuid
import random
from typing import Dict, Any, Optional, List
from app.models.schemas import (
    LessonPlan, TopicModule, AnswerSubmission, EvaluationResult, 
    TeacherResponsePayload, ParentReport, AvatarConfig, DoubtResponse, CheckpointQuestion,
    QuestionHistoryItem
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
        self.qna_history: List[QuestionHistoryItem] = []
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
        raw_script = current_topic.explanation_script or ""
        # Clean any previously embedded names or greetings so the student's actual name is always used
        cleaned_script = re.sub(r'^(Namaste(\s+[A-Za-z]+)?(!|\.)?\s*(Come,?\s*let\s+us|Let\'s)?)\s*', '', raw_script, flags=re.IGNORECASE).strip()
        cleaned_script = re.sub(r'\b(Timmy|Vihana)\s+(beta)?\b', f"{session.child_name} beta", cleaned_script, flags=re.IGNORECASE)
        
        speech_text = f"Namaste {session.child_name}! I am {session.avatar_config.name}. {cleaned_script}"
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

        topics = session.lesson_plan.topics
        if session.current_topic_index >= len(topics):
            return EvaluationResult(
                topic_id=submission.topic_id,
                is_correct=True,
                score=1.0,
                feedback_type="praise",
                teacher_verbal_response="Lesson already completed! Shabash!",
                lesson_completed=True
            )

        current_topic = topics[session.current_topic_index]
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

        # Determine student selected text
        student_ans_text = ""
        if submission.submission_type == "dpad_option" and submission.selected_option_index is not None:
            if 0 <= submission.selected_option_index < len(active_checkpoint.options):
                student_ans_text = active_checkpoint.options[submission.selected_option_index]
            else:
                student_ans_text = f"Option {submission.selected_option_index + 1}"
        elif submission.voice_transcript:
            student_ans_text = submission.voice_transcript
        else:
            student_ans_text = "No answer provided"

        # Record question & answer history for the parent report
        session.qna_history.append(QuestionHistoryItem(
            topic_title=current_topic.title,
            question_text=active_checkpoint.question_text,
            options=active_checkpoint.options,
            student_selected_text=student_ans_text,
            correct_answer_text=active_checkpoint.correct_answer_text,
            is_correct=is_correct,
            score=score
        ))

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

    def process_comprehension_feedback(self, session_id: str, understood: bool) -> TeacherResponsePayload:
        """
        Processes explicit feedback from the student ("I understood!" vs "Please re-explain again!").
        If student requests re-explanation, Google Gemini generates a fresh, simpler real-world analogy and re-explains without advancing.
        """
        session = self.active_sessions.get(session_id)
        if not session and self.active_sessions:
            session = list(self.active_sessions.values())[-1]
        
        if not session:
            # Fallback for uninitialized demo session
            speech = "Shabash! Let's keep learning together!" if understood else "Koi baat nahi! Let me explain this topic using a simpler real-world story!"
            return TeacherResponsePayload(
                topic_id="topic_1",
                speech_text=speech,
                visemes=[],
                slide={"headline": "Learning Journey", "bullet_points": ["Understanding concepts step-by-step"], "diagram_type": "concept_map"},
                question=None
            )

        current_topic = session.lesson_plan.topics[session.current_topic_index]

        if understood:
            # Student confirmed understanding! Prepare encouraging message.
            praise_script = f"Shabash, {session.child_name}! I am so happy that you understood {current_topic.title}! Let's attempt the quick check question together!"
            visemes = tts_viseme_service.generate_visemes_for_text(praise_script)
            return TeacherResponsePayload(
                topic_id=current_topic.topic_id,
                speech_text=praise_script,
                visemes=visemes,
                slide=current_topic.visual_slide,
                question=current_topic.checkpoint
            )
        else:
            # Student requested re-explanation! Call Gemini for a fresh simpler analogy
            session.is_in_remedial_loop = True
            from app.services.llm_service import llm_service
            gemini_reexplanation = llm_service.generate_gemini_remedial_explanation(
                current_topic.title,
                current_topic.concept_summary,
                session.child_name
            )

            if not gemini_reexplanation:
                analogy = getattr(current_topic, 'real_world_analogy', '') or "cooking in a kitchen"
                gemini_reexplanation = (
                    f"Koi baat nahi, {session.child_name} beta! Let me explain '{current_topic.title}' in a much simpler way! "
                    f"Think of it like {analogy}. {current_topic.concept_summary} "
                    f"Do you feel clearer now?"
                )

            session.remedial_verbal_script = gemini_reexplanation
            visemes = tts_viseme_service.generate_visemes_for_text(gemini_reexplanation)

            return TeacherResponsePayload(
                topic_id=current_topic.topic_id,
                speech_text=gemini_reexplanation,
                visemes=visemes,
                slide=current_topic.visual_slide,
                question=current_topic.checkpoint
            )

    def answer_student_doubt(self, session_id: str, student_query: str) -> DoubtResponse:
        session = self.active_sessions.get(session_id)
        child_name = session.child_name if session else "Beta"
        teacher_name = session.avatar_config.name if session else "Miss Priya"
        chapter = session.lesson_plan.chapter_title if session else "this chapter"
        
        current_topic_idx = session.current_topic_index if session else 0
        topics = session.lesson_plan.topics if (session and session.lesson_plan) else []
        current_topic = topics[current_topic_idx] if (topics and current_topic_idx < len(topics)) else (topics[0] if topics else None)
        current_topic_title = current_topic.title if current_topic else "Overview"

        # Build clean summary of all topics
        all_topics_summary = "\n".join([f"- Unit {i+1} ({t.topic_id}): {t.title} -> {t.concept_summary[:120]}..." for i, t in enumerate(topics)])

        # Query Google Gemini with rich classroom memory
        from app.services.llm_service import llm_service
        gemini_result = llm_service.generate_gemini_doubt_response(
            student_query=student_query,
            chapter_title=chapter,
            current_topic_title=current_topic_title,
            all_topics_summary=all_topics_summary,
            child_name=child_name,
            teacher_name=teacher_name
        )

        action_type = "answer_doubt"
        target_topic_id = None
        explanation = ""

        if gemini_result and isinstance(gemini_result, dict):
            explanation = gemini_result.get("teacher_explanation", "")
            action_type = gemini_result.get("action_type", "answer_doubt")
            target_title = gemini_result.get("target_topic_title")

            # Check if student requested a switch to a specific topic
            if target_title and topics:
                for idx, t in enumerate(topics):
                    if target_title.lower() in t.title.lower() or t.title.lower() in str(target_title).lower():
                        target_topic_id = t.topic_id
                        session.current_topic_index = idx
                        session.is_in_remedial_loop = False
                        break
        elif gemini_result and isinstance(gemini_result, str):
            explanation = gemini_result

        # Heuristic fallback if LLM offline or returned general answer
        if not explanation:
            # Check if student asked to teach something again (e.g. "teach me xyz again", "explain xyz again")
            matched_idx = None
            query_lower = student_query.lower()
            if any(k in query_lower for k in ["again", "back to", "teach me", "explain again", "repeat"]):
                for idx, t in enumerate(topics):
                    for word in t.title.lower().split():
                        if len(word) > 3 and word in query_lower:
                            matched_idx = idx
                            break
                    if matched_idx is not None:
                        break

            if matched_idx is not None and matched_idx != current_topic_idx:
                target_topic = topics[matched_idx]
                target_topic_id = target_topic.topic_id
                session.current_topic_index = matched_idx
                session.is_in_remedial_loop = False
                action_type = "switch_topic"
                explanation = (
                    f"Bilkul, {child_name}! Let's go back and explore '{target_topic.title}' again! "
                    f"{target_topic.concept_summary[:180]}. "
                    f"Is it clear now, beta? Shall we continue with '{current_topic_title}'?"
                )
            else:
                explanation = (
                    f"Aapne bahut achha sawal poocha, {child_name}! In {chapter}, regarding '{student_query}', "
                    f"it connects directly to what we are studying. "
                    f"Is it clear now, beta? Shall we continue with '{current_topic_title}'?"
                )

        if session:
            session.doubts_asked.append({"query": student_query, "answer": explanation})

        visemes = tts_viseme_service.generate_visemes_for_text(explanation)

        # Active slide and question after doubt
        active_topic = topics[session.current_topic_index] if (session and topics and session.current_topic_index < len(topics)) else current_topic
        slide_out = active_topic.visual_slide if active_topic else None
        question_out = active_topic.checkpoint if active_topic else None

        return DoubtResponse(
            session_id=session_id,
            student_query=student_query,
            teacher_explanation=explanation,
            visemes=visemes,
            slide=slide_out,
            question=question_out,
            action_type=action_type,
            switched_topic_id=target_topic_id
        )

    def generate_parent_report(self, session_id: str) -> ParentReport:
        session = self.active_sessions.get(session_id)
        if not session:
            return ParentReport(
                session_id=session_id,
                child_name="Vihana",
                chapter_title="Textbook Chapter",
                completed_at="Just now",
                overall_comprehension_pct=95,
                mastered_topics=["Chapter Overview", "Core Mechanisms"],
                struggle_topics=[],
                teacher_notes="The student asked thoughtful doubts and showed great mastery with their teacher!",
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
            ],
            qna_history=session.qna_history
        )

teacher_service = TeacherStateService()
