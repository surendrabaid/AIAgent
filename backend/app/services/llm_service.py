import os
import json
import requests
from typing import Dict, Any, List, Optional
from dotenv import load_dotenv

# Load environment variables from .env file automatically
load_dotenv()

class GoogleGeminiService:
    def __init__(self):
        self.gemini_api_key = os.getenv("GEMINI_API_KEY", "") or os.getenv("GOOGLE_API_KEY", "")

    def is_configured(self) -> bool:
        return bool(self.gemini_api_key)

    def generate_gemini_lesson_plan(self, full_text: str, chapter_title: str, child_name: str = "Vihana", grade: str = "Grade 3") -> Optional[Dict[str, Any]]:
        """
        Feeds the uploaded textbook file content exclusively to Google Gemini API (gemini-3.8-flash)
        to generate a multi-unit Socratic lesson plan, detailed explanations, visual slides, and contextual quizzes.
        """
        if not self.is_configured():
            return None

        prompt = f"""
You are Miss Priya, an expert, encouraging, warm Indian AI Teacher powered by Google Gemini.
Your mission is to teach {child_name} (Grade: {grade}) the entire textbook chapter: "{chapter_title}" like a real master teacher sitting right in front of them.

CRITICAL INSTRUCTIONS FOR MASTER TUTORING:
- DO NOT just break or summarize text. Deeply explain the WHY and HOW behind every concept.
- For each unit, create a simple, memorable REAL-WORLD ANALOGY (e.g. comparing photosynthesis to cooking in a kitchen, or gravity to a invisible magnet).
- Use warm, engaging Indian teacher phrasing (e.g., "Namaste {child_name} beta!", "Isn't that amazing?", "Let's picture this together!").
- Structure 3-5 intuitive learning units covering ALL details in the uploaded material.

UPLOADED TEXTBOOK CONTENT:
\"\"\"
{full_text[:8000]}
\"\"\"

Return a structured JSON response with:
1. "topics": Array of comprehensive units. Each unit must have:
   - "topic_id": "topic_1", "topic_2", etc.
   - "title": Engaging unit title
   - "explanation_script": A warm, 5-7 sentence interactive explanation that breaks down complex ideas into simple steps.
   - "real_world_analogy": A vivid, kid-friendly everyday analogy explaining the unit's core concept.
   - "slide": {{
       "headline": "Unit Headline",
       "bullet_points": ["Key takeaway 1", "Key takeaway 2", "Real-world analogy summary"],
       "diagram_type": "concept_map",
       "image_prompt": "Description of a simple visual diagram or illustration for this unit"
     }}
   - "checkpoint": {{
       "question_text": "Interactive conceptual check question",
       "options": ["Correct Answer", "Plausible Distractor 1", "Plausible Distractor 2"],
       "correct_option_index": 0,
       "correct_answer_text": "Correct Answer"
     }}
2. "key_vocabulary": Array of {{"word": "Term", "definition": "Simple kid-friendly definition"}}

Return ONLY valid JSON matching this schema.
"""

        try:
            # 1. Try modern google-genai SDK first with gemini-3.8-flash
            try:
                from google import genai
                client = genai.Client(api_key=self.gemini_api_key)
                response = client.models.generate_content(
                    model="gemini-3.8-flash",
                    contents=prompt
                )
                if response and response.text:
                    clean_json = response.text.replace("```json", "").replace("```", "").strip()
                    return json.loads(clean_json)
            except Exception as sdk_e:
                print(f"google.genai SDK exception, trying REST fallback: {sdk_e}")

            # 2. REST API fallback using supported model
            for model_name in ["gemini-3.8-flash", "gemini-2.5-flash", "gemini-1.5-flash"]:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={self.gemini_api_key}"
                body = {"contents": [{"parts": [{"text": prompt}]}]}
                res = requests.post(url, json=body, timeout=15)
                if res.status_code == 200:
                    text_out = res.json()["candidates"][0]["content"]["parts"][0]["text"]
                    clean_json = text_out.replace("```json", "").replace("```", "").strip()
                    return json.loads(clean_json)
        except Exception as e:
            print(f"Google Gemini Lesson Plan Exception: {e}")

        return None

    def generate_gemini_remedial_explanation(self, topic_title: str, concept_summary: str, child_name: str) -> Optional[str]:
        """
        Generates a personalized Google Gemini remedial re-explanation when a student answers a question wrong.
        """
        if not self.is_configured():
            return None

        prompt = f"You are Miss Priya, an Indian AI Teacher powered by Google Gemini. Student {child_name} answered a question wrong about '{topic_title}'. Core concept: {concept_summary}. In 2-3 warm sentences, re-explain the concept using a simpler real-world analogy and encourage them."
        
        try:
            from google import genai
            client = genai.Client(api_key=self.gemini_api_key)
            response = client.models.generate_content(
                model="gemini-3.8-flash",
                contents=prompt
            )
            if response and response.text:
                return response.text.strip()
        except Exception:
            pass

        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key={self.gemini_api_key}"
            body = {"contents": [{"parts": [{"text": prompt}]}]}
            res = requests.post(url, json=body, timeout=10)
            if res.status_code == 200:
                return res.json()["candidates"][0]["content"]["parts"][0]["text"]
        except Exception as e:
            print(f"Google Gemini Remedial Exception: {e}")

        return None

    def generate_gemini_doubt_response(self, student_query: str, chapter_title: str, full_pdf_text: str, child_name: str) -> Optional[str]:
        """
        Answers a student's doubt interactively using Google Gemini API and uploaded PDF RAG context.
        """
        if not self.is_configured():
            return None

        prompt = f"""
You are Miss Priya, an encouraging Indian AI Teacher powered by Google Gemini.
Student Name: {child_name}
Chapter Title: {chapter_title}
Uploaded Textbook Context: {full_pdf_text[:4000]}

Student Doubt: \"{student_query}\"

Respond as Miss Priya in 2-3 warm, encouraging sentences explaining the doubt clearly using facts from the textbook context. Start with a warm greeting like "Namaste {child_name}!" or "Aapne bahut achha sawal poocha!".
"""
        try:
            from google import genai
            client = genai.Client(api_key=self.gemini_api_key)
            response = client.models.generate_content(
                model="gemini-3.8-flash",
                contents=prompt
            )
            if response and response.text:
                return response.text.strip()
        except Exception:
            pass

        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key={self.gemini_api_key}"
            body = {"contents": [{"parts": [{"text": prompt}]}]}
            res = requests.post(url, json=body, timeout=10)
            if res.status_code == 200:
                return res.json()["candidates"][0]["content"]["parts"][0]["text"]
        except Exception as e:
            print(f"Google Gemini Doubt Exception: {e}")

        return None

llm_service = GoogleGeminiService()
