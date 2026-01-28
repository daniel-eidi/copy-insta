# Copy Insta - Developer Guide

## Project Overview
Webapp that converts Instagram Reels into karaoke-style videos with word-by-word synchronized text, distinct colors per speaker, and original audio.

## Architecture

### Backend (Python FastAPI)
- **Location**: `backend/`
- **Entry point**: `main.py`
- **Port**: 8000

#### Key Services
- `services/instagram.py` - Downloads reels using yt-dlp
- `services/transcription.py` - Extracts audio and transcribes using OpenAI Whisper API
- `services/speaker_detection.py` - Detects speaker changes based on pauses
- `services/video_generator.py` - Generates karaoke video using MoviePy + PIL

#### API Endpoints
- `POST /api/download-reel` - Download Instagram Reel by URL
- `POST /api/upload` - Upload video file
- `GET /api/status/{job_id}` - Get job status and transcription
- `GET /api/speakers/{job_id}` - Get speaker info
- `POST /api/generate-video` - Generate karaoke video
- `GET /api/download/{job_id}` - Download generated video

### Frontend (React + Vite)
- **Location**: `frontend/`
- **Port**: 5173

#### Components
- `InputForm.jsx` - URL input and file upload
- `ProcessingStatus.jsx` - Progress indicator
- `SpeakerEditor.jsx` - Edit speaker colors and settings
- `VideoPreview.jsx` - Preview and download result

## Development Setup

### Backend
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env  # Add your OPENAI_API_KEY
python main.py
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Environment Variables
- `OPENAI_API_KEY` - Required for Whisper transcription
- `UPLOAD_DIR` - Directory for uploaded videos (default: ./uploads)
- `OUTPUT_DIR` - Directory for generated videos (default: ./outputs)
- `MAX_VIDEO_DURATION_SECONDS` - Max video length (default: 120)

## Key Dependencies
- **yt-dlp**: Instagram video download
- **OpenAI Whisper API**: Word-level transcription
- **MoviePy + PIL**: Video generation
- **pydub + FFmpeg**: Audio extraction

## Processing Flow
1. User provides URL or uploads video
2. Backend extracts audio using pydub/FFmpeg
3. Whisper API transcribes with word-level timestamps
4. Speaker detection analyzes pauses to identify speakers
5. User customizes speaker colors
6. VideoGenerator creates karaoke video frame-by-frame
7. User downloads result
