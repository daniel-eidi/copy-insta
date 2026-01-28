from pydantic import BaseModel
from typing import List, Optional
from enum import Enum


class JobStatus(str, Enum):
    PENDING = "pending"
    DOWNLOADING = "downloading"
    EXTRACTING_AUDIO = "extracting_audio"
    TRANSCRIBING = "transcribing"
    DETECTING_SPEAKERS = "detecting_speakers"
    GENERATING_VIDEO = "generating_video"
    COMPLETED = "completed"
    FAILED = "failed"


class WordTimestamp(BaseModel):
    word: str
    start: float
    end: float
    speaker_id: Optional[int] = None


class TranscriptionSegment(BaseModel):
    words: List[WordTimestamp]
    speaker_id: int
    start: float
    end: float


class SpeakerConfig(BaseModel):
    speaker_id: int
    color: str
    name: Optional[str] = None


class DownloadRequest(BaseModel):
    url: str


class TranscriptionResponse(BaseModel):
    job_id: str
    words: List[WordTimestamp]
    segments: List[TranscriptionSegment]
    duration: float


class VideoGenerationRequest(BaseModel):
    job_id: str
    speaker_configs: Optional[List[SpeakerConfig]] = None
    background_color: str = "#000000"
    highlight_color: str = "#FFFFFF"


class JobStatusResponse(BaseModel):
    job_id: str
    status: JobStatus
    progress: float
    message: Optional[str] = None
    result_url: Optional[str] = None
    transcription: Optional[TranscriptionResponse] = None


class UploadResponse(BaseModel):
    job_id: str
    message: str
