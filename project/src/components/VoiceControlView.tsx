import { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, Square, Sparkles, Volume2, VolumeX, User } from 'lucide-react';
import type { DocumentItem } from '@/lib/types';
import { askGlobalQuestion } from '@/lib/ai';
import { listen, speak, stopSpeaking, isSpeechSupported, isListeningSupported, type VoiceListener } from '@/lib/speech';
import type { View } from './Sidebar';

interface VoiceControlViewProps {
  documents: DocumentItem[];
  onNavigate: (view: View) => void;
}

interface ConversationEntry {
  id: string;
  question: string;
  answer: string;
}

const NAV_COMMANDS: { view: View; phrases: string[]; label: string }[] = [
  { view: 'dashboard', phrases: ['tableau de bord', 'accueil', 'dashboard', 'home'], label: 'Ouverture du tableau de bord' },
  { view: 'courriers', phrases: ['documents', 'courriers', 'registre', 'registre intelligent', 'mon courrier'], label: 'Ouverture du registre intelligent' },
  { view: 'achats', phrases: ['factures', 'achats', 'cotations', 'demandes de cotation', 'proformas'], label: 'Ouverture des demandes de cotation' },
  { view: 'dossiers', phrases: ['dossiers', 'projets', 'espaces projets'], label: 'Ouverture des dossiers et projets' },
  { view: 'taches', phrases: ['taches', 'tâches', 'travail', 'a traiter', 'à traiter'], label: 'Ouverture des tâches' },
  { view: 'assistant', phrases: ['copilote', 'assistant', 'ia', 'recherche intelligente', 'recherche'], label: 'Ouverture du copilote IA' },
  { view: 'archive', phrases: ['archives', 'archivage'], label: 'Ouverture des archives' },
];

const SUGGESTED_COMMANDS = [
  'Quelles factures dois-je payer cette semaine ?',
  'Quelle est ma prochaine échéance ?',
  'Montre les documents qui nécessitent mon attention',
];
function matchNavigationCommand(transcript: string): View | null {
  const t = transcript.toLowerCase().trim();
  const isNavPhrase = /^(open|go to|show|take me to|ouvre|ouvrir|va à|montre|affiche|emmène-moi)\b/.test(t) || NAV_COMMANDS.some((c) => c.phrases.some((p) => t === p));
  if (!isNavPhrase) return null;
  for (const cmd of NAV_COMMANDS) {
    if (cmd.phrases.some((p) => t.includes(p))) return cmd.view;
  }
  return null;
}

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

