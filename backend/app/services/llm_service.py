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
- Use warm, engaging Indian teacher phrasing (e.g., "Namaste {child_name}!", "Isn't that amazing?", "Let's picture this together!"). NEVER add "beta" to the student's name; address them strictly by {child_name}.
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
   - "checkpoints": [
       {{
         "question_text": "First meaningful question testing core understanding of this unit",
         "options": ["A plausible option", "Another plausible option", "Another plausible option"],
         "correct_option_index": 0,
         "correct_answer_text": "Exact matching text from options that is correct"
       }},
       {{
         "question_text": "Second question testing another key detail of this unit",
         "options": ["A plausible option", "Another plausible option", "Another plausible option"],
         "correct_option_index": 1,
         "correct_answer_text": "Exact matching text from options that is correct"
       }}
     ]
NOTE: CRITICAL REQUIREMENT: Provide 2-3 distinct questions in "checkpoints" per unit to test student knowledge thoroughly. Randomly vary "correct_option_index" (0, 1, or 2) across questions so the correct answer is NEVER always in the first position!
2. "key_vocabulary": Array of {{"word": "Term", "definition": "Simple kid-friendly definition"}}

Return ONLY valid JSON matching this schema.
"""

        try:
            # 1. Try modern google-genai SDK first with fast, high-availability models
            try:
                from google import genai
                client = genai.Client(api_key=self.gemini_api_key)
                response = client.models.generate_content(
                    model="gemini-3.5-flash-lite",
                    contents=prompt
                )
                if response and response.text:
                    clean_json = response.text.replace("```json", "").replace("```", "").strip()
                    return json.loads(clean_json)
            except Exception as sdk_e:
                print(f"google.genai SDK exception, trying REST fallback: {sdk_e}")

            # 2. REST API fallback using verified available models
            for model_name in ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-3-flash-preview", "gemini-3.5-flash", "gemini-3.8-flash"]:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={self.gemini_api_key}"
                body = {"contents": [{"parts": [{"text": prompt}]}]}
                res = requests.post(url, json=body, timeout=25)
                if res.status_code == 200:
                    text_out = res.json()["candidates"][0]["content"]["parts"][0]["text"]
                    clean_json = text_out.replace("```json", "").replace("```", "").strip()
                    return json.loads(clean_json)
                else:
                    print(f"Gemini REST model {model_name} status {res.status_code}: {res.text[:120]}")
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

    def generate_gemini_doubt_response(
        self,
        student_query: str,
        chapter_title: str,
        current_topic_title: str,
        all_topics_summary: str,
        child_name: str,
        teacher_name: str = "Miss Priya"
    ) -> Optional[Dict[str, Any]]:
        """
        Understands the student's query with full pedagogical memory:
        - Remembers what is currently being taught (current_topic_title)
        - Knows all units in the curriculum (all_topics_summary)
        - If student asks to review or re-teach a previous/specific topic, triggers topic switch
        - Answers the query clearly and warmly, concluding with a conversational bridge like:
          "Is it clear now, {child_name}? Shall we continue with [current/next concept]?"
        """
        if not self.is_configured():
            return None

        prompt = f"""
You are {teacher_name}, an extraordinary, warm, empathetic Indian AI Teacher powered by Google Gemini.
You are currently teaching {child_name} the chapter: "{chapter_title}".

CURRENT CLASSROOM CONTEXT & MEMORY:
- You are currently in the middle of teaching: "{current_topic_title}"
- Full chapter units available:
{all_topics_summary}

STUDENT'S SPOKEN/TYPED QUERY:
"{student_query}"

TEACHER INSTRUCTIONS:
1. SAFETY GUARDRAIL: If the student asks anything offensive, inappropriate, abusive, violent, explicit, or harmful, immediately refuse gently but firmly as a responsible Indian teacher:
   "I am sorry {child_name}, but as your teacher, I cannot help with that kind of question. Let us keep our classroom respectful and focus on our lesson on '{current_topic_title}'. Shall we continue learning?"
2. DO NOT repeat "Namaste {child_name}" or greeting pleasantries at the beginning of every response! That is only done once when the session first starts. NEVER use the word "beta" - address the student strictly by their name {child_name}. Jump straight into explaining the answer naturally and conversationally, like a real teacher in an ongoing class (e.g. "Good question!", "Sure!", "Photosynthesis is...", or start directly with the explanation).
3. Pay close attention to what {child_name} is asking:
   - Case A: If {child_name} asks you to re-explain, teach again, or go back to an earlier topic (e.g., "teach me xyz again", "can we go back to the Sun", "I didn't understand the inner planets"), you should gladly agree, explain that concept simply and warmly, and set "action_type": "switch_topic" or "reexplain_current", specifying the target "matched_topic_id" if it matches one of the chapter units.
   - Case B: If {child_name} asks a factual question, curiosity doubt, or clarification about what was just taught, explain the concept vividly with a quick real-world analogy.
4. CRITICAL CONVERSATIONAL CONCLUSION:
   Always conclude your answer by checking comprehension and asking to continue with what you were teaching, for example:
   "Is it clear now, {child_name}? Shall we continue with our lesson on '{current_topic_title}'?" or "Does that make sense, {child_name}? Can we now continue learning about '{current_topic_title}'?"

Return a JSON object:
{{
  "teacher_explanation": "Direct, engaging 2-4 sentence explanation (WITHOUT repeating 'Namaste' and WITHOUT using the word 'beta') ending with the comprehension check and invitation to continue with {current_topic_title}",
  "action_type": "answer_doubt" (or "switch_topic" if asking to teach an earlier topic),
  "target_topic_title": "Title of topic to switch to if requested, else null"
}}
Return ONLY valid JSON.
"""
        try:
            from google import genai
            client = genai.Client(api_key=self.gemini_api_key)
            response = client.models.generate_content(
                model="gemini-3.5-flash-lite",
                contents=prompt
            )
            if response and response.text:
                clean_json = response.text.replace("```json", "").replace("```", "").strip()
                return json.loads(clean_json)
        except Exception as sdk_e:
            print(f"Gemini SDK doubt error, trying REST: {sdk_e}")

        for model_name in ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-3.5-flash", "gemini-3.8-flash"]:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={self.gemini_api_key}"
                body = {"contents": [{"parts": [{"text": prompt}]}]}
                res = requests.post(url, json=body, timeout=15)
                if res.status_code == 200:
                    text_out = res.json()["candidates"][0]["content"]["parts"][0]["text"]
                    clean_json = text_out.replace("```json", "").replace("```", "").strip()
                    return json.loads(clean_json)
            except Exception as e:
                print(f"Gemini Doubt model {model_name} exception: {e}")

        return None

llm_service = GoogleGeminiService()
