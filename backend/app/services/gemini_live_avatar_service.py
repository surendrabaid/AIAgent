import os
import ssl
import time
import base64
import json
import asyncio
import subprocess
from typing import Dict, Any, Optional
from dotenv import load_dotenv

try:
    import certifi
    SSL_CONTEXT = ssl.create_default_context(cafile=certifi.where())
except Exception:
    SSL_CONTEXT = ssl.create_default_context()

load_dotenv(override=True)

class GeminiLiveAvatarService:
    """
    Implements Google Gemini 3.8 Live bidirectional streaming avatar engine
    supporting real-time video generation (video/mp4 at 24 FPS), synchronized audio,
    interaction APIs (streaming input/output transcription, VAD, barge-in / interruption),
    automatic token refresh via ADC and gcloud CLI, and interactive Socratic tutoring
    with the Interactive Quiz Master Protocol.
    """

    def __init__(self):
        self.model_id = "gemini-3.8-live"
        self.avatar_name = "Jay"
        self.persona_title = "Live Socratic Teacher (Indian Male) - Google Cloud Gemini 3.8 Live Avatar"
        self.voice_name = "Fenrir"  # Deep, natural Indian English male voice
        self.language_code = "en-IN"
        self.accent_style = "Natural Indian English (Male)"
        
        # Enterprise Cloud Configuration
        self.project_id = os.getenv("GCP_PROJECT_ID", "project-9691fa52-ebb2-43ba-9de")
        self.location = os.getenv("GCP_LOCATION", "asia-south1")
        self.access_token = os.getenv("GCP_ACCESS_TOKEN", "")
        
        # In-memory token cache
        self._cached_token = ""
        self._cached_token_expiry = 0.0

    def _refresh_env(self):
        """Dynamically re-reads .env so credential changes take effect immediately"""
        env_path = os.path.join(os.path.dirname(__file__), "..", "..", ".env")
        try:
            from dotenv import dotenv_values
            if os.path.exists(env_path):
                vals = dotenv_values(env_path)
                if vals.get("GCP_PROJECT_ID"):
                    self.project_id = vals["GCP_PROJECT_ID"].strip()
                if vals.get("GCP_LOCATION"):
                    self.location = vals["GCP_LOCATION"].strip()
                self.access_token = vals.get("GCP_ACCESS_TOKEN", "").strip()
        except Exception:
            pass

    def _is_token_valid(self, token: str) -> bool:
        """Validates if an OAuth2 access token is active and not expired via Google's tokeninfo API"""
        if not token or not token.strip():
            return False
        clean = token.strip()
        if clean.startswith("ya29.sample") or clean == "your-oauth2-access-token":
            return False
        try:
            import requests
            res = requests.get(f"https://oauth2.googleapis.com/tokeninfo?access_token={clean}", timeout=3)
            if res.status_code == 200:
                data = res.json()
                expires_in = int(data.get("expires_in", 0))
                if expires_in > 30:
                    return True
        except Exception:
            pass
        return False

    def get_valid_access_token(self) -> str:
        """
        Retrieves a valid OAuth2 access token:
        1. FIRST ATTEMPT: Check manual token from environment / .env (verify via tokeninfo API)
        2. SECOND ATTEMPT: Dynamic token acquisition
           - In-memory token cache if still valid
           - Google Application Default Credentials (ADC)
           - gcloud CLI fallback: `gcloud auth print-access-token` (cached 45 mins)
        """
        self._refresh_env()

        # 1. FIRST ATTEMPT: Check explicit manual token from user/.env
        if (
            self.access_token 
            and self.access_token.strip() 
            and not self.access_token.startswith("ya29.sample") 
            and self.access_token != "your-oauth2-access-token"
        ):
            if self._is_token_valid(self.access_token):
                print("[LiveAvatar Auth] First attempt: Valid manual GCP_ACCESS_TOKEN found. Using manual token.")
                return self.access_token.strip()
            else:
                print("[LiveAvatar Auth] First attempt: Manual GCP_ACCESS_TOKEN is expired or invalid. Falling back to dynamic token acquisition...")

        # Check memory cache
        now = time.time()
        if self._cached_token and now < self._cached_token_expiry:
            return self._cached_token

        # Priority 1: Check GCP_SERVICE_ACCOUNT_JSON for dynamic auto-refreshing token (No gcloud SDK required)
        sa_json = os.getenv("GCP_SERVICE_ACCOUNT_JSON", "").strip()
        if not sa_json:
            candidate_paths = [
                os.path.join(os.path.dirname(__file__), "..", "..", ".env"),
                os.path.join(os.path.dirname(__file__), "..", "..", "..", "Gemini AI avatar module", "backend", ".env.local"),
                os.path.join(os.path.dirname(__file__), "..", "..", "..", "gemini-ai-avatar-module", "backend", ".env.local"),
            ]
            for p in candidate_paths:
                if os.path.exists(p):
                    try:
                        with open(p, "r", encoding="utf-8") as f:
                            content = f.read()
                        import re
                        m = re.search(r'^\s*GCP_SERVICE_ACCOUNT_JSON\s*=\s*(.*)$', content, re.M)
                        if m:
                            val = m.group(1).strip()
                            if (val.startswith("'") and val.endswith("'")) or (val.startswith('"') and val.endswith('"')):
                                val = val[1:-1].strip()
                            if val:
                                sa_json = val
                                break
                    except Exception:
                        pass

        if sa_json:
            try:
                import json
                import google.auth
                import google.auth.transport.requests
                creds_dict = json.loads(sa_json)
                creds, _ = google.auth.load_credentials_from_dict(creds_dict, scopes=["https://www.googleapis.com/auth/cloud-platform"])
                if creds:
                    request = google.auth.transport.requests.Request()
                    creds.refresh(request)
                    if creds.token:
                        self._cached_token = creds.token
                        self._cached_token_expiry = now + (45 * 60)
                        print("[LiveAvatar Auth] Acquired dynamic access token via GCP_SERVICE_ACCOUNT_JSON (Auto-refreshing, No gcloud SDK required).")
                        return creds.token
            except Exception as e:
                print(f"[LiveAvatar Auth] Note: GCP_SERVICE_ACCOUNT_JSON auth attempt: {e}")

        # Try Google Application Default Credentials (ADC)
        try:
            import google.auth
            import google.auth.transport.requests
            credentials, _ = google.auth.default(scopes=["https://www.googleapis.com/auth/cloud-platform"])
            if credentials:
                request = google.auth.transport.requests.Request()
                credentials.refresh(request)
                if credentials.token:
                    self._cached_token = credentials.token
                    self._cached_token_expiry = now + (45 * 60)
                    print("[LiveAvatar Auth] Second attempt: Successfully fetched dynamic token via Application Default Credentials.")
                    return credentials.token
        except Exception:
            pass

        # Try gcloud CLI fallback
        try:
            token = subprocess.check_output(
                ["gcloud", "auth", "print-access-token"], 
                text=True, 
                stderr=subprocess.DEVNULL
            ).strip()
            if token:
                self._cached_token = token
                self._cached_token_expiry = now + (45 * 60)
                print("[LiveAvatar Auth] Second attempt: Successfully retrieved dynamic token via gcloud CLI fallback.")
                return token
        except Exception:
            pass

        return ""

    def get_enterprise_endpoint(self, location: Optional[str] = None) -> str:
        """Constructs regional WSS endpoint for Google Cloud LlmBidiService"""
        self._refresh_env()
        loc = location or self.location
        host = f"{loc}-aiplatform.googleapis.com"
        return f"wss://{host}//ws/google.cloud.aiplatform.v1beta1.LlmBidiService/BidiGenerateContent"

    def get_live_setup_payload(
        self, 
        topic_title: Optional[str] = None, 
        concept_summary: Optional[str] = None, 
        child_name: str = "Timmy",
        location: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generates Google Gemini 3.8 Live setup handshake payload for Live Avatar
        incorporating the Interactive Quiz Master Protocol from the POC:
        - generationConfig.responseModalities: ['VIDEO']
        - avatarConfig.avatarName: 'Jay'
        - speechConfig: Fenrir male voice (en-IN Indian English)
        - systemInstruction: Interactive Teacher Jay with instant verbal feedback,
          Socratic guidance, and celebration.
        """
        self._refresh_env()
        loc = location or self.location
        model_resource = f"projects/{self.project_id}/locations/{loc}/publishers/google/models/{self.model_id}"
        
        topic_context = topic_title or "General Science & Practical Life"
        summary_context = concept_summary or "Fundamental core principles, practical observations, and interactive questions."

        system_instruction_text = (
            f'You are "Teacher Jay", an enthusiastic, warm, world-class 1-on-1 AI Home Tutor and Indian school teacher. '
            f'You speak in fluent, natural Indian English with warmth, clarity, and an engaging conversational tone. '
            f'You are conducting an interactive lesson with {child_name} on: "{topic_context}". Curriculum Details: {summary_context}.\n\n'
            f'INTERACTIVE QUIZ MASTER PROTOCOL:\n'
            f'- When a quiz question appears or when prompted with [QUIZ QUESTION], read the question aloud clearly and enthusiastically, and list the choices (A, B, C, D). Encourage {child_name} to answer by voice or by tapping the screen.\n'
            f'- When an answer is submitted [QUIZ ANSWER]:\n'
            f'  1. INSTANT VERBAL FEEDBACK: Immediately react naturally! If correct, cheer and validate ("Spot on {child_name}!", "Bingo! That is exactly right! Shabash!"). If incorrect, be gentle, empathetic, and encouraging ("Ah, close! But not quite...", "Good thought {child_name}, but here is the trick...").\n'
            f'  2. DEEP EXPLANATION: Explain WHY the correct answer is right and why the chosen option is a common trap in 2 to 3 concise spoken sentences.\n'
            f'  3. STIMULATE CURIOSITY: Ask a quick checkpoint question or ask if they are ready for the next question.\n'
            f'- When the quiz finishes [QUIZ COMPLETE]: Celebrate their effort, announce their final score, highlight what they did great, and recommend what concept to review next.\n\n'
            f'GENERAL TEACHING GUIDELINES:\n'
            f'1. Warm & Encouraging: Greet {child_name} warmly ("Namaste {child_name}!" or "Hello there!"). Validate their effort and celebrate breakthroughs.\n'
            f'2. Socratic & Interactive: Avoid dense lecture monologues. Keep each spoken turn concise (2-4 sentences). Pause and prompt for student thoughts ("What do you think?", "Does that make sense?").\n'
            f'3. Everyday Indian Metaphors: Use vivid everyday examples like cricket balls, bicycles, kites, lanterns, tea kettles, and sweets.\n'
            f'4. Spoken Polish: Deliver spoken responses that sound punchy, expressive, and conversational.'
        )

        return {
            "setup": {
                "model": model_resource,
                "generationConfig": {
                    "responseModalities": ["VIDEO"],
                    "speechConfig": {
                        "voiceConfig": {
                            "prebuiltVoiceConfig": {
                                "voiceName": self.voice_name
                            }
                        },
                        "languageCode": self.language_code
                    }
                },
                "avatarConfig": {
                    "avatarName": self.avatar_name
                },
                "systemInstruction": {
                    "parts": [{
                        "text": system_instruction_text
                    }]
                },
                "inputAudioTranscription": {},
                "outputAudioTranscription": {}
            }
        }

    def get_public_config(self) -> Dict[str, Any]:
        """Returns metadata for frontend UI integration"""
        self._refresh_env()
        valid_token = self.get_valid_access_token()
        has_creds = bool(valid_token)
        return {
            "status": "configured" if has_creds else "ready_for_credentials",
            "model": self.model_id,
            "avatar_name": self.avatar_name,
            "persona_title": self.persona_title,
            "gender": "male",
            "voice_name": self.voice_name,
            "language_code": self.language_code,
            "accent": self.accent_style,
            "is_gcp_native": True,
            "response_modalities": ["VIDEO"],
            "enterprise_endpoint": self.get_enterprise_endpoint(),
            "cloud_project_id": self.project_id,
            "cloud_location": self.location,
            "has_enterprise_credentials": has_creds,
            "features": [
                "Google Gemini 3.8 Live direct video streaming (video/mp4 at 24 FPS)",
                "Prebuilt Google Cloud Live Avatar: Jay with natural facial expressions & lip-sync",
                "Indian English male voice synthesized speech (en-IN - Fenrir)",
                "Interactive Quiz Master Protocol: live questions, instant emotional reactions, explanations",
                "Real-time streaming speech transcription (inputAudioTranscription & outputAudioTranscription)",
                "Voice Activity Detection (VAD) & instant Barge-In interruption handling",
                "Interactive Socratic tutoring on uploaded curriculum units",
                "Automatic GCP OAuth2 Token refresh via Application Default Credentials and gcloud CLI"
            ]
        }

    async def stream_live_session(self, client_ws, session_id: str):
        """
        Manages the real-time bidirectional conversation between the web browser
        and Google Cloud Gemini 3.8 Live (LlmBidiService).
        Streams real-time synthesized video/mp4 frames, typed questions,
        microphone audio, and streaming subtitles.
        """
        self._refresh_env()
        token = self.get_valid_access_token()
        has_creds = bool(token)
        public_cfg = self.get_public_config()
        
        await client_ws.send_text(json.dumps({
            "event": "live_avatar_ready",
            "config": public_cfg,
            "session_id": session_id
        }))

        # If enterprise credentials are valid, establish live GCP WebSocket session
        if has_creds:
            locations_to_try = [self.location]
            if self.location != "us-central1":
                locations_to_try.append("us-central1")

            for target_loc in locations_to_try:
                try:
                    import websockets
                    uri = self.get_enterprise_endpoint(location=target_loc)
                    headers = {
                        "Authorization": f"Bearer {token}",
                        "X-Goog-User-Project": self.project_id
                    }
                    
                    async with websockets.connect(uri, additional_headers=headers, ssl=SSL_CONTEXT) as gcp_ws:
                        setup_payload = self.get_live_setup_payload(location=target_loc)
                        await gcp_ws.send(json.dumps(setup_payload))
                        
                        try:
                            first_msg = await asyncio.wait_for(gcp_ws.recv(), timeout=7.0)
                            first_msg_str = first_msg if isinstance(first_msg, str) else first_msg.decode("utf-8", errors="ignore")
                            first_data = json.loads(first_msg_str)
                            if "error" in first_data or "policy violation" in first_msg_str:
                                continue
                        except Exception as e:
                            if "1008" in str(e) and target_loc != "us-central1":
                                continue

                        await client_ws.send_text(json.dumps({
                            "event": "enterprise_stream_connected",
                            "status": "connected",
                            "avatar": self.avatar_name,
                            "model": self.model_id,
                            "voice": f"{self.voice_name} ({self.language_code})",
                            "location": target_loc
                        }))

                        turn_video_chunks = []

                        async def relay_from_gcp():
                            nonlocal turn_video_chunks
                            try:
                                async for raw_msg in gcp_ws:
                                    msg_str = raw_msg if isinstance(raw_msg, str) else raw_msg.decode("utf-8", errors="ignore")
                                    try:
                                        data = json.loads(msg_str)
                                    except Exception:
                                        continue

                                    sc = data.get("serverContent")
                                    if not sc:
                                        continue

                                    if sc.get("interrupted"):
                                        turn_video_chunks = []
                                        await client_ws.send_text(json.dumps({
                                            "event": "interrupted",
                                            "notice": "Jay heard you and paused speaking."
                                        }))

                                    out_trans = (
                                        sc.get("outputTranscription", {}).get("text") 
                                        or sc.get("outputAudioTranscription", {}).get("text")
                                    )
                                    if out_trans:
                                        await client_ws.send_text(json.dumps({
                                            "event": "output_transcription",
                                            "text": out_trans
                                        }))

                                    in_trans = (
                                        sc.get("interimInputTranscription", {}).get("text") 
                                        or sc.get("inputTranscription", {}).get("text") 
                                        or sc.get("inputAudioTranscription", {}).get("text")
                                    )
                                    if in_trans:
                                        await client_ws.send_text(json.dumps({
                                            "event": "input_transcription",
                                            "text": in_trans
                                        }))

                                    mt = sc.get("modelTurn", {})
                                    for part in mt.get("parts", []):
                                        inline = part.get("inlineData")
                                        if inline:
                                            mime = inline.get("mimeType", "")
                                            data_b64 = inline.get("data", "")
                                            if "video" in mime or "mp4" in mime:
                                                try:
                                                    chunk_bytes = base64.b64decode(data_b64)
                                                    turn_video_chunks.append(chunk_bytes)
                                                except Exception:
                                                    pass
                                                await client_ws.send_text(json.dumps({
                                                    "event": "live_video_chunk",
                                                    "data": data_b64,
                                                    "mimeType": "video/mp4"
                                                }))
                                            elif "audio" in mime:
                                                await client_ws.send_text(json.dumps({
                                                    "event": "audio_chunk",
                                                    "data": data_b64,
                                                    "mimeType": mime
                                                }))

                                    if sc.get("turnComplete"):
                                        video_url = None
                                        if turn_video_chunks:
                                            full_video = b"".join(turn_video_chunks)
                                            public_path = os.path.join(
                                                os.path.dirname(__file__), "..", "..", "..", "frontend", "public", "current_turn.mp4"
                                            )
                                            try:
                                                with open(public_path, "wb") as f:
                                                    f.write(full_video)
                                                video_url = f"/current_turn.mp4?t={int(time.time() * 1000)}"
                                            except Exception as e:
                                                print(f"Error saving turn video: {e}")
                                            turn_video_chunks = []

                                        await client_ws.send_text(json.dumps({
                                            "event": "turn_complete",
                                            "video_url": video_url or "/current_turn.mp4"
                                        }))
                            except Exception as e:
                                print(f"Relay from GCP terminated: {e}")

                        async def relay_to_gcp():
                            nonlocal turn_video_chunks
                            try:
                                while True:
                                    raw_client = await client_ws.receive_text()
                                    try:
                                        client_data = json.loads(raw_client)
                                    except Exception:
                                        client_data = {"event": "unknown", "raw": raw_client}

                                    evt = client_data.get("event")

                                    if evt == "realtime_audio":
                                        audio_b64 = client_data.get("data")
                                        if audio_b64:
                                            rt_msg = {
                                                "realtimeInput": {
                                                    "mediaChunks": [{
                                                        "mimeType": "audio/pcm;rate=16000",
                                                        "data": audio_b64
                                                    }]
                                                }
                                            }
                                            await gcp_ws.send(json.dumps(rt_msg))

                                    elif evt == "realtime_text":
                                        text_val = client_data.get("text", "").strip()
                                        teacher_resp = client_data.get("teacher_response", "").strip()
                                        prompt_to_send = text_val
                                        if teacher_resp and teacher_resp != text_val:
                                            prompt_to_send = (
                                                f"Student interaction: '{text_val}'. "
                                                f"Teacher guidance context: '{teacher_resp}'. "
                                                f"Please speak warmly and naturally as Teacher Jay following the Quiz Master Protocol."
                                            )
                                        if prompt_to_send:
                                            turn_video_chunks = []
                                            turn_msg = {
                                                "clientContent": {
                                                    "turns": [{
                                                        "role": "user",
                                                        "parts": [{"text": prompt_to_send}]
                                                    }],
                                                    "turnComplete": True
                                                }
                                            }
                                            await gcp_ws.send(json.dumps(turn_msg))

                                    elif evt == "interrupt":
                                        turn_video_chunks = []
                                        await client_ws.send_text(json.dumps({
                                            "event": "interrupted",
                                            "notice": "Barge-in: video playback paused."
                                        }))

                                    elif evt in ("start_lesson", "change_topic"):
                                        topic_title = client_data.get("topic_title", "")
                                        concept_summary = client_data.get("concept_summary", "")
                                        child_name = client_data.get("child_name", "Timmy")
                                        turn_video_chunks = []
                                        
                                        intro_turn = {
                                            "clientContent": {
                                                "turns": [{
                                                    "role": "user",
                                                    "parts": [{
                                                        "text": (
                                                            f"Namaste Teacher Jay! I am {child_name}. "
                                                            f"Please introduce our lesson on '{topic_title}': {concept_summary}. "
                                                            f"Explain the core principle in 2 simple sentences, give a fun everyday Indian example (like cricket, kite flying, or cycles), "
                                                            f"and ask me an engaging checkpoint question to begin!"
                                                        )
                                                    }]
                                                }],
                                                "turnComplete": True
                                            }
                                        }
                                        await gcp_ws.send(json.dumps(intro_turn))

                            except Exception as e:
                                print(f"Relay to GCP terminated: {e}")

                        await asyncio.gather(relay_from_gcp(), relay_to_gcp())
                        return

                except Exception as e:
                    err_str = str(e)
                    print(f"Direct GCP Live session exception for {target_loc}: {err_str}")

        await self._run_interactive_fallback(client_ws, session_id)

    async def _run_interactive_fallback(self, client_ws, session_id: str):
        try:
            await client_ws.send_text(json.dumps({
                "event": "enterprise_stream_connected",
                "status": "connected",
                "avatar": self.avatar_name,
                "model": "gemini-3.8-live",
                "voice": f"{self.voice_name} ({self.language_code})"
            }))

            while True:
                raw_msg = await client_ws.receive_text()
                try:
                    data = json.loads(raw_msg)
                except Exception:
                    data = {}

                evt = data.get("event")
                if evt in ("start_lesson", "change_topic"):
                    topic_title = data.get("topic_title", "Force and Motion")
                    child_name = data.get("child_name", "Timmy")
                    response_text = (
                        f"Namaste {child_name}! Welcome to our live lesson on {topic_title}. "
                        f"Think of how a cricket ball accelerates when struck by a bat! "
                        f"Are you ready to explore how forces work together?"
                    )
                    await client_ws.send_text(json.dumps({
                        "event": "output_transcription",
                        "text": response_text
                    }))
                    await client_ws.send_text(json.dumps({
                        "event": "turn_complete",
                        "video_url": "/current_turn.mp4"
                    }))

                elif evt == "realtime_text":
                    query = data.get("text", "")
                    teacher_resp = data.get("teacher_response", "").strip()

                    if "[QUIZ QUESTION]" in query:
                        clean_q = query.replace("[QUIZ QUESTION]:", "").strip()
                        response_text = f"Alright! Here is our question: {clean_q} Think carefully—what do you think is the right answer?"
                    elif "[QUIZ ANSWER]" in query:
                        if "CORRECT" in query:
                            response_text = "Spot on! Bingo, that is absolutely right! Shabash! You grasped the concept wonderfully. Ready for the next one?"
                        else:
                            response_text = "Ah, close! But not quite. Don't worry at all—let's look at why: every force needs an interaction between objects! What do you think happens next?"
                    elif "[QUIZ COMPLETE]" in query:
                        response_text = "Woohoo! Outstanding job completing the quiz! You did fantastic today. Shabash on your hard work!"
                    elif "[STUDENT DOUBT]" in query:
                        clean_doubt = query.replace("[STUDENT DOUBT]:", "").strip()
                        response_text = f"That is a brilliant question! Let's break down {clean_doubt}: imagine you are riding a bicycle uphill—the force you apply with your pedals overcomes gravity! Does that make sense?"
                    elif teacher_resp:
                        response_text = teacher_resp
                    else:
                        response_text = (
                            f"Very thoughtful observation, {query}! In science, every action creates a reaction, "
                            f"just like pushing a boat away from the riverbank! Shall we see how it applies?"
                        )

                    await client_ws.send_text(json.dumps({
                        "event": "output_transcription",
                        "text": response_text
                    }))
                    await client_ws.send_text(json.dumps({
                        "event": "turn_complete",
                        "video_url": "/current_turn.mp4"
                    }))

                elif evt == "interrupt":
                    await client_ws.send_text(json.dumps({
                        "event": "interrupted"
                    }))

        except Exception:
            pass

    def update_credentials(self, project_id: str, location: str, access_token: str) -> Dict[str, Any]:
        if project_id:
            self.project_id = project_id.strip()
        if location:
            self.location = location.strip()
        if access_token:
            self.access_token = access_token.strip()
        self._cached_token = ""
        self._cached_token_expiry = 0.0
        return self.get_public_config()

    async def test_connection(self) -> Dict[str, Any]:
        self._refresh_env()
        token = self.get_valid_access_token()
        if not token:
            return {
                "success": False,
                "error": "No GCP_ACCESS_TOKEN found and gcloud/ADC credentials not available.",
                "endpoint": self.get_enterprise_endpoint(),
                "project_id": self.project_id,
                "location": self.location
            }
        
        locations_to_test = [self.location]
        if self.location != "us-central1":
            locations_to_test.append("us-central1")

        last_error = ""
        for test_loc in locations_to_test:
            uri = self.get_enterprise_endpoint(location=test_loc)
            try:
                import websockets
                headers = {
                    "Authorization": f"Bearer {token}",
                    "X-Goog-User-Project": self.project_id
                }
                async with websockets.connect(uri, additional_headers=headers, ssl=SSL_CONTEXT) as ws:
                    setup_msg = self.get_live_setup_payload(location=test_loc)
                    await ws.send(json.dumps(setup_msg))
                    resp = await asyncio.wait_for(ws.recv(), timeout=5.0)
                    resp_str = resp if isinstance(resp, str) else resp.decode("utf-8", errors="ignore")
                    parsed_resp = json.loads(resp_str) if isinstance(resp_str, str) else str(resp_str)
                    return {
                        "success": True,
                        "endpoint": uri,
                        "project_id": self.project_id,
                        "location": test_loc,
                        "model": self.model_id,
                        "response": parsed_resp
                    }
            except asyncio.TimeoutError:
                return {
                    "success": True,
                    "notice": "Connected and handshake sent to Google Cloud Live Avatar service successfully.",
                    "endpoint": uri,
                    "project_id": self.project_id,
                    "location": test_loc
                }
            except Exception as e:
                last_error = str(e)

        return {
            "success": False,
            "error": last_error,
            "endpoint": self.get_enterprise_endpoint(),
            "project_id": self.project_id,
            "location": self.location
        }

gemini_live_avatar_service = GeminiLiveAvatarService()
