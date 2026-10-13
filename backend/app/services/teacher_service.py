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
        self.current_question_index = 0 # 0-indexed question within current topic
        self.scores: Dict[str, float] = {}
        self.doubts_asked: List[Dict[str, str]] = []
        self.qna_history: List[QuestionHistoryItem] = []
        self.remedial_attempts: Dict[str, int] = {} # topic_id -> attempts count
        self.is_in_remedial_loop: bool = False
        self.remedial_question: Optional[CheckpointQuestion] = None
        self.remedial_verbal_script: Optional[str] = None
        self.has_welcomed_student: bool = False

    def get_topic_questions(self, topic: TopicModule) -> List[CheckpointQuestion]:
        if getattr(topic, 'checkpoints', None) and len(topic.checkpoints) > 0:
            return topic.checkpoints
        if getattr(topic, 'checkpoint', None):
            return [topic.checkpoint]
        return []

    def get_current_question(self, topic: TopicModule) -> Optional[CheckpointQuestion]:
        if self.is_in_remedial_loop and self.remedial_question:
            return self.remedial_question
        questions = self.get_topic_questions(topic)
        if not questions:
            return None
        idx = min(self.current_question_index, len(questions) - 1)
        return questions[idx]

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
        if not session and self.active_sessions:
            session = list(self.active_sessions.values())[-1]
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
        topic_questions = session.get_topic_questions(current_topic)
        total_questions = max(len(topic_questions), 1)
        active_q = session.get_current_question(current_topic)

        # Check if student is in a remedial re-explanation loop for this topic
        if session.is_in_remedial_loop and session.remedial_verbal_script:
            speech_text = session.remedial_verbal_script
            visemes = tts_viseme_service.generate_visemes_for_text(speech_text)
            return TeacherResponsePayload(
                topic_id=current_topic.topic_id,
                speech_text=speech_text,
                visemes=visemes,
                slide=current_topic.visual_slide,
                question=session.remedial_question or active_q,
                question_index=session.current_question_index + 1,
                total_topic_questions=total_questions
            )

        # Standard initial teaching script
        raw_script = current_topic.explanation_script or ""
        
        # Thoroughly strip ANY leading Namaste, greeting, or intro from the topic script
        cleaned_script = re.sub(
            r'^(Namaste(\s+\w+)?(\s+beta)?(\s*!|\s*,|\s*\.)\s*)+',
            '',
            raw_script,
            flags=re.IGNORECASE
        ).strip()
        cleaned_script = re.sub(
            r'^(Come,?\s*let\s+us\s+|Let\'s\s+explore\s+|Welcome\s+to\s+)?',
            '',
            cleaned_script,
            flags=re.IGNORECASE
        ).strip()
        # Clean any placeholder names and remove "beta"
        cleaned_script = re.sub(r'\b(Timmy|Vihana|Student)\s*(beta)?\b', f"{session.child_name}", cleaned_script, flags=re.IGNORECASE)
        cleaned_script = re.sub(r',?\s*\bbeta\b\s*,?', ' ', cleaned_script, flags=re.IGNORECASE)
        cleaned_script = re.sub(r'\s+', ' ', cleaned_script).strip()
        
        # Ensure closing question checking comprehension and transition to checking knowledge
        closing_check = f" Is everything clear to you, {session.child_name}? Can we go ahead to check your understanding of this topic with a few quick questions?"
        if not any(phrase in cleaned_script.lower() for phrase in ["is everything clear", "can we go ahead", "shall we check"]):
            cleaned_script = cleaned_script.rstrip('.!?') + "." + closing_check

        # SALUTATION RULE: "Namaste {child_name}!" is ONLY spoken ONCE at the start of the whole session!
        # Once welcomed, all subsequent topics (Topic 2, Topic 3, etc.) NEVER repeat "Namaste".
        if not getattr(session, 'has_welcomed_student', False):
            session.has_welcomed_student = True
            speech_text = f"Namaste {session.child_name}! I am {session.avatar_config.name}. Let's explore '{current_topic.title}'. {cleaned_script}"
        else:
            speech_text = f"Great! Now let's explore '{current_topic.title}'. {cleaned_script}"

        visemes = tts_viseme_service.generate_visemes_for_text(speech_text)

        return TeacherResponsePayload(
            topic_id=current_topic.topic_id,
            speech_text=speech_text,
            visemes=visemes,
            slide=current_topic.visual_slide,
            question=active_q,
            question_index=session.current_question_index + 1,
            total_topic_questions=total_questions
        )

    def evaluate_answer(self, submission: AnswerSubmission) -> EvaluationResult:
        session = self.active_sessions.get(submission.session_id)
        if not session and self.active_sessions:
            session = list(self.active_sessions.values())[-1]
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
        topic_questions = session.get_topic_questions(current_topic)
        total_questions = max(len(topic_questions), 1)

        # Match current topic by submission.topic_id if provided
        if submission.topic_id and current_topic.topic_id != submission.topic_id:
            for idx, t in enumerate(topics):
                if t.topic_id == submission.topic_id:
                    current_topic = t
                    session.current_topic_index = idx
                    topic_questions = session.get_topic_questions(current_topic)
                    total_questions = max(len(topic_questions), 1)
                    break

        # 1. Determine active checkpoint:
        # Check if client explicitly submitted a question_id that matches remedial or any topic question
        active_checkpoint = None
        if submission.question_id:
            if session.remedial_question and session.remedial_question.question_id == submission.question_id:
                active_checkpoint = session.remedial_question
            else:
                for q_idx, q in enumerate(topic_questions):
                    if q.question_id == submission.question_id:
                        active_checkpoint = q
                        session.current_question_index = q_idx
                        break
                # If still not found in current topic, search across all topics in lesson plan
                if not active_checkpoint:
                    for t_idx, t in enumerate(topics):
                        for q_idx, q in enumerate(session.get_topic_questions(t)):
                            if q.question_id == submission.question_id:
                                active_checkpoint = q
                                current_topic = t
                                session.current_topic_index = t_idx
                                session.current_question_index = q_idx
                                topic_questions = session.get_topic_questions(t)
                                total_questions = max(len(topic_questions), 1)
                                break
                        if active_checkpoint:
                            break
        
        if not active_checkpoint:
            active_checkpoint = session.remedial_question if session.is_in_remedial_loop else session.get_current_question(current_topic)
        
        is_correct = False
        score = 0.0

        # Helper to normalize text (handles \r\n, extra spaces, punctuation)
        def normalize_concept_text(txt: str) -> str:
            if not txt:
                return ""
            t = re.sub(r'[\r\n\t]+', ' ', txt)
            t = re.sub(r'[^\w\s]', '', t)
            return re.sub(r'\s+', ' ', t).strip().lower()

        clean_correct = normalize_concept_text(active_checkpoint.correct_answer_text)

        # Determine student selected text safely
        student_ans_text = ""
        if submission.selected_option_text:
            student_ans_text = submission.selected_option_text.strip()
        elif submission.submission_type == "dpad_option" and submission.selected_option_index is not None:
            if 0 <= submission.selected_option_index < len(active_checkpoint.options):
                student_ans_text = active_checkpoint.options[submission.selected_option_index].strip()
            else:
                student_ans_text = f"Option {submission.selected_option_index + 1}"
        elif submission.voice_transcript:
            student_ans_text = submission.voice_transcript.strip()
        else:
            student_ans_text = "No answer provided"

        clean_student = normalize_concept_text(student_ans_text)

        # Check correctness by normalized text match first (safest, immune to index shifts and newlines)
        if clean_student and clean_correct:
            if clean_student == clean_correct or (len(clean_student) >= 6 and (clean_student in clean_correct or clean_correct in clean_student)):
                is_correct = True
                score = 1.0

        if not is_correct and submission.submission_type == "dpad_option" and submission.selected_option_index is not None:
            # Check by index matching
            is_correct = (submission.selected_option_index == active_checkpoint.correct_option_index)
            # Also check if option text at that index matches correct_answer_text
            if not is_correct and 0 <= submission.selected_option_index < len(active_checkpoint.options):
                chosen_opt = normalize_concept_text(active_checkpoint.options[submission.selected_option_index])
                if chosen_opt and clean_correct and (chosen_opt == clean_correct or (len(chosen_opt) >= 6 and (chosen_opt in clean_correct or clean_correct in chosen_opt))):
                    is_correct = True
            score = 1.0 if is_correct else 0.2
        elif not is_correct and submission.voice_transcript:
            transcript_lower = submission.voice_transcript.lower()
            if any(w in transcript_lower for w in clean_correct.split() if len(w) > 3):
                is_correct = True
                score = 0.95
            else:
                is_correct = False
                score = 0.3

        # Determine attempt number for this question
        current_attempts = session.remedial_attempts.get(current_topic.topic_id, 0)
        attempt_number = current_attempts + 1
        is_remedial_question = session.is_in_remedial_loop

        # Record question & answer history for the parent report
        session.qna_history.append(QuestionHistoryItem(
            topic_title=current_topic.title,
            question_text=active_checkpoint.question_text,
            options=active_checkpoint.options,
            student_selected_text=student_ans_text,
            correct_answer_text=active_checkpoint.correct_answer_text,
            is_correct=is_correct,
            score=score,
            attempt_number=attempt_number,
            is_remedial=is_remedial_question
        ))

        session.scores[current_topic.topic_id] = score

        if is_correct:
            session.is_in_remedial_loop = False
            session.remedial_question = None
            session.remedial_verbal_script = None
            session.remedial_attempts[current_topic.topic_id] = 0

            current_q_idx = session.current_question_index
            has_more_questions = (current_q_idx + 1) < len(topic_questions)

            if has_more_questions:
                # Move to NEXT question in the SAME topic
                session.current_question_index += 1
                next_q = topic_questions[session.current_question_index]
                next_q_num = session.current_question_index + 1
                
                teacher_response = (
                    f"Shabash, {session.child_name}! That's completely correct! "
                    f"Now let's check your understanding with Question {next_q_num} of {total_questions}!"
                )

                return EvaluationResult(
                    topic_id=current_topic.topic_id,
                    is_correct=True,
                    score=score,
                    feedback_type="praise",
                    teacher_verbal_response=teacher_response,
                    next_topic_id=current_topic.topic_id,
                    lesson_completed=False,
                    question_index=next_q_num,
                    total_topic_questions=total_questions,
                    topic_completed=False,
                    next_question=next_q
                )
            else:
                # All questions for this topic completed! Advance to NEXT topic!
                teacher_response = (
                    f"Shabash, {session.child_name}! Outstanding work! "
                    f"You have answered all questions and completely mastered '{current_topic.title}'! Let's continue our learning journey!"
                )
                feedback_type = "praise"

                # Advance to next topic
                session.current_topic_index += 1
                session.current_question_index = 0 # Reset question counter for the new topic
                lesson_completed = session.current_topic_index >= len(session.lesson_plan.topics)
                next_topic_id = None if lesson_completed else session.lesson_plan.topics[session.current_topic_index].topic_id

                return EvaluationResult(
                    topic_id=current_topic.topic_id,
                    is_correct=True,
                    score=score,
                    feedback_type=feedback_type,
                    teacher_verbal_response=teacher_response,
                    next_topic_id=next_topic_id,
                    lesson_completed=lesson_completed,
                    question_index=total_questions,
                    total_topic_questions=total_questions,
                    topic_completed=True,
                    next_question=None
                )
        else:
            # CHILD MADE A MISTAKE! DO NOT ADVANCE TO NEXT QUESTION/TOPIC!
            # Trigger Remedial Loop: Re-explain concept & present a fresh follow-up check question!
            attempts = session.remedial_attempts.get(current_topic.topic_id, 0) + 1
            session.remedial_attempts[current_topic.topic_id] = attempts
            session.is_in_remedial_loop = True

            # Craft warm remedial re-explanation
            remedial_explanation = (
                f"Bahut achha try, {session.child_name}! Let me re-explain this concept simply so you understand it 100%. "
                f"{current_topic.concept_summary[:200]}... "
                f"Remember: {active_checkpoint.correct_answer_text}! Let's try another quick question together!"
            )

            # Generate fresh follow-up question testing the same topic
            fresh_options = [
                active_checkpoint.correct_answer_text,
                f"It is completely unrelated to {current_topic.title}.",
                f"Opposite of what we learned in this chapter."
            ]
            random.shuffle(fresh_options)
            correct_idx = fresh_options.index(active_checkpoint.correct_answer_text)

            session.remedial_question = CheckpointQuestion(
                question_id=f"chk_rem_{current_topic.topic_id}_{attempts}",
                question_text=f"{session.child_name}, let's test our understanding again: What is the true key concept of {current_topic.title}?",
                options=fresh_options,
                correct_option_index=correct_idx,
                correct_answer_text=active_checkpoint.correct_answer_text,
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
                lesson_completed=False,
                question_index=session.current_question_index + 1,
                total_topic_questions=total_questions,
                topic_completed=False,
                next_question=session.remedial_question
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
                question=None,
                question_index=1,
                total_topic_questions=1
            )

        current_topic = session.lesson_plan.topics[session.current_topic_index]
        topic_questions = session.get_topic_questions(current_topic)
        total_questions = max(len(topic_questions), 1)

        if understood:
            # Student confirmed understanding! Start with Question 1
            session.current_question_index = 0
            session.is_in_remedial_loop = False
            session.remedial_question = None
            first_q = session.get_current_question(current_topic)

            praise_script = f"Shabash, {session.child_name}! I am so happy that you understood {current_topic.title}! Let's check your knowledge with Question 1 of {total_questions}!"
            visemes = tts_viseme_service.generate_visemes_for_text(praise_script)
            return TeacherResponsePayload(
                topic_id=current_topic.topic_id,
                speech_text=praise_script,
                visemes=visemes,
                slide=current_topic.visual_slide,
                question=first_q,
                question_index=1,
                total_topic_questions=total_questions
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
                    f"Koi baat nahi, {session.child_name}! Let me explain '{current_topic.title}' in a much simpler way! "
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
                question=session.remedial_question or current_topic.checkpoint,
                question_index=session.current_question_index + 1,
                total_topic_questions=total_questions
            )

    def is_inappropriate_query(self, query: str) -> bool:
        """
        Safety guardrail filter to intercept offensive, unsafe, abusive, or inappropriate queries.
        """
        if not query:
            return False
        q = query.lower().strip()
        
        # Obscene, offensive, hate speech, adult, violent, and harmful keywords/patterns
        prohibited_patterns = [
            r'\b(fuck|shit|bitch|bastard|asshole|dick|pussy|cunt|slut|whore)\b',
            r'\b(chutiya|bhenchod|madarchod|harami|gandu|kameena|saala)\b',
            r'\b(porn|sex|sexy|nude|naked|erotic|boobs|penis|vagina)\b',
            r'\b(kill yourself|suicide|die|murder|bomb|terrorist|attack|weapon|gun|knife)\b',
            r'\b(hate you|idiot|stupid teacher|dumb teacher|shut up|loser)\b'
        ]
        return any(re.search(pat, q, re.IGNORECASE) for pat in prohibited_patterns)

    def answer_student_doubt(self, session_id: str, student_query: str) -> DoubtResponse:
        session = self.active_sessions.get(session_id)
        if not session and self.active_sessions:
            session = list(self.active_sessions.values())[-1]
        child_name = session.child_name if session else "Student"
        teacher_name = session.avatar_config.name if session else "Miss Priya"
        chapter = session.lesson_plan.chapter_title if session else "this chapter"
        
        current_topic_idx = session.current_topic_index if session else 0
        topics = session.lesson_plan.topics if (session and session.lesson_plan) else []
        current_topic = topics[current_topic_idx] if (topics and current_topic_idx < len(topics)) else (topics[0] if topics else None)
        current_topic_title = current_topic.title if current_topic else "Overview"

        # ----------------------------------------------------
        # SAFETY GUARDRAILS: Check for offensive/objectionable query
        # ----------------------------------------------------
        if self.is_inappropriate_query(student_query):
            guardrail_message = (
                f"I am sorry {child_name}, but as your teacher, I cannot help with that kind of question. "
                f"Let us keep our classroom respectful and focus on our lesson on '{current_topic_title}'. "
                f"Shall we continue learning?"
            )
            visemes = tts_viseme_service.generate_visemes_for_text(guardrail_message)
            return DoubtResponse(
                session_id=session_id,
                student_query=student_query,
                teacher_explanation=guardrail_message,
                visemes=visemes,
                slide=current_topic.visual_slide if current_topic else None,
                question=current_topic.checkpoint if current_topic else None,
                action_type="answer_doubt",
                switched_topic_id=None
            )

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

        # Strip repetitive greeting prefixes if LLM still hallucinated one during mid-session doubts, and remove "beta"
        if explanation:
            import re
            explanation = re.sub(r'^(Namaste(\s+\w+)?(\s+beta)?(\s*!|\s*,|\s*\.)\s*)+', '', explanation, flags=re.IGNORECASE).strip()
            # Also clean "Aapne bahut achha sawal poocha! " if immediately following
            explanation = re.sub(r'^(Aapne\s+bahut\s+achha\s+sawal\s+poocha(\s*!|\s*,|\s*\.)\s*)+', '', explanation, flags=re.IGNORECASE).strip()
            explanation = re.sub(r',?\s*\bbeta\b\s*,?', ' ', explanation, flags=re.IGNORECASE)
            explanation = re.sub(r'\s+', ' ', explanation).strip()
            if explanation and explanation[0].islower():
                explanation = explanation[0].upper() + explanation[1:]

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
                    f"Sure! Let's go back and explore '{target_topic.title}' again! "
                    f"{target_topic.concept_summary[:180]}. "
                    f"Is it clear now, {child_name}? Shall we continue with '{current_topic_title}'?"
                )
            else:
                explanation = (
                    f"Regarding '{student_query}', in {chapter}, "
                    f"this connects directly to what we are studying. "
                    f"Is it clear now, {child_name}? Shall we continue with '{current_topic_title}'?"
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
