import { useCallback, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { Sidebar, type View } from '@/components/Sidebar';
import { TopBar } from '@/components/TopBar';
import SignIn from '@/components/SignIn';
import Landing from '@/components/Landing';
import HowItWorks from '@/components/HowItWorks';
import UploadModal from '@/components/UploadModal';
import AcceptInvite from '@/components/AcceptInvite';
import { UploadJobsIndicator } from '@/components/UploadJobsIndicator';
import { useUploadFlow } from '@/hooks/useUploadFlow';
import VoiceControlView from '@/components/VoiceControlView';
import RealDocumentDetail from '@/components/DocumentDetail';
import { Dashboard } from '@/views/Dashboard';
import { CourriersView } from '@/views/CourriersView';
import { DossiersView } from '@/views/DossiersView';
import { TachesView } from '@/views/TachesView';
import { ProjectsView } from '@/views/ProjectsView';
import { B2BView } from '@/views/B2BView';
import { RapportsView } from '@/views/RapportsView';
import { ArchiveView } from '@/views/ArchiveView';
import { AnalyticsView } from '@/views/AnalyticsView';
import { AssistantView } from '@/views/AssistantView';
import { AdminView } from '@/views/AdminView';
import { SettingsView } from '@/views/SettingsView';
import { TrashView } from '@/views/TrashView';
import { CotationsView } from '@/views/CotationsView';
import { AnnuaireView } from '@/views/AnnuaireView';
import { InstitutionsView } from '@/views/InstitutionsView';
import ProductCatalogManager from '@/components/ProductCatalogManager';
import AdminPortal from '@/components/AdminPortal';
import { DocumentDetail } from '@/views/DocumentDetail';
import { auth, firestore, getActiveCompanyContext, setActiveCompanyContext } from '@/lib/firebase';
import { normalizeDocument } from '@/lib/normalizeDocument';
import { compareNewestDocuments } from '@/lib/documentSort';
import { canManageTrash, filterVisibleDocuments } from '@/lib/documentAccess';
import type { DocDocument, UserRole } from '@/types';
import type { ActionItem, Comment, DocumentItem, Folder, Note, NotificationItem, Reminder, TaskItem } from '@/lib/types';

export type CourriersFilter = {
  direction?: 'all' | 'incoming' | 'outgoing' | 'unclassified';
  category?: string;
  categories?: string[];
  categoryLabel?: string;
};

const viewMeta: Record<View, { title: string; subtitle: string }> = {
  dashboard: { title: 'Accueil', subtitle: 'Centre de contrôle de votre activité documentaire' },
  courriers: { title: 'Registre intelligent', subtitle: 'Courriers entrants et sortants, factures, proformas et délais détectés par IA' },
  dossiers: { title: 'Dossiers & projets', subtitle: 'Espaces de projet, travail de groupe et dossiers intelligents' },
  taches: { title: 'Tâches', subtitle: 'Tâches internes et suivi de traitement' },
  achats: { title: 'Demandes de cotation', subtitle: 'Création, publication, soumission et dépouillement IA' },
  'b2b-catalog': { title: 'Mes produits & services', subtitle: 'Catalogue visible par les entreprises du réseau B2B' },
  directory: { title: 'Annuaire', subtitle: 'Entreprises et prestataires du réseau B2B' },
  institutions: { title: 'Institutions', subtitle: 'Annuaire institutionnel et demandes de collaboration' },
  projects: { title: 'Projets', subtitle: 'Objectifs, phases, tâches, budget et contributions' },
  b2b: { title: 'Réseau B2B', subtitle: 'Échange direct entre entreprises partenaires' },
  'b2b-opportunities': { title: 'Opportunités B2B', subtitle: 'Demandes de cotation ouvertes aux fournisseurs' },
  'b2b-partners': { title: 'Prestataires B2B', subtitle: 'Fournisseurs, clients et prestataires qualifiés' },
  rapports: { title: 'Rapports', subtitle: 'Rapports intelligents et consolidation IA' },
  archive: { title: 'Archives', subtitle: 'Archivage intelligent et recherche' },
  performance: { title: 'Performance', subtitle: 'Pilotage et indicateurs de traitement' },
  assistant: { title: 'Copilote IA', subtitle: 'Parlez à vos documents, obtenez résumés, délais et réponses' },
  voice: { title: 'Commande vocale', subtitle: 'Interrogez vos documents et naviguez à la voix' },
  admin: { title: 'Administration de l’entreprise', subtitle: 'Membres, rôles, unités et sécurité de votre organisation' },
  inbox: { title: 'Documents', subtitle: 'Documents analysés par IA' },
  search: { title: 'Recherche intelligente', subtitle: 'Recherche IA dans vos documents' },
  folders: { title: 'Dossiers', subtitle: 'Classement Firebase' },
  bills: { title: 'Factures', subtitle: 'Factures à échéance' },
  reminders: { title: 'Rappels', subtitle: 'Rappels Firebase' },
  settings: { title: 'Paramètres', subtitle: 'Archivage cloud, local et serveur' },
  trash: { title: 'Corbeille', subtitle: 'Documents et tâches supprimés' },
};

type AppState = 'landing' | 'how' | 'signin' | 'admin' | 'app';

type UserProfile = {
  id: string;
  owner_id: string;
  full_name: string;
  email: string;
  role: UserRole;
  role_label: string;
  unit: string;
  company_id: string;
  company_name: string;
  suspended?: boolean;
};

async function findCurrentUserProfile(uid: string) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const { data } = await firestore.from<UserProfile>('profiles').select().eq('owner_id', uid).single();
    const profile = data as UserProfile | null;
    if (profile) return profile;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return null;
}

