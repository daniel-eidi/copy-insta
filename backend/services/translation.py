import os
import asyncio
from typing import List
from openai import OpenAI

from models.schemas import WordTimestamp


class TranslationService:
    def __init__(self):
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    async def translate_words(
        self,
        words: List[WordTimestamp],
        target_language: str = "Portuguese"
    ) -> List[WordTimestamp]:
        """
        Translate words while preserving timestamps.
        Groups words into sentences for better translation quality.
        """
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: self._translate_sync(words, target_language)
        )
        return result

    def _translate_sync(
        self,
        words: List[WordTimestamp],
        target_language: str
    ) -> List[WordTimestamp]:
        """Synchronous translation"""

        # Get full text
        full_text = " ".join(w.word for w in words)

        # Translate using GPT
        response = self.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": f"""You are a translator. Translate the following text to {target_language}.

IMPORTANT RULES:
1. Keep the same number of words as much as possible
2. If you need to add/remove words, try to maintain similar pacing
3. Return ONLY the translated text, nothing else
4. Keep proper punctuation"""
                },
                {
                    "role": "user",
                    "content": full_text
                }
            ],
            temperature=0.3
        )

        translated_text = response.choices[0].message.content.strip()
        translated_words = translated_text.split()

        # Map translated words back to timestamps
        # Strategy: distribute timestamps proportionally
        translated_timestamps = []

        if len(translated_words) == 0:
            return words

        # Calculate total duration
        total_start = words[0].start
        total_end = words[-1].end
        total_duration = total_end - total_start

        # Distribute time among translated words
        time_per_word = total_duration / len(translated_words)

        for i, word in enumerate(translated_words):
            start = total_start + (i * time_per_word)
            end = start + time_per_word

            # Find corresponding original speaker_id
            original_idx = min(int(i * len(words) / len(translated_words)), len(words) - 1)
            speaker_id = words[original_idx].speaker_id

            translated_timestamps.append(WordTimestamp(
                word=word,
                start=start,
                end=end,
                speaker_id=speaker_id
            ))

        return translated_timestamps

    async def translate_text(self, text: str, target_language: str = "Portuguese") -> str:
        """Simple text translation"""
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: self._translate_text_sync(text, target_language)
        )
        return result

    def _translate_text_sync(self, text: str, target_language: str) -> str:
        """Synchronous text translation"""
        response = self.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": f"Translate the following text to {target_language}. Return only the translation."
                },
                {
                    "role": "user",
                    "content": text
                }
            ],
            temperature=0.3
        )
        return response.choices[0].message.content.strip()
