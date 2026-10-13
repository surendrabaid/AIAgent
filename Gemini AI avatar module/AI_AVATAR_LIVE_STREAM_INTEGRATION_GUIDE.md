# GCP Vertex AI Avatar Live Stream Flow Guide
### Real-Time Bidirectional Video & Audio Streaming with Gemini 3.8 Live (`gemini-3.8-live`)

---

## 1. Overview of the GCP Flow

This document details the exact **Google Cloud Platform (GCP) Vertex AI Avatar Live Stream flow** using the **Gemini 3.8 Live (`gemini-3.8-live`)** model.

The feature operates as a **full-duplex bidirectional WebSocket stream**:
1. Client sends a session setup configuration requesting the `VIDEO` modality and a named avatar.
2. GCP acknowledges and assigns a `sessionId`.
3. Client continuously streams raw user audio (`audio/pcm;rate=16000`).
4. GCP Vertex AI processes speech in real time and streams back **fragmented MP4 chunks (`video/mp4`)** containing lip-synced visual avatar video frames and synthesized spoken audio.
5. The browser feeds these fragmented MP4 chunks into **MediaSource Extensions (MSE)** for real-time video playback.

---

## 2. GCP Endpoint & Model Specifications

| Parameter | GCP Specification |
| :--- | :--- |
| **GCP Service** | Vertex AI Studio / Generative AI |
| **RPC Service Name** | `google.cloud.aiplatform.v1beta1.LlmBidiService` |
| **RPC Method** | `BidiGenerateContent` |
| **Protocol** | Secure WebSocket (`wss://`) |
| **Upstream WSS URL** | `wss://us-central1-aiplatform.googleapis.com//ws/google.cloud.aiplatform.v1beta1.LlmBidiService/BidiGenerateContent` |
| **Model Path** | `projects/{GCP_PROJECT_ID}/locations/{LOCATION}/publishers/google/models/gemini-3.8-live` |
| **Region** | `us-central1` (live avatar streaming cluster) |
| **Authentication** | Google Cloud OAuth2 Bearer Token in HTTP Upgrade headers |
| **Required IAM Role** | `roles/aiplatform.user` (Vertex AI User) |
| **Output Modality** | `responseModalities: ["VIDEO"]` |

---

## 3. End-to-End Sequence Diagram

```
 CLIENT (Browser)              LOCAL PROXY (Node.js)             GCP VERTEX AI
      │                                 │                              │
      │ 1. Connect ws://.../ws-proxy    │                              │
      │────────────────────────────────►│                              │
      │                                 │ 2. Fetch GCP OAuth2 Token    │
      │                                 │    (ADC / gcloud CLI)        │
      │                                 │                              │
      │                                 │ 3. WSS Upgrade + Bearer      │
      │                                 │    wss://us-central1-...     │
      │                                 │─────────────────────────────►│
      │                                 │                              │
      │ 4. WebSocket Established        │                              │
      │◄────────────────────────────────│                              │
      │                                 │                              │
      │ 5. SETUP FRAME                  │                              │
      │    model: gemini-3.8-live       │                              │
      │    modalities: ["VIDEO"]        │                              │
      │    avatar: "Jay", voice: fenrir │                              │
      │────────────────────────────────►│ 6. Inject Full Model Path    │
      │                                 │    projects/{ID}/...         │
      │                                 │─────────────────────────────►│
      │                                 │                              │
      │                                 │ 7. SETUP COMPLETE            │
      │                                 │    { sessionId: "..." }      │
      │ 8. Forward setupComplete        │◄─────────────────────────────│
      │◄────────────────────────────────│                              │
      │                                 │                              │
      │ ─── CONTINUOUS LIVE CONVERSATION LOOP ───────────────────────  │
      │                                 │                              │
      │ 9. USER AUDIO (16kHz PCM)       │                              │
      │    realtimeInput: mediaChunks   │                              │
      │────────────────────────────────►│─────────────────────────────►│
      │                                 │                              │
      │                                 │ 10. AVATAR STREAM CHUNKS     │
      │                                 │     parts: [inlineData:      │
      │                                 │       video/mp4; base64]     │
      │ 11. Forward video/mp4 chunks    │     outputTranscription      │
      │◄────────────────────────────────│◄─────────────────────────────│
      │                                 │                              │
      │ 12. MediaSource (MSE) Appends   │                              │
      │     SourceBuffer.appendBuffer() │                              │
      │     Native <video> plays avatar │                              │
      │                                 │                              │
      │ ─── BARGE-IN / INTERRUPTION (IF USER SPEAKS) ────────────────  │
      │                                 │                              │
      │ 13. USER SPEAKS (16kHz PCM)     │                              │
      │────────────────────────────────►│─────────────────────────────►│
      │                                 │ 14. INTERRUPTED SIGNAL       │
      │                                 │     serverContent.interrupted│
      │ 15. Clear MSE queue & stop talk │◄─────────────────────────────│
      │◄────────────────────────────────│                              │
      │                                 │                              │
      │                                 │ 16. TURN COMPLETE            │
      │ 17. Forward turnComplete        │     serverContent.turnComplete│
      │◄────────────────────────────────│◄─────────────────────────────│
```

