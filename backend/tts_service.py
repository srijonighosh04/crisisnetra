"""
tts_service.py - Google Cloud Text-to-Speech for CrisisNetra
"""
import os
import logging

logger = logging.getLogger(__name__)


class TTSService:
    def __init__(self):
        self.project_id = os.getenv("GOOGLE_CLOUD_PROJECT", "rescuenet-ai")

    async def synthesize(self, text: str, language: str = "en-IN") -> bytes:
        try:
            from google.cloud import texttospeech
            client = texttospeech.TextToSpeechAsyncClient()
            synthesis_input = texttospeech.SynthesisInput(text=text)
            voice = texttospeech.VoiceSelectionParams(
                language_code=language,
                ssml_gender=texttospeech.SsmlVoiceGender.NEUTRAL,
            )
            audio_config = texttospeech.AudioConfig(audio_encoding=texttospeech.AudioEncoding.MP3)
            response = await client.synthesize_speech(input=synthesis_input, voice=voice, audio_config=audio_config)
            logger.info(f"TTS synthesized {len(text)} chars in {language}")
            return response.audio_content
        except Exception as e:
            logger.error(f"TTS synthesis failed: {e}")
            return b""
