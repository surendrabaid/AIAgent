import os
import re
import uuid
from typing import Dict, Any, List
from app.models.schemas import LessonPlan, TopicModule, VisualSlide, CheckpointQuestion

class PDFProcessorService:
    def __init__(self):
        pass

    def parse_pdf_file(self, file_bytes: bytes, filename: str) -> str:
        """
        Extract text from raw PDF or TXT bytes completely without truncation.
        """
        extracted_text = []
        try:
            import fitz  # PyMuPDF
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            for page in doc:
                text = page.get_text()
                if text.strip():
                    extracted_text.append(text.strip())
            
            full_text = "\n\n".join(extracted_text)
            if full_text.strip():
                return full_text
        except Exception as e:
            print(f"PyMuPDF parsing exception: {e}")

        # Fallback text decoding for text files
        try:
            decoded = file_bytes.decode("utf-8", errors="ignore")
            if decoded.strip():
                return decoded
        except Exception:
            pass

        return f"Chapter material for {filename}. Contains key educational units and concepts."

    def generate_ai_lesson_plan(self, raw_text: str, filename: str, child_age: int = 8, grade: str = "Grade 3", child_name: str = "Vihana") -> LessonPlan:
        """
        Generates a comprehensive, un-truncated Lesson Plan from the uploaded material.
        Uses live LLM API (OpenAI GPT-4o / Gemini) if API key is provided, or the Socratic NLP Engine.
        """
        curriculum_id = f"curr_{uuid.uuid4().hex[:8]}"
        chapter_title = self._extract_chapter_title(filename, raw_text)

        # 1. Exclusive Google Gemini API Lesson Plan Generation
        from app.services.llm_service import llm_service
        llm_output = llm_service.generate_gemini_lesson_plan(raw_text, chapter_title, child_name=child_name, grade=grade)
        
        if llm_output and "topics" in llm_output:
            llm_topics = []
            for idx, t in enumerate(llm_output["topics"]):
                chk = t.get("checkpoint", {})
                llm_topics.append(TopicModule(
                    topic_id=f"topic_{idx+1}",
                    title=t.get("title", f"Unit {idx+1}"),
                    concept_summary=t.get("explanation_script", ""),
                    explanation_script=t.get("explanation_script", ""),
                    visual_slide=VisualSlide(
                        headline=t.get("title", f"Unit {idx+1}"),
                        bullet_points=t.get("slide", {}).get("bullet_points", ["Key concept from textbook"]),
                        diagram_type="concept_map"
                    ),
                    checkpoint=CheckpointQuestion(
                        question_id=f"chk_{idx+1}",
                        question_text=chk.get("question_text", "What is the key takeaway?"),
                        options=chk.get("options", ["Correct Concept", "Option B", "Option C"]),
                        correct_option_index=chk.get("correct_option_index", 0),
                        correct_answer_text=chk.get("correct_answer_text", chk.get("options", ["Correct Concept"])[0]),
                        rubric_hint="Child should select correct answer."
                    )
                ))

            return LessonPlan(
                curriculum_id=curriculum_id,
                chapter_title=chapter_title,
                subject="Textbook Unit",
                grade_level=grade,
                target_age=child_age,
                topics=llm_topics,
                key_vocabulary=llm_output.get("key_vocabulary", [{"word": "Core Concept", "definition": "Main chapter idea"}]),
                full_pdf_text=raw_text
            )

        # Clean text into structured paragraphs (ignoring empty lines)
        paragraphs = [p.strip() for p in re.split(r'\n\s*\n', raw_text) if len(p.strip()) > 30]
        if not paragraphs:
            paragraphs = [p.strip() for p in raw_text.split('\n') if len(p.strip()) > 25]
        if not paragraphs:
            paragraphs = [raw_text.strip() or f"Core unit on {chapter_title}."]

        # Extract Key Vocabulary dynamically from the full text
        vocab_words = self._extract_key_vocabulary(raw_text, chapter_title)

        # Build comprehensive topics covering the ENTIRE document text
        topics = []
        num_sections = min(max(len(paragraphs), 3), 6) # Build between 3 to 6 comprehensive topic units
        
        # Chunk paragraphs across sections so no text is left behind
        chunk_size = max(1, len(paragraphs) // num_sections)

        for i in range(num_sections):
            start_idx = i * chunk_size
            end_idx = start_idx + chunk_size if i < num_sections - 1 else len(paragraphs)
            section_paragraphs = paragraphs[start_idx:end_idx]
            
            if not section_paragraphs:
                section_paragraphs = [paragraphs[min(i, len(paragraphs) - 1)]]

            # Section Title & Full Content
            full_section_text = " ".join(section_paragraphs)
            section_title = self._generate_section_title(section_paragraphs[0], i + 1)
            
            # Construct complete, detailed teaching script (NO TRUNCATION!)
            explanation_script = (
                f"Namaste! Let's explore '{section_title}'. "
                f"{full_section_text} "
                f"Notice how this concept helps us understand {chapter_title} deeply!"
            )

            # Extract 3 meaningful bullet points from the section text
            sentences = re.split(r'(?<=[.!?]) +', full_section_text)
            sentences = [s.strip() for s in sentences if len(s.strip()) > 15]
            
            b1 = sentences[0] if len(sentences) > 0 else f"Core principle of {section_title}"
            b2 = sentences[1] if len(sentences) > 1 else f"Key insight regarding {chapter_title}"
            b3 = sentences[2] if len(sentences) > 2 else f"Important learning takeaway"

            # Create contextual quiz question with 3 plausible options from document
            checkpoint = self._create_contextual_question(
                topic_id=f"topic_{i+1}",
                section_title=section_title,
                section_text=full_section_text,
                vocab_words=vocab_words,
                q_idx=i+1
            )

            topics.append(TopicModule(
                topic_id=f"topic_{i+1}",
                title=f"Unit {i+1}: {section_title}",
                concept_summary=full_section_text,
                explanation_script=explanation_script,
                visual_slide=VisualSlide(
                    headline=section_title,
                    bullet_points=[
                        b1[:100] + ("..." if len(b1) > 100 else ""),
                        b2[:100] + ("..." if len(b2) > 100 else ""),
                        b3[:100] + ("..." if len(b3) > 100 else "")
                    ],
                    diagram_type="concept_map"
                ),
                checkpoint=checkpoint
            ))

        return LessonPlan(
            curriculum_id=curriculum_id,
            chapter_title=chapter_title,
            subject="Textbook Unit",
            grade_level=grade,
            target_age=child_age,
            topics=topics,
            key_vocabulary=vocab_words,
            full_pdf_text=raw_text
        )

    def _extract_chapter_title(self, filename: str, raw_text: str) -> str:
        clean_name = os.path.splitext(filename)[0].replace("_", " ").replace("-", " ")
        lines = [l.strip() for l in raw_text.split('\n') if len(l.strip()) > 3]
        if lines:
            first = lines[0]
            if len(first) < 70 and not first.endswith('.'):
                return first.title()
            # Search for "Unit X" or "Chapter X"
            for line in lines[:5]:
                if re.match(r'^(unit|chapter|lesson)\s+\d+', line, re.IGNORECASE):
                    return line.title()
        return clean_name.title()

    def _generate_section_title(self, first_paragraph: str, idx: int) -> str:
        # Check if paragraph starts with a heading pattern
        match = re.match(r'^([A-Z0-9\.\s\-\:]{4,40})', first_paragraph)
        if match and len(match.group(1).strip()) > 4:
            return match.group(1).strip().title()
        
        words = [w for w in re.findall(r'\b[A-Za-z]{4,}\b', first_paragraph) if w.lower() not in ['about', 'there', 'their', 'which', 'where', 'these', 'those', 'every', 'other']]
        if words:
            return " ".join(words[:3]).title()
        return f"Core Concept {idx}"

    def _extract_key_vocabulary(self, text: str, chapter_title: str) -> List[Dict[str, str]]:
        capitalized = re.findall(r'\b[A-Z][a-z]{3,}\b', text)
        unique = list(dict.fromkeys(capitalized))
        
        vocab = []
        for word in unique[:4]:
            if word.lower() not in ['unit', 'chapter', 'about', 'there', 'their', 'where', 'grade']:
                vocab.append({
                    "word": word,
                    "definition": f"Key term from {chapter_title} explaining fundamental concepts."
                })

        if not vocab:
            vocab = [{"word": "Community", "definition": "A group of people living or working together in a supportive environment."}]

        return vocab

    def _create_contextual_question(self, topic_id: str, section_title: str, section_text: str, vocab_words: List[Dict[str, str]], q_idx: int) -> CheckpointQuestion:
        # Extract sentences from section text to build plausible questions & answers
        sentences = [s.strip() for s in re.split(r'(?<=[.!?]) +', section_text) if len(s.strip()) > 15]
        
        if sentences:
            correct_fact = sentences[0]
            question_text = f"Regarding '{section_title}', which statement accurately reflects what we just learned?"
            correct_option = correct_fact[:90] + ("..." if len(correct_fact) > 90 else "")
            
            # Build plausible distractors derived from text
            distractor_1 = sentences[1][:90] + "..." if len(sentences) > 1 else f"It focuses on completely unrelated concepts."
            distractor_2 = f"This section does not apply to {section_title} at all."
        else:
            v_word = vocab_words[0]['word'] if vocab_words else "Community"
            question_text = f"What is the key takeaway from our study of '{section_title}'?"
            correct_option = f"Understanding the role of {v_word} and cooperative principles."
            distractor_1 = f"Ignoring the foundational ideas of {section_title}."
            distractor_2 = f"Focusing strictly on unrelated external topics."

        return CheckpointQuestion(
            question_id=f"chk_{q_idx}",
            question_text=question_text,
            options=[
                correct_option,
                distractor_1,
                distractor_2
            ],
            correct_option_index=0,
            correct_answer_text=correct_option,
            rubric_hint=f"Child should select statement accurately describing {section_title}."
        )

pdf_service = PDFProcessorService()