---

## 4. Detailed Step-by-Step Flow

### Step 1: Upstream Authentication & WSS Handshake
Before sending any message frames, the proxy server establishes a secure WebSocket connection with Vertex AI, passing the GCP access token in the standard HTTP upgrade request headers:
```http
GET //ws/google.cloud.aiplatform.v1beta1.LlmBidiService/BidiGenerateContent HTTP/1.1
Host: us-central1-aiplatform.googleapis.com
Upgrade: websocket
Connection: Upgrade
Authorization: Bearer ya29.a0AX07...
Content-Type: application/json
```

---

### Step 2: Session Setup Frame (Client &rarr; GCP)
The very first frame sent over the WebSocket must be the **`setup`** frame. It defines:
- **Model**: Fully qualified project/location model resource path.
- **`responseModalities`**: Must include `"VIDEO"` to trigger the live avatar generator.
- **`speechConfig`**: Prebuilt voice model (`fenrir`, `kore`, `puck`, `zephyr`, or `charon`).
- **`avatarConfig`**: The visual avatar persona (`Jay`, `Carmen`, `Ben`, `Piper`, `Vera`).
- **`systemInstruction`**: The role, knowledge base, and behavioral guidelines for the avatar.

#### Payload Example:
```json
{
  "setup": {
    "model": "projects/my-gcp-project/locations/global/publishers/google/models/gemini-3.8-live",
    "generationConfig": {
      "responseModalities": [
        "VIDEO"
      ],
      "speechConfig": {
        "voiceConfig": {
          "prebuiltVoiceConfig": {
            "voiceName": "fenrir"
          }
        }
      }
    },
    "avatarConfig": {
      "avatarName": "Jay"
    },
    "systemInstruction": "You are a warm, interactive 1-on-1 AI Tutor...",
    "inputAudioTranscription": {},
    "outputAudioTranscription": {}
  }
}
```

---

### Step 3: Setup Confirmation (GCP &rarr; Client)
GCP validates credentials, allocates live TPU/GPU streaming workers, and returns a session confirmation:
```json
{
  "setupComplete": {
    "sessionId": "8a7061ff-0c2e-49c5-ae70-0c8006efcbe4"
  }
}
```
*Once received, the client activates microphone streaming.*

---

### Step 4: Real-Time Audio Streaming (Client &rarr; GCP)
The client records microphone audio via Web Audio API, downsamples it to **16,000 Hz single-channel**, encodes it into **16-bit signed Little-Endian linear PCM**, and streams chunks over the socket:
```json
{
  "realtimeInput": {
    "mediaChunks": [
      {
        "mimeType": "audio/pcm;rate=16000",
        "data": "AP///wEAAAD9//7/..."
      }
    ]
  }
}
```
*Optional*: If camera sharing is enabled, 768px JPEG frames are sent at 1 FPS:
```json
{
  "realtimeInput": {
    "mediaChunks": [
      {
        "mimeType": "image/jpeg",
        "data": "/9j/4AAQSkZJRgABAQAAAQ..."
      }
    ]
  }
}
```