export default function VoiceControlView({ documents, onNavigate }: VoiceControlViewProps) {
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [conversation, setConversation] = useState<ConversationEntry[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [voiceError, setVoiceError] = useState('');
  const listenerRef = useRef<VoiceListener | null>(null);
  const autoSpeakRef = useRef(autoSpeak);
  autoSpeakRef.current = autoSpeak;

  const listeningSupported = isListeningSupported();
  const speechSupported = isSpeechSupported();

  const handleTranscript = useCallback(async (transcript: string) => {
    const navTarget = matchNavigationCommand(transcript);
    if (navTarget) {
      onNavigate(navTarget);
      const cmd = NAV_COMMANDS.find((c) => c.view === navTarget)!;
      const entry: ConversationEntry = { id: crypto.randomUUID(), question: transcript, answer: cmd.label + '.' };
      setConversation((prev) => [...prev, entry]);
      if (autoSpeakRef.current) speak(entry.answer, () => setIsSpeaking(false));
      return;
    }

    const { answer } = await askGlobalQuestion(transcript, documents);
    const entry: ConversationEntry = { id: crypto.randomUUID(), question: transcript, answer };
    setConversation((prev) => [...prev, entry]);
    if (autoSpeakRef.current) {
      setIsSpeaking(true);
      speak(answer, () => setIsSpeaking(false));
    }
  }, [documents, onNavigate]);

  const startListening = useCallback(() => {
    stopSpeaking();
    setIsSpeaking(false);
    setInterimText('');
    setVoiceError('');
    const listener = listen(
      (transcript, isFinal) => {
        if (isFinal) {
          setInterimText('');
          handleTranscript(transcript);
        } else {
          setInterimText(transcript);
        }
      },
      () => {
        setIsListening(false);
        setInterimText('');
      },
      (error) => {
        setIsListening(false);
        setInterimText('');
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
    setInterimText('');
  }, []);

  const toggleListening = () => {
    if (isListening) stopListening();
    else startListening();
  };

  const handleAskSuggested = (text: string) => {
    void handleTranscript(text);
  };

  useEffect(() => () => {
    listenerRef.current?.stop();
    stopSpeaking();
  }, []);

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Commande vocale</h1>
          <p className="text-gray-500">Interrogez vos documents à voix haute.</p>
        </div>
        {speechSupported && (
          <button
            onClick={() => setAutoSpeak((v) => !v)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
              autoSpeak ? 'bg-usps-gray border-usps-blue/30 text-usps-blue' : 'bg-white border-gray-200 text-gray-500'
            }`}
            title={autoSpeak ? 'Réponses vocales activées' : 'Réponses vocales désactivées'}
          >
            {autoSpeak ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            {autoSpeak ? 'Voix activée' : 'Voix désactivée'}
          </button>
        )}
      </div>

      {!listeningSupported ? (
        <div className="mb-6 p-5 rounded-2xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
          La saisie vocale n'est pas prise en charge par ce navigateur. Essayez Chrome ou Edge, ou utilisez la Recherche intelligente pour taper votre question.
        </div>
      ) : (
        <div className="mb-8 flex flex-col items-center justify-center py-10 rounded-2xl bg-usps-gray border border-usps-blue/20">
          <button
            onClick={toggleListening}
            className={`relative w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all ${
              isListening ? 'bg-usps-red shadow-usps-red/30' : 'bg-usps-blue shadow-usps-blue/30 hover:bg-usps-blue-dark'
            }`}
          >
            {isListening && <span className="absolute inset-0 rounded-full bg-usps-red/40 animate-ping" />}
            {isListening ? <Square className="w-7 h-7 text-white relative" /> : <Mic className="w-8 h-8 text-white relative" />}
          </button>
          <p className="mt-4 text-sm font-medium text-gray-700">
            {isListening ? 'Écoute en cours... touchez pour arrêter' : isSpeaking ? 'Parle...' : 'Touchez pour parler'}
          </p>
          {interimText && <p className="mt-2 text-sm text-gray-500 italic max-w-md text-center">"{interimText}"</p>}
          {voiceError && <p className="mt-3 max-w-md text-center text-xs font-medium text-red-600">{voiceError}</p>}
        </div>
      )}

      {conversation.length === 0 && (
        <div className="mb-6">
          <div className="text-sm text-gray-400 mb-3">Essayez de dire :</div>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_COMMANDS.map((q) => (
              <button
                key={q}
                onClick={() => handleAskSuggested(q)}
                className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-usps-gray hover:border-usps-blue/30 hover:text-usps-blue transition-all"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {conversation.length > 0 && (
        <div className="space-y-4">
          {conversation.map((entry) => (
            <div key={entry.id} className="space-y-2">
              <div className="flex items-start gap-3 justify-end">
                <div className="max-w-md rounded-2xl rounded-tr-sm bg-white border border-gray-200 px-4 py-2.5 text-sm text-gray-700 shadow-sm">
                  {entry.question}
                </div>
                <div className="w-8 h-8 rounded-lg bg-gray-200 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-gray-500" />
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-usps-blue flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div className="max-w-md rounded-2xl rounded-tl-sm bg-usps-gray border border-usps-blue/20 px-4 py-2.5 text-sm text-gray-700 whitespace-pre-line shadow-sm">
                  {entry.answer}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


