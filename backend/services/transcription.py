import os
import asyncio
from pathlib import Path
from typing import List
import tempfile
from openai import OpenAI
from pydub import AudioSegment

from models.schemas import WordTimestamp


class TranscriptionService:
    def __init__(self):
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    async def extract_audio(self, video_path: str) -> str:
        """Extract audio from video file using pydub/ffmpeg"""
        video_path = Path(video_path)
        audio_path = video_path.with_suffix('.mp3')

        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            None,
            lambda: self._extract_audio_sync(str(video_path), str(audio_path))
        )

        return str(audio_path)

    def _extract_audio_sync(self, video_path: str, audio_path: str):
        """Synchronous audio extraction"""
        audio = AudioSegment.from_file(video_path)
        audio.export(audio_path, format="mp3")

    async def transcribe(self, audio_path: str) -> tuple[List[WordTimestamp], float]:
        """
        Transcribe audio using OpenAI Whisper API with word-level timestamps.
        Returns tuple of (words, duration)
        """
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: self._transcribe_sync(audio_path)
        )
        return result

    def _transcribe_sync(self, audio_path: str) -> tuple[List[WordTimestamp], float]:
        """Synchronous transcription"""
        with open(audio_path, "rb") as audio_file:
            response = self.client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                response_format="verbose_json",
                timestamp_granularities=["word"]
            )

        words = []
        if hasattr(response, 'words') and response.words:
            for word_data in response.words:
                words.append(WordTimestamp(
                    word=word_data.word,
                    start=word_data.start,
                    end=word_data.end
                ))

        duration = response.duration if hasattr(response, 'duration') else 0.0

        return words, duration

    async def transcribe_video(self, video_path: str) -> tuple[List[WordTimestamp], float]:
        """
        Full pipeline: extract audio and transcribe.
        Returns tuple of (words, duration)
        """
        audio_path = await self.extract_audio(video_path)
        try:
            words, duration = await self.transcribe(audio_path)
            return words, duration
        finally:
            # Cleanup audio file
            if os.path.exists(audio_path):
                os.remove(audio_path)