function isInstitutionCompany(company: Record<string, unknown> | null) {
  const institutionTypes = ['ministère', 'gouvernorat', 'entité territoriale', 'administration publique', 'entreprise publique', 'établissement public', 'service de contrôle', 'autre institution'];
  const organizationType = String(company?.organization_type ?? '').trim().toLocaleLowerCase('fr');
  return company?.account_type === 'institution' || institutionTypes.includes(organizationType);
}

export default function App() {
  const [appState, setAppState] = useState<AppState>('landing');
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [view, setView] = useState<View>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DocDocument | null>(null);
  const [selectedAiDoc, setSelectedAiDoc] = useState<DocumentItem | null>(null);
  const [courriersFilter, setCourriersFilter] = useState<CourriersFilter>({});
  const [aiDocExtras, setAiDocExtras] = useState<{ notes: Note[]; comments: Comment[]; reminders: Reminder[]; actions: ActionItem[] }>({
    notes: [],
    comments: [],
    reminders: [],
    actions: [],
  });
  const [aiDocuments, setAiDocuments] = useState<DocumentItem[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [institutionPending, setInstitutionPending] = useState(false);
  const [suspendedLoginMessage, setSuspendedLoginMessage] = useState<string | null>(null);
  const [isInstitutionAccount, setIsInstitutionAccount] = useState(false);
  const [companyProfiles, setCompanyProfiles] = useState<UserProfile[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [inviteToken, setInviteToken] = useState<string | null>(
    () => new URLSearchParams(window.location.search).get('invite'),
  );

  useEffect(() => {
    if (appState !== 'app' || !user || !window.matchMedia('(max-width: 767px)').matches) return;
    const timer = window.setTimeout(() => setSidebarCollapsed(true), 2000);
    return () => window.clearTimeout(timer);
  }, [appState, user]);

  const clearInviteToken = useCallback(() => {
    setInviteToken(null);
    const url = new URL(window.location.href);
    url.searchParams.delete('invite');
    window.history.replaceState({}, '', url.toString());
  }, []);

  const loadFirebaseData = useCallback(async () => {
    if (!auth.currentUser) return;
    const companyId = getActiveCompanyContext()?.id;
    const [docsRes, foldersRes, profilesRes, tasksRes, notificationsRes] = await Promise.all([
      firestore.from<Record<string, unknown>>('documents').select(),
      firestore.from<Folder>('folders').select(),
      companyId
        ? firestore.from<UserProfile>('profiles').select().eq('company_id', companyId)
        : Promise.resolve({ data: [], error: null }),
      firestore.from<TaskItem>('tasks').select(),
      firestore.from<NotificationItem>('notifications').select().eq('recipient_id', auth.currentUser.uid),
    ]);
    setAiDocuments(((docsRes.data as Record<string, unknown>[] | null) ?? []).map(normalizeDocument).sort(compareNewestDocuments));
    setFolders((foldersRes.data as Folder[] | null) ?? []);
    const companyMembers = ((profilesRes.data as UserProfile[] | null) ?? []).filter((profile) => profile.owner_id);
    setCompanyProfiles(Array.from(new Map(companyMembers.map((profile) => [profile.owner_id, profile])).values()));
    setTasks(((tasksRes.data as TaskItem[] | null) ?? []).filter((task) => !task.deleted_at));
    setNotifications((notificationsRes.data as NotificationItem[] | null) ?? []);
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

  const visibleDocuments = useMemo(
    () => (user ? filterVisibleDocuments(aiDocuments, { uid: user.uid, role: userProfile?.role }) : []),
    [aiDocuments, user, userProfile],
  );

  const upload = useUploadFlow({
    folders,
    onUploaded: loadFirebaseData,
    onFoldersChange: loadFirebaseData,
    uploaderRole: userProfile?.role,
  });

  useEffect(() => {
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setSidebarCollapsed(false);
      setAuthReady(true);
      if (nextUser) {
        void (async () => {
          setCompanyProfiles([]);
          setActiveCompanyContext(null);
          const profile = await findCurrentUserProfile(nextUser.uid);
          if (profile?.suspended) {
            setSuspendedLoginMessage('Votre compte est suspendu par l’administrateur de la société qui a créé votre compte.');
            setAppState((current) => current === 'admin' ? current : 'signin');
            await signOut(auth);
            return;
          }
          setSuspendedLoginMessage(null);
          setUserProfile(profile);
          if (profile?.company_id) {
            setActiveCompanyContext({ id: profile.company_id, name: profile.company_name });
            const { data: company } = await firestore.from<Record<string, unknown>>('companies').select().eq('id', profile.company_id).single();
            const institution = company as { account_type?: string; account_status?: string; organization_type?: string } | null;
            const isInstitution = isInstitutionCompany(institution);
            setIsInstitutionAccount(isInstitution);
            setInstitutionPending(institution?.account_type === 'institution' && institution.account_status !== 'active');
          } else {
            setInstitutionPending(false);
            setIsInstitutionAccount(false);
          }
          // Don't clobber the platform admin portal if it's open — it has its own,
          // separate login gate and isn't tied to this Firebase auth session.
          setAppState((current) => (current === 'admin' ? current : 'app'));
          await loadFirebaseData();
        })();
      } else {
        setActiveCompanyContext(null);
        setUserProfile(null);
        setCompanyProfiles([]);
        setInstitutionPending(false);
        setIsInstitutionAccount(false);
        setSelectedDoc(null);
        setSelectedAiDoc(null);
        setAiDocuments([]);
        setFolders([]);
        setNotifications([]);
      }
    });
  }, [loadFirebaseData]);

  const handleNavigate = (nextView: View) => {
    setView(nextView);
    setSelectedDoc(null);
    setSelectedAiDoc(null);
    setCourriersFilter({});
  };

  const handleOpenCourriersFilter = (filter: CourriersFilter) => {
    setCourriersFilter(filter);
    setView('courriers');
    setSelectedDoc(null);
    setSelectedAiDoc(null);
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setSuspendedLoginMessage(null);
    setAppState('landing');
  };

  if (!authReady) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="h-10 w-10 rounded-full border-4 border-primary-100 border-t-primary-600 animate-spin" />
      </div>
    );
  }

  if (inviteToken && !user) {
    return <AcceptInvite token={inviteToken} onDone={clearInviteToken} />;
  }

  if (appState === 'how') {
    return <HowItWorks onBack={() => setAppState('landing')} onTryFree={() => setAppState('signin')} />;
  }

  if (appState === 'admin') {
    return <AdminPortal onBack={() => setAppState('landing')} />;
  }

  if (appState === 'signin' && !user) {
    return <SignIn onBack={() => { setSuspendedLoginMessage(null); setAppState('landing'); }} initialMode="signin" initialMessage={suspendedLoginMessage} />;
  }

  if (appState !== 'app' || !user) {
    return (
      <Landing
        onEnter={() => setAppState(user ? 'app' : 'signin')}
        onTryFree={() => setAppState('signin')}
        onShowHowItWorks={() => setAppState('how')}
        onAdminLogin={() => setAppState('admin')}
      />
    );
  }

  if (institutionPending) {
    return <div className="flex min-h-screen items-center justify-center bg-ink-50 p-6"><div className="w-full max-w-lg rounded-2xl border border-warning-200 bg-white p-8 text-center shadow-card"><div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-warning-100 text-warning-700">…</div><h1 className="text-xl font-bold text-ink-900">Demande institutionnelle en vérification</h1><p className="mt-3 text-sm leading-relaxed text-ink-600">Votre compte a bien été créé. L’équipe Registre Intelligent vérifie les informations de l’institution et de ses représentants. L’accès à l’espace sera activé après validation.</p><button onClick={handleSignOut} className="mt-6 rounded-lg bg-ink-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink-800">Se déconnecter</button></div></div>;
  }

  const meta = viewMeta[view];
  const userLabel = userProfile?.company_name || user.displayName || user.email?.split('@')[0] || 'Utilisateur';
  const userRole = userProfile ? `${userProfile.role_label} · ${userProfile.full_name}` : user.email || 'Compte connecté';

  return (
    <div className="flex min-h-screen bg-ink-50">
      <Sidebar
        view={view}
        onNavigate={handleNavigate}
        collapsed={sidebarCollapsed}
        onCollapse={() => setSidebarCollapsed(true)}
        canSeeTrash={canManageTrash(userProfile?.role)}
        documentCount={visibleDocuments.length}
        taskCount={tasks.length}
        isInstitutionAccount={isInstitutionAccount}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          title={selectedAiDoc ? selectedAiDoc.title : selectedDoc ? selectedDoc.title : meta.title}
          subtitle={selectedAiDoc ? selectedAiDoc.sender : selectedDoc ? selectedDoc.reference : meta.subtitle}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          onAnalyze={upload.open}
          onSignOut={handleSignOut}
          userLabel={userLabel}
          userRole={userRole}
          compact={Boolean(selectedAiDoc || selectedDoc)}
          notifications={notifications}
          onNotificationRead={async (notificationId) => {
            await firestore.from('notifications').update({ read: true }).eq('id', notificationId);
            setNotifications((current) => current.map((notification) => notification.id === notificationId ? { ...notification, read: true } : notification));
          }}
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
              companyProfiles={companyProfiles}
              availableDocuments={visibleDocuments}
              canManageTrash={canManageTrash(userProfile?.role)}
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
                  documents={visibleDocuments}
                  canManageTrash={canManageTrash(userProfile?.role)}
                  onSelectAiDocument={handleSelectAiDocument}
                  onAnalyze={upload.open}
                  onNavigate={handleNavigate}
                  onOpenCourriersFilter={handleOpenCourriersFilter}
                />
              )}
              {view === 'courriers' && (
                <CourriersView
                  documents={visibleDocuments}
                  onSelectDocument={handleSelectAiDocument}
                  onAnalyze={upload.open}
                  onDocumentsChange={loadFirebaseData}
                  initialFilter={courriersFilter}
                />
              )}
              {view === 'dossiers' && (
                <DossiersView
                  folders={folders}
                  documents={visibleDocuments}
                  onSelectDocument={handleSelectAiDocument}
                  onFoldersChange={loadFirebaseData}
                />
              )}
              {view === 'taches' && (
                <TachesView
                  tasks={tasks}
                  companyProfiles={companyProfiles}
                  documents={visibleDocuments}
                  onTasksChange={loadFirebaseData}
                />
              )}
              {view === 'achats' && <CotationsView companyProfiles={companyProfiles} folders={folders} />}
              {view === 'b2b-catalog' && userProfile && <ProductCatalogManager companyId={userProfile.company_id} companyName={userProfile.company_name} embedded onClose={() => undefined} />}
              {view === 'directory' && <AnnuaireView />}
              {view === 'institutions' && isInstitutionAccount && <InstitutionsView />}
              {view === 'projects' && (
                <ProjectsView
                  companyProfiles={companyProfiles}
                  documents={visibleDocuments}
                  tasks={tasks}
                  onTasksChange={loadFirebaseData}
                  canManageTrash={canManageTrash(userProfile?.role)}
                />
              )}
              {view === 'b2b' && <B2BView companyProfiles={companyProfiles} folders={folders} />}
              {view === 'b2b-opportunities' && <B2BView initialSubView="opportunities" companyProfiles={companyProfiles} folders={folders} />}
              {view === 'b2b-partners' && <B2BView initialSubView="list" companyProfiles={companyProfiles} folders={folders} />}
              {view === 'rapports' && <RapportsView />}
              {view === 'archive' && <ArchiveView onSelectDocument={setSelectedDoc} />}
              {view === 'performance' && <AnalyticsView />}
              {view === 'assistant' && <AssistantView backendDocuments={visibleDocuments} />}
              {view === 'voice' && <VoiceControlView documents={visibleDocuments} onNavigate={handleNavigate} />}
              {view === 'admin' && <AdminView currentUserRole={userProfile?.role} currentUserId={user?.uid} />}
              {view === 'settings' && <SettingsView />}
              {view === 'trash' && canManageTrash(userProfile?.role) && <TrashView onChanged={loadFirebaseData} />}
            </>
          )}
        </main>
      </div>

      {upload.isOpen && <UploadModal flow={upload} />}
    </div>
  );
}
