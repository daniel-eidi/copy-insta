from typing import List
from models.schemas import WordTimestamp, TranscriptionSegment


# Default speaker colors
SPEAKER_COLORS = [
    "#FF6B6B",  # Coral red
    "#4ECDC4",  # Turquoise
    "#FFE66D",  # Yellow
    "#95E1D3",  # Mint green
    "#DDA0DD",  # Plum/Lilac
    "#F7DC6F",  # Gold
    "#87CEEB",  # Sky blue
    "#FFA07A",  # Light salmon
]


class SpeakerDetectionService:
    def __init__(self, pause_threshold: float = 0.8):
        """
        Initialize speaker detection service.

        Args:
            pause_threshold: Minimum pause duration (seconds) to consider
                           as potential speaker change
        """
        self.pause_threshold = pause_threshold

    def detect_speakers(self, words: List[WordTimestamp]) -> tuple[List[WordTimestamp], List[TranscriptionSegment]]:
        """
        Detect speaker changes based on pause analysis.

        Strategy:
        - Pauses > pause_threshold indicate potential speaker change
        - Assigns alternating speaker IDs when significant pauses detected

        Returns:
            Tuple of (words with speaker_id, segments grouped by speaker)
        """
        if not words:
            return [], []

        # Assign speaker IDs to words
        current_speaker = 0
        words_with_speakers = []

        for i, word in enumerate(words):
            if i > 0:
                # Calculate pause between this word and previous
                pause = word.start - words[i-1].end

                if pause > self.pause_threshold:
                    # Significant pause - potential speaker change
                    current_speaker = (current_speaker + 1) % len(SPEAKER_COLORS)

            word_with_speaker = WordTimestamp(
                word=word.word,
                start=word.start,
                end=word.end,
                speaker_id=current_speaker
            )
            words_with_speakers.append(word_with_speaker)

        # Group words into segments by speaker
        segments = self._group_into_segments(words_with_speakers)

        return words_with_speakers, segments

    def _group_into_segments(self, words: List[WordTimestamp]) -> List[TranscriptionSegment]:
        """Group consecutive words by the same speaker into segments"""
        if not words:
            return []

        segments = []
        current_segment_words = [words[0]]
        current_speaker = words[0].speaker_id

        for word in words[1:]:
            if word.speaker_id == current_speaker:
                current_segment_words.append(word)
            else:
                # Speaker changed - save current segment
                segments.append(TranscriptionSegment(
                    words=current_segment_words,
                    speaker_id=current_speaker,
                    start=current_segment_words[0].start,
                    end=current_segment_words[-1].end
                ))
                # Start new segment
                current_segment_words = [word]
                current_speaker = word.speaker_id

        # Don't forget the last segment
        if current_segment_words:
            segments.append(TranscriptionSegment(
                words=current_segment_words,
                speaker_id=current_speaker,
                start=current_segment_words[0].start,
                end=current_segment_words[-1].end
            ))

        return segments

    def get_speaker_color(self, speaker_id: int) -> str:
        """Get the default color for a speaker"""
        return SPEAKER_COLORS[speaker_id % len(SPEAKER_COLORS)]

    def get_unique_speakers(self, words: List[WordTimestamp]) -> List[int]:
        """Get list of unique speaker IDs from words"""
        return list(set(w.speaker_id for w in words if w.speaker_id is not None))
