import { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, Square, Sparkles, Volume2 } from 'lucide-react';
import type { DocumentItem } from '@/lib/types';
import { askGlobalQuestion } from '@/lib/ai';
import { listen, speak, stopSpeaking, isListeningSupported, type VoiceListener } from '@/lib/speech';

interface DashboardVoiceWidgetProps {
  documents: DocumentItem[];
}

const QUICK_PROMPTS = [
  'Quelles factures dois-je payer cette semaine ?',
  'Quelle est ma prochaine échéance ?',
  'Montre les documents qui nécessitent mon attention',
];

function getVoiceErrorMessage(error: string): string {
  if (error === 'not-allowed' || error === 'permission-denied') {
    return 'Micro bloqué. Autorisez le microphone dans le navigateur puis réessayez.';
  }
  if (error === 'no-speech') {
    return 'Je n’ai rien entendu. Rapprochez-vous du micro et réessayez.';
  }
  if (error === 'audio-capture') {
    return 'Aucun microphone détecté sur cet appareil.';
  }
  if (error === 'network') {
    return 'La reconnaissance vocale du navigateur n’est pas disponible pour le moment.';
  }
  return 'Impossible de démarrer la commande vocale. Réessayez dans Chrome ou Edge.';
}

export function DashboardVoiceWidget({ documents }: DashboardVoiceWidgetProps) {
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastAnswer, setLastAnswer] = useState<{ question: string; answer: string } | null>(null);
  const [voiceError, setVoiceError] = useState('');
  const listenerRef = useRef<VoiceListener | null>(null);

  const listeningSupported = isListeningSupported();

  const handleTranscript = useCallback(async (transcript: string) => {
    setIsThinking(true);
    const { answer } = await askGlobalQuestion(transcript, documents);
    setIsThinking(false);
    setLastAnswer({ question: transcript, answer });
    setIsSpeaking(true);
    speak(answer, () => setIsSpeaking(false));
  }, [documents]);

  const startListening = useCallback(() => {
    stopSpeaking();
    setIsSpeaking(false);
    setInterimText('');
    setVoiceError('');
    const listener = listen(
      (transcript, isFinal) => {
        if (isFinal) {
          setInterimText('');
          void handleTranscript(transcript);
        } else {
          setInterimText(transcript);
        }
      },
      () => setIsListening(false),
      (error) => {
        setIsListening(false);
        setVoiceError(getVoiceErrorMessage(error));
      },
    );
    if (listener) {
      listenerRef.current = listener;
      setIsListening(true);
    } else {
      setVoiceError('Impossible de démarrer le micro. Vérifiez l’autorisation du navigateur.');
    }
  }, [handleTranscript]);

  const stopListening = useCallback(() => {
    listenerRef.current?.stop();
    listenerRef.current = null;
    setIsListening(false);
  }, []);

  const toggleListening = () => {
    if (isListening) stopListening();
    else startListening();
  };

  useEffect(() => () => {
    listenerRef.current?.stop();
    stopSpeaking();
  }, []);

  if (!listeningSupported) return null;

  return (
    <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
          <Mic className="h-3.5 w-3.5 text-white" />
        </div>
        <span className="text-sm font-bold text-ink-800">Commande vocale</span>
        <span className="text-[10px] text-ink-400">Interrogez vos documents à voix haute</span>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={toggleListening}
          className={`relative shrink-0 h-14 w-14 rounded-full flex items-center justify-center shadow-lg transition-all ${
            isListening ? 'bg-danger-500 shadow-danger-500/30' : 'bg-gradient-to-br from-primary-600 to-primary-700 shadow-primary-600/30 hover:scale-105'
          }`}
        >
          {isListening && <span className="absolute inset-0 rounded-full bg-danger-500/40 animate-ping" />}
          {isListening ? <Square className="h-5 w-5 text-white relative" /> : <Mic className="h-6 w-6 text-white relative" />}
        </button>

        <div className="flex-1 min-w-0">
          {isListening && <p className="text-xs font-medium text-ink-600">Écoute en cours... {interimText && <span className="italic text-ink-400">"{interimText}"</span>}</p>}
          {!isListening && isThinking && <p className="text-xs font-medium text-ink-500">Analyse de vos documents...</p>}
          {!isListening && !isThinking && lastAnswer && (
            <div className="flex items-start gap-1.5">
              {isSpeaking ? <Volume2 className="h-3.5 w-3.5 text-primary-600 shrink-0 mt-0.5 animate-pulse-soft" /> : <Sparkles className="h-3.5 w-3.5 text-primary-600 shrink-0 mt-0.5" />}
              <p className="text-xs text-ink-700 line-clamp-2">{lastAnswer.answer}</p>
            </div>
          )}
          {!isListening && !isThinking && !lastAnswer && (
            <p className="text-xs text-ink-500">Touchez le micro et posez une question sur votre courrier.</p>
          )}
          {voiceError && <p className="mt-1 text-xs font-medium text-danger-600">{voiceError}</p>}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mt-4">
        {QUICK_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            onClick={() => void handleTranscript(prompt)}
            className="text-[11px] font-medium px-2.5 py-1.5 bg-ink-50 rounded-lg border border-ink-200/60 hover:border-primary-300 hover:bg-primary-50/50 transition-all text-ink-600 hover:text-primary-700"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}


