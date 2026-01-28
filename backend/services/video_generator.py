import os
import asyncio
from pathlib import Path
from typing import List, Dict, Optional, Callable
from moviepy import VideoFileClip, AudioFileClip, TextClip, CompositeVideoClip, ColorClip, VideoClip
import numpy as np

from models.schemas import WordTimestamp, SpeakerConfig


# Default speaker colors
DEFAULT_SPEAKER_COLORS = [
    "#FF6B6B",  # Coral red
    "#4ECDC4",  # Turquoise
    "#FFE66D",  # Yellow
    "#95E1D3",  # Mint green
    "#DDA0DD",  # Plum/Lilac
    "#F7DC6F",  # Gold
]


class KaraokeVideoGenerator:
    def __init__(self, output_dir: str = "./outputs"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

        # Video settings
        self.width = 1080
        self.height = 1920  # Vertical video (9:16)
        self.fps = 30
        self.font = "Arial-Bold"
        self.font_size = 60
        self.highlight_font_size = 72

    def hex_to_rgb(self, hex_color: str) -> tuple:
        """Convert hex color to RGB tuple"""
        hex_color = hex_color.lstrip('#')
        return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

    def get_speaker_color(self, speaker_id: int, speaker_configs: Optional[List[SpeakerConfig]] = None) -> str:
        """Get color for a speaker"""
        if speaker_configs:
            for config in speaker_configs:
                if config.speaker_id == speaker_id:
                    return config.color
        return DEFAULT_SPEAKER_COLORS[speaker_id % len(DEFAULT_SPEAKER_COLORS)]

    async def generate_karaoke_video(
        self,
        video_path: str,
        words: List[WordTimestamp],
        job_id: str,
        speaker_configs: Optional[List[SpeakerConfig]] = None,
        background_color: str = "#000000",
        highlight_color: str = "#FFFFFF",
        progress_callback: Optional[Callable[[float], None]] = None
    ) -> str:
        """
        Generate karaoke-style video with synchronized text.

        Args:
            video_path: Path to original video
            words: List of words with timestamps and speaker IDs
            job_id: Unique job identifier
            speaker_configs: Optional speaker color configurations
            background_color: Background color (hex)
            highlight_color: Highlight color for current word (hex)
            progress_callback: Optional callback for progress updates

        Returns:
            Path to generated video
        """
        output_path = self.output_dir / f"{job_id}_karaoke.mp4"

        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            None,
            lambda: self._generate_video_sync(
                video_path, words, str(output_path),
                speaker_configs, background_color, highlight_color,
                progress_callback
            )
        )

        return str(output_path)

    async def generate_karaoke_from_audio(
        self,
        audio_path: str,
        words: List[WordTimestamp],
        job_id: str,
        speaker_configs: Optional[List[SpeakerConfig]] = None,
        background_color: str = "#000000",
        highlight_color: str = "#FFFFFF",
        progress_callback: Optional[Callable[[float], None]] = None
    ) -> str:
        """
        Generate karaoke-style video from audio file with synchronized text.

        Args:
            audio_path: Path to audio file
            words: List of words with timestamps and speaker IDs
            job_id: Unique job identifier
            speaker_configs: Optional speaker color configurations
            background_color: Background color (hex)
            highlight_color: Highlight color for current word (hex)
            progress_callback: Optional callback for progress updates

        Returns:
            Path to generated video
        """
        output_path = self.output_dir / f"{job_id}_karaoke.mp4"

        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            None,
            lambda: self._generate_video_from_audio_sync(
                audio_path, words, str(output_path),
                speaker_configs, background_color, highlight_color,
                progress_callback
            )
        )

        return str(output_path)

    def _generate_video_from_audio_sync(
        self,
        audio_path: str,
        words: List[WordTimestamp],
        output_path: str,
        speaker_configs: Optional[List[SpeakerConfig]],
        background_color: str,
        highlight_color: str,
        progress_callback: Optional[Callable[[float], None]]
    ):
        """Synchronous video generation from audio file"""
        from pydub import AudioSegment
        import tempfile
        import time

        # Convert webm to mp3 if needed (moviepy has issues with webm)
        converted_audio_path = audio_path
        temp_mp3_path = None

        if audio_path.endswith('.webm'):
            temp_mp3_path = os.path.join(tempfile.gettempdir(), f"audio_{int(time.time())}.mp3")
            audio_segment = AudioSegment.from_file(audio_path, format='webm')
            audio_segment.export(temp_mp3_path, format='mp3')
            converted_audio_path = temp_mp3_path

        audio = None
        final_video = None
        text_video = None

        try:
            # Load audio
            audio = AudioFileClip(converted_audio_path)
            duration = audio.duration

            # Create background
            bg_rgb = self.hex_to_rgb(background_color)

            # Pre-calculate subtitle segments for movie-style display
            subtitle_segments = self._group_words_into_subtitle_segments(words)

            # Create text clips for each frame (movie-style subtitles)
            def make_frame(t):
                """Generate frame at time t with movie-style subtitles"""
                frame = self._render_movie_subtitle_frame(
                    words, subtitle_segments, t, bg_rgb
                )
                return frame

            # Create video with text overlay using make_frame
            text_video = VideoClip(make_frame, duration=duration)
            text_video = text_video.with_fps(self.fps)

            # Add audio
            final_video = text_video.with_audio(audio)

            # Write output
            final_video.write_videofile(
                output_path,
                fps=self.fps,
                codec='libx264',
                audio_codec='aac',
                threads=4,
                preset='medium',
                logger=None  # Suppress moviepy output
            )

        finally:
            # Cleanup in reverse order
            if final_video:
                try:
                    final_video.close()
                except:
                    pass
            if text_video:
                try:
                    text_video.close()
                except:
                    pass
            if audio:
                try:
                    audio.close()
                except:
                    pass

            # Clean up temp file if created (ignore errors on Windows)
            if temp_mp3_path:
                try:
                    if os.path.exists(temp_mp3_path):
                        os.remove(temp_mp3_path)
                except:
                    pass  # Ignore deletion errors on Windows

    def _generate_video_sync(
        self,
        video_path: str,
        words: List[WordTimestamp],
        output_path: str,
        speaker_configs: Optional[List[SpeakerConfig]],
        background_color: str,
        highlight_color: str,
        progress_callback: Optional[Callable[[float], None]]
    ):
        """Synchronous video generation"""
        # Load original video for audio
        original_video = VideoFileClip(video_path)
        duration = original_video.duration
        audio = original_video.audio

        # Create background
        bg_rgb = self.hex_to_rgb(background_color)
        background = ColorClip(
            size=(self.width, self.height),
            color=bg_rgb,
            duration=duration
        )

        # Group words into lines (max ~5 words per line for readability)
        lines = self._group_words_into_lines(words, max_words_per_line=5)

        # Create text clips for each frame
        def make_frame(t):
            """Generate frame at time t"""
            # Find current word index
            current_word_idx = self._get_current_word_index(words, t)

            # Get context window of words to display
            context_words = self._get_context_words(words, current_word_idx, window=10)

            # Create frame with text
            frame = self._render_text_frame(
                context_words, current_word_idx, t,
                speaker_configs, highlight_color, bg_rgb
            )

            return frame

        # Create video with text overlay using make_frame
        text_video = VideoClip(make_frame, duration=duration)
        text_video = text_video.with_fps(self.fps)

        # Add audio
        final_video = text_video.set_audio(audio)

        # Write output
        final_video.write_videofile(
            output_path,
            fps=self.fps,
            codec='libx264',
            audio_codec='aac',
            threads=4,
            preset='medium',
            logger=None  # Suppress moviepy output
        )

        # Cleanup
        original_video.close()
        final_video.close()

    def _group_words_into_lines(self, words: List[WordTimestamp], max_words_per_line: int = 5) -> List[List[WordTimestamp]]:
        """Group words into display lines"""
        lines = []
        current_line = []

        for word in words:
            current_line.append(word)
            if len(current_line) >= max_words_per_line:
                lines.append(current_line)
                current_line = []

        if current_line:
            lines.append(current_line)

        return lines

    def _get_current_word_index(self, words: List[WordTimestamp], t: float) -> int:
        """Find the index of the word being spoken at time t"""
        for i, word in enumerate(words):
            if word.start <= t <= word.end:
                return i
            if word.start > t:
                return max(0, i - 1)
        return len(words) - 1

    def _get_context_words(self, words: List[WordTimestamp], current_idx: int, window: int = 10) -> List[WordTimestamp]:
        """Get words around current position for display"""
        start = max(0, current_idx - window // 2)
        end = min(len(words), current_idx + window // 2 + 1)
        return words[start:end]

    def _group_words_into_subtitle_segments(self, words: List[WordTimestamp], max_words: int = 8, max_duration: float = 4.0) -> List[dict]:
        """Group words into subtitle segments for movie-style display"""
        segments = []
        current_segment = []

        for word in words:
            current_segment.append(word)

            # Check if we should end this segment
            segment_text = " ".join(w.word for w in current_segment)
            segment_duration = current_segment[-1].end - current_segment[0].start if current_segment else 0

            # End segment if: too many words, too long, or ends with punctuation
            ends_with_punct = word.word.rstrip().endswith(('.', '!', '?', ',', ';', ':'))

            if len(current_segment) >= max_words or segment_duration >= max_duration or ends_with_punct:
                segments.append({
                    'words': current_segment,
                    'text': segment_text,
                    'start': current_segment[0].start,
                    'end': current_segment[-1].end
                })
                current_segment = []

        # Don't forget the last segment
        if current_segment:
            segments.append({
                'words': current_segment,
                'text': " ".join(w.word for w in current_segment),
                'start': current_segment[0].start,
                'end': current_segment[-1].end
            })

        return segments

    def _get_current_subtitle(self, segments: List[dict], t: float) -> Optional[dict]:
        """Get the subtitle segment that should be displayed at time t"""
        for segment in segments:
            if segment['start'] <= t <= segment['end'] + 0.3:  # Small buffer for readability
                return segment
        return None

    def _render_movie_subtitle_frame(
        self,
        words: List[WordTimestamp],
        subtitle_segments: List[dict],
        t: float,
        bg_rgb: tuple
    ) -> np.ndarray:
        """Render a single frame with movie-style subtitles at the bottom"""
        from PIL import Image, ImageDraw, ImageFont

        # Create image
        img = Image.new('RGB', (self.width, self.height), bg_rgb)
        draw = ImageDraw.Draw(img)

        # Get current subtitle
        current_subtitle = self._get_current_subtitle(subtitle_segments, t)

        if not current_subtitle:
            return np.array(img)

        # Font setup - large for movie subtitles
        subtitle_font_size = 96
        try:
            font = ImageFont.truetype("arialbd.ttf", subtitle_font_size)
        except:
            try:
                font = ImageFont.truetype("arial.ttf", subtitle_font_size)
            except:
                font = ImageFont.load_default()

        text = current_subtitle['text']

        # Word wrap if text is too long
        max_width = self.width - 80  # Padding on sides
        lines = self._wrap_text(draw, text, font, max_width)

        # Calculate position (bottom of screen with padding)
        line_height = subtitle_font_size + 10
        total_height = len(lines) * line_height
        start_y = self.height - total_height - 120  # 120px from bottom

        # Determine text/outline colors based on background brightness
        # Calculate luminance: 0.299*R + 0.587*G + 0.114*B
        bg_luminance = 0.299 * bg_rgb[0] + 0.587 * bg_rgb[1] + 0.114 * bg_rgb[2]
        is_light_background = bg_luminance > 128

        # Draw each line with outline (movie subtitle style)
        if is_light_background:
            # Light background: black text with white outline
            text_color = (0, 0, 0)
            outline_color = (255, 255, 255)
        else:
            # Dark background: white text with black outline
            text_color = (255, 255, 255)
            outline_color = (0, 0, 0)
        outline_width = 3

        for line_idx, line in enumerate(lines):
            # Calculate centered position
            bbox = draw.textbbox((0, 0), line, font=font)
            line_width = bbox[2] - bbox[0]
            x = (self.width - line_width) // 2
            y = start_y + line_idx * line_height

            # Draw outline (text with offset in all directions)
            for dx in range(-outline_width, outline_width + 1):
                for dy in range(-outline_width, outline_width + 1):
                    if dx != 0 or dy != 0:
                        draw.text((x + dx, y + dy), line, font=font, fill=outline_color)

            # Draw main text
            draw.text((x, y), line, font=font, fill=text_color)

        return np.array(img)

    def _wrap_text(self, draw, text: str, font, max_width: int) -> List[str]:
        """Wrap text to fit within max_width"""
        words = text.split()
        lines = []
        current_line = []

        for word in words:
            test_line = ' '.join(current_line + [word])
            bbox = draw.textbbox((0, 0), test_line, font=font)

            if bbox[2] - bbox[0] <= max_width:
                current_line.append(word)
            else:
                if current_line:
                    lines.append(' '.join(current_line))
                current_line = [word]

        if current_line:
            lines.append(' '.join(current_line))

        return lines if lines else ['']

    def _render_text_frame(
        self,
        context_words: List[WordTimestamp],
        current_word_idx: int,
        t: float,
        speaker_configs: Optional[List[SpeakerConfig]],
        highlight_color: str,
        bg_rgb: tuple
    ) -> np.ndarray:
        """Render a single frame with karaoke text (legacy method)"""
        from PIL import Image, ImageDraw, ImageFont

        # Create image
        img = Image.new('RGB', (self.width, self.height), bg_rgb)
        draw = ImageDraw.Draw(img)

        try:
            font = ImageFont.truetype("arial.ttf", self.font_size)
            highlight_font = ImageFont.truetype("arialbd.ttf", self.highlight_font_size)
        except:
            font = ImageFont.load_default()
            highlight_font = font

        # Group context words into lines
        lines = self._group_words_into_lines(context_words, max_words_per_line=4)

        # Calculate total height
        line_height = self.highlight_font_size + 20
        total_height = len(lines) * line_height
        start_y = (self.height - total_height) // 2

        # Draw each line
        for line_idx, line_words in enumerate(lines):
            y = start_y + line_idx * line_height

            # Calculate line width for centering
            line_text = " ".join(w.word for w in line_words)
            bbox = draw.textbbox((0, 0), line_text, font=font)
            line_width = bbox[2] - bbox[0]
            x = (self.width - line_width) // 2

            # Draw each word in the line
            for word in line_words:
                speaker_id = word.speaker_id if word.speaker_id is not None else 0
                base_color = self.get_speaker_color(speaker_id, speaker_configs)
                base_rgb = self.hex_to_rgb(base_color)

                # Determine word state
                is_current = word.start <= t <= word.end
                is_past = word.end < t
                is_future = word.start > t

                if is_current:
                    # Current word - highlighted
                    color = self.hex_to_rgb(highlight_color)
                    current_font = highlight_font
                elif is_past:
                    # Past word - slightly dimmed
                    color = tuple(int(c * 0.7) for c in base_rgb)
                    current_font = font
                else:
                    # Future word - more dimmed
                    color = tuple(int(c * 0.4) for c in base_rgb)
                    current_font = font

                # Draw word
                draw.text((x, y), word.word, font=current_font, fill=color)

                # Move x position
                word_bbox = draw.textbbox((0, 0), word.word + " ", font=current_font)
                x += word_bbox[2] - word_bbox[0]

        return np.array(img)

    def get_output_path(self, job_id: str) -> str:
        """Get the output path for a job"""
        return str(self.output_dir / f"{job_id}_karaoke.mp4")
