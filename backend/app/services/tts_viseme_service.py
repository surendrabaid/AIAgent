import re
from typing import List
from app.models.schemas import VisemeFrame

class TTSVisemeService:
    def __init__(self):
        pass

    def generate_visemes_for_text(self, text: str, total_duration_ms: int = 5000) -> List[VisemeFrame]:
        """
        Generates millisecond-accurate viseme mouth shape frames for avatar lip-sync.
        Maps words and phonemes to visual mouth opening & widening parameters.
        """
        words = re.findall(r'\b\w+\b', text)
        if not words:
            return [VisemeFrame(time_ms=0, viseme="REST", mouth_open=0.0, mouth_wide=0.2)]

        time_per_word = max(150, int(total_duration_ms / max(len(words), 1)))
        frames: List[VisemeFrame] = []
        current_time = 0

        # Start at rest
        frames.append(VisemeFrame(time_ms=0, viseme="REST", mouth_open=0.0, mouth_wide=0.2))

        for word in words:
            clean_word = word.lower()
            chars = list(clean_word)
            time_per_char = max(40, int(time_per_word / max(len(chars), 1)))

            for idx, char in enumerate(chars):
                viseme, open_val, wide_val = self._map_char_to_viseme(char)
                frames.append(VisemeFrame(
                    time_ms=current_time,
                    viseme=viseme,
                    mouth_open=open_val,
                    mouth_wide=wide_val
                ))
                current_time += time_per_char

            # Brief pause between words
            current_time += 30
            frames.append(VisemeFrame(
                time_ms=current_time,
                viseme="REST",
                mouth_open=0.1,
                mouth_wide=0.3
            ))

        return frames

    def _map_char_to_viseme(self, char: str) -> tuple[str, float, float]:
        """
        Maps a character/phoneme to (Viseme Code, Mouth Openness 0..1, Mouth Width 0..1)
        """
        if char in 'aáàâä':
            return ("A", 0.8, 0.4)
        elif char in 'eéèêëiíìîï':
            return ("E", 0.5, 0.9)
        elif char in 'oóòôö':
            return ("O", 0.9, 0.2)
        elif char in 'uúùûüw':
            return ("O", 0.6, 0.1)
        elif char in 'mbp':
            return ("M", 0.05, 0.3)
        elif char in 'fv':
            return ("F", 0.2, 0.5)
        elif char in 'szt':
            return ("E", 0.3, 0.7)
        elif char in 'rnl':
            return ("A", 0.4, 0.5)
        else:
            return ("REST", 0.2, 0.4)

tts_viseme_service = TTSVisemeService()
