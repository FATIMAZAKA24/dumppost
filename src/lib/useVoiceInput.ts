import { useState } from 'react';

export function useVoiceInput(onTranscript: (text: string) => void) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

  const handleMicToggle = async () => {
    if (isRecording) {
      mediaRecorder?.stop();
      setIsRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setTranscribing(true);

        try {
          const formData = new FormData();
          formData.append('file', blob, 'recording.webm');

          const res = await fetch('/api/transcribe', {
            method: 'POST',
            body: formData,
          });

          const data = await res.json();
          if (data.text) onTranscript(data.text);
        } catch (e) {
          console.error('Transcription failed:', e);
        }
        setTranscribing(false);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch {
      alert('Microphone access denied. Please allow microphone access and try again.');
    }
  };

  return { isRecording, transcribing, handleMicToggle };
}