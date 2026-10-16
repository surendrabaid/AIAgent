import os
import json
import logging
import threading
import subprocess
from typing import Optional, List, Dict, Any

import google.auth
from google.oauth2 import service_account
from google.auth.transport.requests import Request

logger = logging.getLogger("gcp_token_provider")
if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("[%(asctime)s] [%(name)s] [%(levelname)s] %(message)s"))
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)


class GCPTokenProvider:
    """
    Production-grade, thread-safe GCP OAuth2 Token Provider (Strategy 3).
    
    Manages the lifecycle of Google Cloud OAuth2 access tokens:
    - Auto-refreshes tokens before expiration without server restarts or downtime
    - Thread-safe token acquisition via mutex lock
    - Multi-environment resolution hierarchy:
      1. GCP_SERVICE_ACCOUNT_JSON (Inline JSON string for PaaS/Docker/Kubernetes secrets)
      2. GOOGLE_APPLICATION_CREDENTIALS (Standard GCP service account file path)
      3. Google Application Default Credentials / Metadata Server (Cloud Run, GKE, Compute Engine)
      4. gcloud CLI fallback (developer local machines)
    """
    _instance: Optional["GCPTokenProvider"] = None
    _singleton_lock = threading.Lock()

    def __new__(cls, *args, **kwargs):
        with cls._singleton_lock:
            if cls._instance is None:
                cls._instance = super(GCPTokenProvider, cls).__new__(cls)
                cls._instance._initialized = False
            return cls._instance

    def __init__(self, scopes: Optional[List[str]] = None):
        if getattr(self, "_initialized", False):
            return

        self.scopes = scopes or ["https://www.googleapis.com/auth/cloud-platform"]
        self._lock = threading.Lock()
        self._request = Request()
        self._credentials = None
        self._detected_project_id = ""
        self._manual_token_override: Optional[str] = None
        self._gcloud_cached_token = ""
        self._gcloud_cached_expiry = 0.0

        self._init_credentials()
        self._initialized = True

    def _init_credentials(self) -> None:
        """Initializes Google credentials using the production priority chain."""
        # Priority 1: Service Account JSON string in environment variable (GCP_SERVICE_ACCOUNT_JSON)
        sa_json = os.getenv("GCP_SERVICE_ACCOUNT_JSON", "").strip()
        if sa_json:
            try:
                info = json.loads(sa_json)
                self._credentials = service_account.Credentials.from_service_account_info(
                    info, scopes=self.scopes
                )
                self._detected_project_id = info.get("project_id", "")
                logger.info("[GCPTokenProvider] Successfully initialized via GCP_SERVICE_ACCOUNT_JSON.")
                return
            except Exception as e:
                logger.error(f"[GCPTokenProvider] Failed to parse GCP_SERVICE_ACCOUNT_JSON: {e}")

        # Priority 2: Service Account file path via GOOGLE_APPLICATION_CREDENTIALS or ADC
        # This handles Cloud Run, GKE, Compute Engine metadata server, and local ADC
        try:
            creds, project_id = google.auth.default(scopes=self.scopes)
            self._credentials = creds
            if project_id:
                self._detected_project_id = project_id
            logger.info(f"[GCPTokenProvider] Successfully initialized via Google ADC (project: {project_id or 'auto'}).")
            return
        except Exception as e:
            logger.warning(f"[GCPTokenProvider] Application Default Credentials not available: {e}")

        self._credentials = None

    def get_token(self) -> str:
        """
        Retrieves a valid OAuth2 access token.
        Guarantees that the returned token is fresh and valid.
        If expired or missing, refreshes it automatically using a thread-safe mutex.
        """
        with self._lock:
            # 1. Primary: Auto-refreshing Google Credentials (Production)
            if self._credentials:
                try:
                    # credentials.valid is False if expired or not yet refreshed
                    if not self._credentials.valid:
                        logger.info("[GCPTokenProvider] Refreshing GCP access token...")
                        self._credentials.refresh(self._request)

                    if self._credentials.token:
                        return self._credentials.token
                except Exception as e:
                    logger.error(f"[GCPTokenProvider] Failed refreshing credentials: {e}")
                    # Attempt re-initialization once in case credentials refreshed externally
                    try:
                        self._init_credentials()
                        if self._credentials:
                            self._credentials.refresh(self._request)
                            if self._credentials.token:
                                return self._credentials.token
                    except Exception:
                        pass

            # 2. Secondary: Fallback to gcloud CLI for local development if ADC was not initialized
            import time
            now = time.time()
            if self._gcloud_cached_token and now < self._gcloud_cached_expiry:
                return self._gcloud_cached_token

            try:
                token = subprocess.check_output(
                    ["gcloud", "auth", "print-access-token"],
                    text=True,
                    stderr=subprocess.DEVNULL,
                    timeout=5
                ).strip()
                if token:
                    self._gcloud_cached_token = token
                    self._gcloud_cached_expiry = now + (45 * 60)  # Cache for 45 minutes
                    logger.info("[GCPTokenProvider] Acquired fresh token via gcloud CLI fallback.")
                    return token
            except Exception:
                pass

            # 3. Tertiary: Manual token override (if set via UI or testing)
            if self._manual_token_override:
                return self._manual_token_override

            return ""

    def get_project_id(self) -> str:
        """Returns detected project ID from credentials or environment."""
        env_project = os.getenv("GCP_PROJECT_ID") or os.getenv("GOOGLE_CLOUD_PROJECT", "")
        if env_project and env_project.strip():
            return env_project.strip()
        return self._detected_project_id

    def set_manual_token_override(self, token: Optional[str]) -> None:
        """Allows runtime overrides (e.g., from settings modal or debugging)."""
        with self._lock:
            self._manual_token_override = token.strip() if token else None

    def get_auth_headers(self, user_project: Optional[str] = None) -> Dict[str, str]:
        """Convenience method to construct Authorization and X-Goog-User-Project headers."""
        token = self.get_token()
        proj = user_project or self.get_project_id()
        headers = {}
        if token:
            headers["Authorization"] = f"Bearer {token}"
        if proj:
            headers["X-Goog-User-Project"] = proj
        return headers


# Global singleton instance for use across the entire application
token_provider = GCPTokenProvider()
