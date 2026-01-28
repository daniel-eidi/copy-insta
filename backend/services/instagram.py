import os
import uuid
import asyncio
from pathlib import Path
import yt_dlp


class InstagramDownloader:
    def __init__(self, upload_dir: str = "./uploads"):
        self.upload_dir = Path(upload_dir)
        self.upload_dir.mkdir(parents=True, exist_ok=True)

    async def download_reel(self, url: str) -> tuple[str, str]:
        """
        Download Instagram Reel video.
        Returns tuple of (job_id, video_path)
        """
        job_id = str(uuid.uuid4())
        output_path = self.upload_dir / f"{job_id}.mp4"

        ydl_opts = {
            'format': 'best[ext=mp4]/best',
            'outtmpl': str(output_path),
            'quiet': True,
            'no_warnings': True,
            'extract_flat': False,
        }

        try:
            # Run yt-dlp in a thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(
                None,
                lambda: self._download_sync(url, ydl_opts)
            )

            if not output_path.exists():
                raise Exception("Download failed - file not created")

            return job_id, str(output_path)

        except Exception as e:
            raise Exception(f"Failed to download Instagram Reel: {str(e)}")

    def _download_sync(self, url: str, ydl_opts: dict):
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])

    def get_video_path(self, job_id: str) -> str:
        """Get the path for a video by job_id"""
        video_path = self.upload_dir / f"{job_id}.mp4"
        if video_path.exists():
            return str(video_path)
        raise FileNotFoundError(f"Video not found for job_id: {job_id}")
