import { useCallback, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { Sidebar, type View } from '@/components/Sidebar';
import { TopBar } from '@/components/TopBar';
import SignIn from '@/components/SignIn';
import Landing from '@/components/Landing';
import HowItWorks from '@/components/HowItWorks';
import UploadModal from '@/components/UploadModal';
import { UploadJobsIndicator } from '@/components/UploadJobsIndicator';
import { useUploadFlow } from '@/hooks/useUploadFlow';
import VoiceControlView from '@/components/VoiceControlView';
import RealDocumentDetail from '@/components/DocumentDetail';
import { Dashboard } from '@/views/Dashboard';
import { CourriersView } from '@/views/CourriersView';
import { DossiersView } from '@/views/DossiersView';
import { TachesView } from '@/views/TachesView';
import { CollaborationView } from '@/views/CollaborationView';
import { B2BView } from '@/views/B2BView';
import { RapportsView } from '@/views/RapportsView';
import { ArchiveView } from '@/views/ArchiveView';
import { AnalyticsView } from '@/views/AnalyticsView';
import { AssistantView } from '@/views/AssistantView';
import { AdminView } from '@/views/AdminView';
import { CotationsView } from '@/views/CotationsView';
import { DocumentDetail } from '@/views/DocumentDetail';
import { auth, firestore } from '@/lib/firebase';
import { normalizeDocument } from '@/lib/normalizeDocument';
import { compareNewestDocuments } from '@/lib/documentSort';
import type { DocDocument } from '@/types';
import type { ActionItem, Comment, DocumentItem, Folder, Note, Reminder } from '@/lib/types';

const viewMeta: Record<View, { title: string; subtitle: string }> = {
  dashboard: { title: 'Accueil', subtitle: 'Centre de contrôle de votre activité documentaire' },
  courriers: { title: 'Registre intelligent', subtitle: 'Courriers entrants et sortants, factures, proformas et délais détectés par IA' },
  dossiers: { title: 'Dossiers & projets', subtitle: 'Espaces de projet, travail de groupe et dossiers intelligents' },
  taches: { title: 'Tâches', subtitle: 'Tâches internes et suivi de traitement' },
  achats: { title: 'Demandes de cotation', subtitle: 'Création, publication, soumission et dépouillement IA' },
  collaboration: { title: 'Collaboration', subtitle: 'Travail de groupe autour des documents, tâches et décisions' },
  b2b: { title: 'Réseau B2B', subtitle: 'Échange direct entre entreprises partenaires' },
  rapports: { title: 'Rapports', subtitle: 'Rapports intelligents et consolidation IA' },
  archive: { title: 'Archives', subtitle: 'Archivage intelligent et recherche' },
  performance: { title: 'Performance', subtitle: 'Pilotage et indicateurs de traitement' },
  assistant: { title: 'Copilote IA', subtitle: 'Parlez à vos documents, obtenez résumés, délais et réponses' },
  voice: { title: 'Commande vocale', subtitle: 'Interrogez vos documents et naviguez à la voix' },
  admin: { title: 'Administration', subtitle: 'Rôles, permissions et sécurité' },
  inbox: { title: 'Documents', subtitle: 'Documents analysés par IA' },
  search: { title: 'Recherche intelligente', subtitle: 'Recherche IA dans vos documents' },
  folders: { title: 'Dossiers', subtitle: 'Classement Firebase' },
  bills: { title: 'Factures', subtitle: 'Factures à échéance' },
  reminders: { title: 'Rappels', subtitle: 'Rappels Firebase' },
};

type AppState = 'landing' | 'how' | 'signin' | 'app';

export default function App() {
  const [appState, setAppState] = useState<AppState>('landing');
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [view, setView] = useState<View>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DocDocument | null>(null);
  const [selectedAiDoc, setSelectedAiDoc] = useState<DocumentItem | null>(null);
  const [aiDocExtras, setAiDocExtras] = useState<{ notes: Note[]; comments: Comment[]; reminders: Reminder[]; actions: ActionItem[] }>({
    notes: [],
    comments: [],
    reminders: [],
    actions: [],
  });
  const [aiDocuments, setAiDocuments] = useState<DocumentItem[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);

  const loadFirebaseData = useCallback(async () => {
    if (!auth.currentUser) return;
    const [docsRes, foldersRes] = await Promise.all([
      firestore.from<Record<string, unknown>>('documents').select(),
      firestore.from<Folder>('folders').select(),
    ]);
    setAiDocuments(((docsRes.data as Record<string, unknown>[] | null) ?? []).map(normalizeDocument).sort(compareNewestDocuments));
    setFolders((foldersRes.data as Folder[] | null) ?? []);
  }, []);

  const loadAiDocExtras = useCallback(async (documentId: string) => {
    const [notesRes, commentsRes, remindersRes, actionsRes] = await Promise.all([
      firestore.from<Note>('notes').select().eq('document_id', documentId),
      firestore.from<Comment>('comments').select().eq('document_id', documentId),
      firestore.from<Reminder>('reminders').select().eq('document_id', documentId),
      firestore.from<ActionItem>('actions').select().eq('document_id', documentId),
    ]);
    setAiDocExtras({
      notes: (notesRes.data as Note[] | null) ?? [],
      comments: (commentsRes.data as Comment[] | null) ?? [],
      reminders: (remindersRes.data as Reminder[] | null) ?? [],
      actions: (actionsRes.data as ActionItem[] | null) ?? [],
    });
  }, []);

  const handleSelectAiDocument = useCallback((doc: DocumentItem) => {
    setSelectedAiDoc(doc);
    void loadAiDocExtras(doc.id);
  }, [loadAiDocExtras]);

  const handleAiDocDataChange = useCallback(async () => {
    await loadFirebaseData();
    if (selectedAiDoc) await loadAiDocExtras(selectedAiDoc.id);
  }, [loadFirebaseData, loadAiDocExtras, selectedAiDoc]);

  const upload = useUploadFlow({ folders, onUploaded: loadFirebaseData, onFoldersChange: loadFirebaseData });

  useEffect(() => {
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
      if (nextUser) {
        setAppState('app');
        void loadFirebaseData();
      } else {
        setSelectedDoc(null);
        setSelectedAiDoc(null);
        setAiDocuments([]);
        setFolders([]);
      }
    });
  }, [loadFirebaseData]);

  const handleNavigate = (nextView: View) => {
    setView(nextView);
    setSelectedDoc(null);
    setSelectedAiDoc(null);
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setAppState('landing');
  };

  if (!authReady) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="h-10 w-10 rounded-full border-4 border-primary-100 border-t-primary-600 animate-spin" />
      </div>
    );
  }

  if (appState === 'how') {
    return <HowItWorks onBack={() => setAppState('landing')} onTryFree={() => setAppState('signin')} />;
  }

  if (appState === 'signin' && !user) {
    return <SignIn onBack={() => setAppState('landing')} initialMode="signin" />;
  }

  if (appState !== 'app' || !user) {
    return (
      <Landing
        onEnter={() => setAppState(user ? 'app' : 'signin')}
        onTryFree={() => setAppState('signin')}
        onShowHowItWorks={() => setAppState('how')}
      />
    );
  }

  const meta = viewMeta[view];
  const userLabel = user.displayName || user.email?.split('@')[0] || 'Utilisateur';
  const userRole = user.email || 'Compte connecté';

  return (
    <div className="flex min-h-screen bg-ink-50">
      <Sidebar view={view} onNavigate={handleNavigate} collapsed={sidebarCollapsed} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          title={selectedAiDoc ? selectedAiDoc.title : selectedDoc ? selectedDoc.title : meta.title}
          subtitle={selectedAiDoc ? selectedAiDoc.sender : selectedDoc ? selectedDoc.reference : meta.subtitle}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          onAnalyze={upload.open}
          onSignOut={handleSignOut}
          userLabel={userLabel}
          userRole={userRole}
          uploadProgress={upload.jobs.length > 0 ? (
            <UploadJobsIndicator
              jobs={upload.jobs}
              onSelectJob={upload.selectJob}
              onDismissJob={upload.dismissJob}
              onStartNew={upload.startNewScan}
            />
          ) : undefined}
        />
        <main className="flex-1 overflow-y-auto">
          {selectedAiDoc ? (
            <RealDocumentDetail
              document={selectedAiDoc}
              notes={aiDocExtras.notes}
              comments={aiDocExtras.comments}
              reminders={aiDocExtras.reminders}
              actions={aiDocExtras.actions}
              folders={folders}
              onBack={() => setSelectedAiDoc(null)}
              onDataChange={handleAiDocDataChange}
              onFoldersChange={loadFirebaseData}
            />
          ) : selectedDoc ? (
            <DocumentDetail document={selectedDoc} onBack={() => setSelectedDoc(null)} />
          ) : (
            <>
              {view === 'dashboard' && (
                <Dashboard
                  documents={aiDocuments}
                  onSelectAiDocument={handleSelectAiDocument}
                  onNavigate={handleNavigate}
                />
              )}
              {view === 'courriers' && (
                <CourriersView
                  documents={aiDocuments}
                  onSelectDocument={handleSelectAiDocument}
                  onDocumentsChange={loadFirebaseData}
                />
              )}
              {view === 'dossiers' && <DossiersView onSelectDocument={setSelectedDoc} />}
              {view === 'taches' && <TachesView />}
              {view === 'achats' && <CotationsView />}
              {view === 'collaboration' && <CollaborationView onSelectDocument={setSelectedDoc} />}
              {view === 'b2b' && <B2BView />}
              {view === 'rapports' && <RapportsView />}
              {view === 'archive' && <ArchiveView onSelectDocument={setSelectedDoc} />}
              {view === 'performance' && <AnalyticsView />}
              {view === 'assistant' && <AssistantView backendDocuments={aiDocuments} />}
              {view === 'voice' && <VoiceControlView documents={aiDocuments} onNavigate={handleNavigate} />}
              {view === 'admin' && <AdminView />}
            </>
          )}
        </main>
      </div>

      {upload.isOpen && <UploadModal flow={upload} />}
    </div>
  );
}