---

### Step 5: Real-Time Fragmented MP4 Video Delivery (GCP &rarr; Client)
When the model produces a response, GCP streams back sequential **fragmented MP4 segments (`video/mp4`)** via `serverContent.modelTurn.parts`:

#### Payload Example:
```json
{
  "serverContent": {
    "modelTurn": {
      "parts": [
        {
          "inlineData": {
            "mimeType": "video/mp4",
            "data": "AAAAHGZ0eXBkYXNoAAAAAGlzbzZhdmMxbXA0MQAABKltb29mAAAA..."
          }
        }
      ]
    },
    "outputTranscription": {
      "text": "Hello! I am ready to guide you."
    }
  }
}
```

#### Media Attributes of the Returned Stream:
- **Container**: Fragmented MP4 (`ftyp` + `moof` + `mdat` boxes per chunk).
- **Video Track**: H.264 / AVC (`avc1.42E01E`).
- **Audio Track**: AAC audio (`mp4a.40.2`).
- **Synchronization**: The audio and video tracks are multiplexed together in the MP4 fragment, ensuring lip-sync alignment.

---

### Step 6: Client Playback via MediaSource Extensions (MSE)
The browser feeds incoming base64 video chunks directly to the `<video>` element using HTML5 MediaSource Extensions:

1. **Initialize SourceBuffer**:
   ```javascript
   const mediaSource = new MediaSource();
   videoElement.src = URL.createObjectURL(mediaSource);

   mediaSource.addEventListener('sourceopen', () => {
     const sourceBuffer = mediaSource.addSourceBuffer('video/mp4; codecs="avc1.42E01E, mp4a.40.2"');
     sourceBuffer.mode = 'sequence'; // Appends sequentially
   });
   ```

2. **Append Incoming Fragments**:
   ```javascript
   function onVideoChunkReceived(base64Data) {
     const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
     sourceBuffer.appendBuffer(binaryData.buffer);
   }
   ```

3. **Buffer Hygiene**:
   To prevent high memory consumption during long live sessions, chunks older than 5 seconds behind the playhead are pruned:
   ```javascript
   if (videoElement.currentTime > 6 && !sourceBuffer.updating) {
     sourceBuffer.remove(0, videoElement.currentTime - 5);
   }
   ```

---

### Step 7: Natural Barge-in & Interruption Handling
If the student interrupts the avatar by speaking:
1. GCP Vertex AI voice activity detection (VAD) detects user speech.
2. GCP immediately halts video generation and returns an interruption flag:
   ```json
   {
     "serverContent": {
       "interrupted": true
     }
   }
   ```
3. The client immediately discards unplayed queued video fragments, stops the talking animation, and resumes listening mode.

---

### Step 8: Turn Completion
When the avatar finishes answering the current turn, GCP emits:
```json
{
  "serverContent": {
    "turnComplete": true
  }
}
```
The avatar settles into its idle/listening state waiting for the next student query.

---

## 5. Summary Checklist of GCP Requirements

- [x] **Project ID**: Configured with Vertex AI enabled (`aiplatform.googleapis.com`).
- [x] **Authentication**: OAuth2 access token with `https://www.googleapis.com/auth/cloud-platform` scope.
- [x] **WSS Endpoint**: `wss://us-central1-aiplatform.googleapis.com//ws/google.cloud.aiplatform.v1beta1.LlmBidiService/BidiGenerateContent`.
- [x] **Model**: `publishers/google/models/gemini-3.8-live`.
- [x] **Modality**: `"responseModalities": ["VIDEO"]`.
- [x] **Audio In**: `audio/pcm;rate=16000` (16-bit Linear PCM Little-Endian).
- [x] **Video Out**: `video/mp4` rendered via MediaSource Extensions (`SourceBuffer.mode = 'sequence'`).
