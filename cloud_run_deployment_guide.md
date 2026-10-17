# Deploying MyTutor to Google Cloud Run 🚀

This repository is configured to deploy as a unified, production-grade container on **Google Cloud Run**.

The deployment packages:
1. **React + Vite Frontend**: Compiled production SPA served directly via Nginx.
2. **FastAPI Python Backend**: Runs on internal port `8000` via Uvicorn, serving Socratic curriculum endpoints and `/ws/lesson/{session_id}`.
3. **Gemini Live Avatar Node Proxy**: Runs on internal port `5001` via Express + WS, proxying real-time Vertex AI WebSocket streaming (`/ws-proxy`) and `/api-proxy`.
4. **Nginx Reverse Proxy & Supervisor**: Listens on Cloud Run's `$PORT` (default `8080`), routing traffic to the frontend and internal services.

---

## 🔑 Environment Variables Reference

| Variable Name | Required | Description | Sample / Default |
| :--- | :---: | :--- | :--- |
| `GEMINI_API_KEY` | **Yes** | Google Gemini API Key for Socratic lesson planning & doubts | `AIzaSy...` |
| `GOOGLE_CLOUD_PROJECT` | **Yes** | GCP Project ID for Vertex AI Gemini Live streaming | `project-9691fa52-ebb2-43ba-9de` |
| `GOOGLE_CLOUD_LOCATION` | **Yes** | Vertex AI Studio Region (Live Avatar cluster) | `us-central1` |
| `GCP_PROJECT_ID` | Optional | Alias for `GOOGLE_CLOUD_PROJECT` | `project-9691fa52-ebb2-43ba-9de` |
| `GCP_LOCATION` | Optional | Alias for `GOOGLE_CLOUD_LOCATION` | `us-central1` |
| `PROXY_HEADER` | Optional | Security verification token for avatar proxy | `OfUuo8fWvy9fauNWD0FePECzm9koL2g2` |
| `GCP_SERVICE_ACCOUNT_JSON` | Optional | Service account JSON string for auto-refreshing Vertex AI OAuth tokens | `'{"type":"authorized_user",...}'` |
| `GCP_ACCESS_TOKEN` | Optional | Manual OAuth2 access token for testing | `ya29...` |

---

## Method 1: Deploying Directly via Google Cloud CLI (`gcloud`)

This is the fastest method to deploy directly from your local terminal. Google Cloud Build packages the source code, builds the container image in the cloud, and deploys it to Cloud Run.

```bash
gcloud run deploy mytutor \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 2Gi \
  --cpu 2 \
  --timeout 3600 \
  --set-env-vars="GEMINI_API_KEY=<YOUR_GEMINI_API_KEY>,GOOGLE_CLOUD_PROJECT=project-9691fa52-ebb2-43ba-9de,GOOGLE_CLOUD_LOCATION=us-central1,GCP_PROJECT_ID=project-9691fa52-ebb2-43ba-9de,GCP_LOCATION=us-central1,PROXY_HEADER=OfUuo8fWvy9fauNWD0FePECzm9koL2g2"
```

> [!TIP]
> If you wish to pass your full service account credentials string or manual access token, append:
> `,GCP_SERVICE_ACCOUNT_JSON='<YOUR_JSON_STRING>',GCP_ACCESS_TOKEN=<YOUR_TOKEN>`

---

## Method 2: Continuous Deployment from GitHub

Google Cloud Run can automatically pull from your GitHub repository and build your container on every git push:

1. Go to the [Google Cloud Run Console](https://console.cloud.google.com/run).
2. Click **Create Service**.
3. Select **Continuously deploy new revisions from a source repository**.
4. Click **Set up with Cloud Build**:
   - **Provider**: GitHub
   - **Repository**: Select `surendrabaid/AIAgent`
   - **Branch**: `^dev$`
   - **Build Type**: `Dockerfile` (automatically detects `/Dockerfile`)
5. Under **Authentication**, choose **Allow unauthenticated invocations**.
6. Under **Container(s), Volumes, Networking, Security**:
   - **Container port**: `8080`
   - **Memory**: `2 GiB`
   - **CPU**: `2`
   - Under **Variables & Secrets**, add the environment variables listed in the table above.
7. Click **Create**.
