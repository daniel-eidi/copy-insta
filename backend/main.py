import os
import uuid
import shutil
from pathlib import Path
from typing import Dict, Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv

from models.schemas import (
    DownloadRequest, JobStatus, JobStatusResponse, TranscriptionResponse,
    VideoGenerationRequest, UploadResponse, WordTimestamp, TranscriptionSegment,
    SpeakerConfig
)
from services.instagram import InstagramDownloader
from services.transcription import TranscriptionService
from services.speaker_detection import SpeakerDetectionService, SPEAKER_COLORS
from services.video_generator import KaraokeVideoGenerator
from services.translation import TranslationService


# Load environment variables
load_dotenv()

# Configuration
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads")
OUTPUT_DIR = os.getenv("OUTPUT_DIR", "./outputs")
MAX_VIDEO_DURATION = int(os.getenv("MAX_VIDEO_DURATION_SECONDS", 120))

# Create directories
Path(UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
Path(OUTPUT_DIR).mkdir(parents=True, exist_ok=True)

# In-memory job storage (in production, use Redis or database)
jobs: Dict[str, dict] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("Starting Copy Insta Backend...")
    yield
    # Shutdown
    print("Shutting down...")


app = FastAPI(
    title="Copy Insta API",
    description="Convert Instagram Reels to karaoke-style videos",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware - allow Vercel and local development
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://*.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for production (Vercel rewrites handle security)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files for outputs
app.mount("/outputs", StaticFiles(directory=OUTPUT_DIR), name="outputs")

# Initialize services
instagram_downloader = InstagramDownloader(UPLOAD_DIR)
transcription_service = TranscriptionService()
speaker_detection = SpeakerDetectionService()
video_generator = KaraokeVideoGenerator(OUTPUT_DIR)
translation_service = TranslationService()


def update_job_status(job_id: str, status: JobStatus, progress: float = 0.0, message: str = None, **kwargs):
    """Update job status in storage"""
    if job_id in jobs:
        jobs[job_id].update({
            "status": status,
            "progress": progress,
            "message": message,
            **kwargs
        })


async def process_audio_job(job_id: str, audio_path: str):
    """Background task to process audio-only file"""
    try:
        update_job_status(job_id, JobStatus.TRANSCRIBING, 30, "Transcribing with Whisper...")
        words, duration = await transcription_service.transcribe(audio_path)

        # Step 2: Detect speakers
        update_job_status(job_id, JobStatus.DETECTING_SPEAKERS, 60, "Detecting speakers...")
        words_with_speakers, segments = speaker_detection.detect_speakers(words)

        # Store transcription results
        jobs[job_id]["words"] = [w.model_dump() for w in words_with_speakers]
        jobs[job_id]["segments"] = [s.model_dump() for s in segments]
        jobs[job_id]["duration"] = duration
        jobs[job_id]["audio_path"] = audio_path
        jobs[job_id]["audio_only"] = True

        # Get unique speakers
        unique_speakers = speaker_detection.get_unique_speakers(words_with_speakers)
        jobs[job_id]["speakers"] = [
            {"speaker_id": s, "color": SPEAKER_COLORS[s % len(SPEAKER_COLORS)]}
            for s in unique_speakers
        ]

        update_job_status(
            job_id, JobStatus.COMPLETED, 100,
            "Transcription complete!"
        )

    except Exception as e:
        update_job_status(job_id, JobStatus.FAILED, 0, f"Error: {str(e)}")


async def process_video_job(job_id: str, video_path: str):
    """Background task to process video"""
    try:
        # Step 1: Extract audio and transcribe
        update_job_status(job_id, JobStatus.EXTRACTING_AUDIO, 10, "Extracting audio...")

        update_job_status(job_id, JobStatus.TRANSCRIBING, 30, "Transcribing with Whisper...")
        words, duration = await transcription_service.transcribe_video(video_path)

        # Step 2: Detect speakers
        update_job_status(job_id, JobStatus.DETECTING_SPEAKERS, 60, "Detecting speakers...")
        words_with_speakers, segments = speaker_detection.detect_speakers(words)

        # Store transcription results
        jobs[job_id]["words"] = [w.model_dump() for w in words_with_speakers]
        jobs[job_id]["segments"] = [s.model_dump() for s in segments]
        jobs[job_id]["duration"] = duration
        jobs[job_id]["video_path"] = video_path

        # Get unique speakers
        unique_speakers = speaker_detection.get_unique_speakers(words_with_speakers)
        jobs[job_id]["speakers"] = [
            {"speaker_id": s, "color": SPEAKER_COLORS[s % len(SPEAKER_COLORS)]}
            for s in unique_speakers
        ]

        update_job_status(
            job_id, JobStatus.COMPLETED, 100,
            "Transcription complete! Ready to generate video."
        )

    except Exception as e:
        update_job_status(job_id, JobStatus.FAILED, 0, f"Error: {str(e)}")


async def generate_video_job(job_id: str, speaker_configs: list = None, background_color: str = "#000000", highlight_color: str = "#FFFFFF"):
    """Background task to generate karaoke video"""
    try:
        update_job_status(job_id, JobStatus.GENERATING_VIDEO, 10, "Starting video generation...")

        # Get job data
        job = jobs.get(job_id)
        if not job:
            raise Exception("Job not found")

        video_path = job.get("video_path")
        words_data = job.get("words", [])
        words = [WordTimestamp(**w) for w in words_data]

        # Convert speaker configs
        configs = None
        if speaker_configs:
            configs = [SpeakerConfig(**c) if isinstance(c, dict) else c for c in speaker_configs]

        def progress_callback(progress: float):
            update_job_status(job_id, JobStatus.GENERATING_VIDEO, 10 + progress * 0.8)

        # Generate video
        output_path = await video_generator.generate_karaoke_video(
            video_path=video_path,
            words=words,
            job_id=job_id,
            speaker_configs=configs,
            background_color=background_color,
            highlight_color=highlight_color,
            progress_callback=progress_callback
        )

        # Store result
        jobs[job_id]["output_path"] = output_path
        jobs[job_id]["result_url"] = f"/outputs/{job_id}_karaoke.mp4"

        update_job_status(
            job_id, JobStatus.COMPLETED, 100,
            "Video generated successfully!"
        )

    except Exception as e:
        update_job_status(job_id, JobStatus.FAILED, 0, f"Error generating video: {str(e)}")


@app.get("/")
async def root():
    return {"message": "Copy Insta API", "version": "1.0.0"}


@app.post("/api/download-reel", response_model=UploadResponse)
async def download_reel(request: DownloadRequest, background_tasks: BackgroundTasks):
    """Download Instagram Reel and start processing"""
    try:
        # Download video
        job_id, video_path = await instagram_downloader.download_reel(request.url)

        # Initialize job
        jobs[job_id] = {
            "job_id": job_id,
            "status": JobStatus.DOWNLOADING,
            "progress": 0,
            "message": "Download complete, starting processing...",
            "source": "instagram",
            "url": request.url
        }

        # Start background processing
        background_tasks.add_task(process_video_job, job_id, video_path)

        return UploadResponse(job_id=job_id, message="Download started")

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/upload-audio", response_model=UploadResponse)
async def upload_audio(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    """Upload audio file (from browser capture) and start processing"""
    # Generate job ID and save file
    job_id = str(uuid.uuid4())

    # Determine extension from content type
    ext = ".webm" if "webm" in (file.content_type or "") else ".mp3"
    audio_path = Path(UPLOAD_DIR) / f"{job_id}{ext}"

    try:
        with open(audio_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

    # Initialize job
    jobs[job_id] = {
        "job_id": job_id,
        "status": JobStatus.PENDING,
        "progress": 0,
        "message": "Audio received, starting transcription...",
        "source": "browser_capture",
        "filename": file.filename
    }

    # Start background processing (audio only)
    background_tasks.add_task(process_audio_job, job_id, str(audio_path))

    return UploadResponse(job_id=job_id, message="Audio upload successful, processing started")


@app.post("/api/upload", response_model=UploadResponse)
async def upload_video(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    """Upload video file and start processing"""
    # Validate file type
    if not file.content_type or not file.content_type.startswith("video/"):
        raise HTTPException(status_code=400, detail="File must be a video")

    # Generate job ID and save file
    job_id = str(uuid.uuid4())
    video_path = Path(UPLOAD_DIR) / f"{job_id}.mp4"

    try:
        with open(video_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

    # Initialize job
    jobs[job_id] = {
        "job_id": job_id,
        "status": JobStatus.PENDING,
        "progress": 0,
        "message": "Upload complete, starting processing...",
        "source": "upload",
        "filename": file.filename
    }

    # Start background processing
    background_tasks.add_task(process_video_job, job_id, str(video_path))

    return UploadResponse(job_id=job_id, message="Upload successful, processing started")


@app.get("/api/status/{job_id}", response_model=JobStatusResponse)
async def get_job_status(job_id: str):
    """Get job status and results"""
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")

    job = jobs[job_id]

    response = JobStatusResponse(
        job_id=job_id,
        status=job.get("status", JobStatus.PENDING),
        progress=job.get("progress", 0),
        message=job.get("message"),
        result_url=job.get("result_url")
    )

    # Include transcription if available
    if "words" in job and "segments" in job:
        response.transcription = TranscriptionResponse(
            job_id=job_id,
            words=[WordTimestamp(**w) for w in job["words"]],
            segments=[TranscriptionSegment(**s) for s in job["segments"]],
            duration=job.get("duration", 0)
        )

    return response


@app.get("/api/speakers/{job_id}")
async def get_speakers(job_id: str):
    """Get speaker information for a job"""
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")

    job = jobs[job_id]
    return {
        "speakers": job.get("speakers", []),
        "available_colors": SPEAKER_COLORS
    }


@app.post("/api/generate-video")
async def generate_video(request: VideoGenerationRequest, background_tasks: BackgroundTasks):
    """Generate karaoke video with custom settings"""
    if request.job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")

    job = jobs[request.job_id]

    if "words" not in job:
        raise HTTPException(status_code=400, detail="Transcription not yet complete")

    # Update status
    update_job_status(request.job_id, JobStatus.GENERATING_VIDEO, 0, "Starting video generation...")

    # Convert speaker configs to dicts for background task
    speaker_configs = None
    if request.speaker_configs:
        speaker_configs = [c.model_dump() for c in request.speaker_configs]

    # Start video generation
    background_tasks.add_task(
        generate_video_job,
        request.job_id,
        speaker_configs,
        request.background_color,
        request.highlight_color
    )

    return {"message": "Video generation started", "job_id": request.job_id}


@app.get("/api/download/{job_id}")
async def download_video(job_id: str):
    """Download generated video"""
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")

    job = jobs[job_id]
    output_path = job.get("output_path")

    if not output_path or not Path(output_path).exists():
        raise HTTPException(status_code=404, detail="Video not yet generated")

    return FileResponse(
        path=output_path,
        media_type="video/mp4",
        filename=f"karaoke_{job_id}.mp4"
    )


async def generate_audio_video_job(
    job_id: str,
    translate: bool = False,
    target_language: str = "Portuguese",
    background_color: str = "#000000",
    highlight_color: str = "#FFFFFF"
):
    """Background task to generate karaoke video from audio transcription"""
    try:
        update_job_status(job_id, JobStatus.GENERATING_VIDEO, 10, "Preparing video generation...")

        job = jobs.get(job_id)
        if not job:
            raise Exception("Job not found")

        audio_path = job.get("audio_path")
        words_data = job.get("words", [])
        words = [WordTimestamp(**w) for w in words_data]

        # Translate if requested
        if translate:
            update_job_status(job_id, JobStatus.GENERATING_VIDEO, 20, f"Translating to {target_language}...")
            words = await translation_service.translate_words(words, target_language)

        update_job_status(job_id, JobStatus.GENERATING_VIDEO, 40, "Generating video frames...")

        # Generate video from audio
        output_path = await video_generator.generate_karaoke_from_audio(
            audio_path=audio_path,
            words=words,
            job_id=job_id,
            speaker_configs=None,
            background_color=background_color,
            highlight_color=highlight_color
        )

        # Store result
        jobs[job_id]["output_path"] = output_path
        jobs[job_id]["result_url"] = f"/outputs/{job_id}_karaoke.mp4"

        update_job_status(
            job_id, JobStatus.COMPLETED, 100,
            "Video generated successfully!"
        )

    except Exception as e:
        update_job_status(job_id, JobStatus.FAILED, 0, f"Error generating video: {str(e)}")


@app.post("/api/generate-audio-video")
async def generate_audio_video(background_tasks: BackgroundTasks, job_id: str, translate: bool = False, target_language: str = "Portuguese"):
    """Generate karaoke video from audio transcription with optional translation"""
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")

    job = jobs[job_id]

    if "words" not in job:
        raise HTTPException(status_code=400, detail="Transcription not yet complete")

    if "audio_path" not in job:
        raise HTTPException(status_code=400, detail="This job does not have audio data")

    # Update status
    update_job_status(job_id, JobStatus.GENERATING_VIDEO, 0, "Starting video generation...")

    # Start video generation
    background_tasks.add_task(
        generate_audio_video_job,
        job_id,
        translate,
        target_language,
        "#000000",
        "#FFFFFF"
    )

    return {"message": "Video generation started", "job_id": job_id}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
