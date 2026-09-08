export function speak(text: string, onEnd?: () => void): void {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'fr-FR';
  utterance.rate = 1;
  utterance.pitch = 1;
  const voices = window.speechSynthesis.getVoices();
  const frenchVoice = voices.find((voice) => voice.lang === 'fr-FR') || voices.find((voice) => voice.lang.startsWith('fr'));
  if (frenchVoice) utterance.voice = frenchVoice;
  utterance.onend = () => onEnd?.();
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking(): void {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

export function isSpeechSupported(): boolean {
  return 'speechSynthesis' in window;
}

interface SpeechRecognitionResultLike {
  resultIndex?: number;
  results: {
    length: number;
    [index: number]: { [index: number]: { transcript: string }; isFinal: boolean };
  };
}

interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: SpeechRecognitionResultLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition || w.webkitSpeechRecognition || null) as (new () => SpeechRecognitionLike) | null;
}

export function isListeningSupported(): boolean {
  return getRecognitionCtor() !== null;
}

export interface VoiceListener {
  stop(): void;
}

export function listen(
  onResult: (transcript: string, isFinal: boolean) => void,
  onEnd: () => void,
  onError?: (error: string) => void,
): VoiceListener | null {
  const Ctor = getRecognitionCtor();
  if (!Ctor) return null;

  const recognition = new Ctor();
  recognition.lang = 'fr-FR';
  recognition.interimResults = true;
  recognition.continuous = false;

  recognition.onresult = (event) => {
    let finalTranscript = '';
    let interimTranscript = '';
    for (let i = event.resultIndex || 0; i < event.results.length; i++) {
      const result = event.results[i];
      const transcript = result[0].transcript;
      if (result.isFinal) finalTranscript += transcript;
      else interimTranscript += transcript;
    }
    if (finalTranscript) onResult(finalTranscript.trim(), true);
    else if (interimTranscript) onResult(interimTranscript.trim(), false);
  };
  recognition.onerror = (event) => onError?.(event.error);
  recognition.onend = () => onEnd();

  try {
    recognition.start();
  } catch (error) {
    onError?.(error instanceof Error ? error.message : 'Impossible de démarrer le micro.');
    return null;
  }

  return {
    stop: () => {
      try {
        recognition.stop();
      } catch {
        recognition.abort();
      }
    },
  };
}
