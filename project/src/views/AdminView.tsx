import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  AlertOctagon,
  Bell,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Database,
  Download,
  History,
  KeyRound,
  Link2,
  Lock,
  Mail,
  MessageCircle,
  Plus,
  RefreshCw,
  ScrollText,
  Send,
  Shield,
  Trash2,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import { rolePermissions, escalationRules } from '@/data';
import { Avatar } from '@/components/Badges';
import { auth, firestore, getActiveCompanyContext } from '@/lib/firebase';
import { buildInvitationLink, invitationDisplayStatus, type InvitationDisplayStatus, type InvitationRecord } from '@/lib/invitations';
import type { UserRole } from '@/types';
import type { ActionItem, DocumentItem } from '@/lib/types';

const ROLE_OPTIONS: { value: UserRole; label: string; hint: string }[] = [
  { value: 'ORGANIZATION_ADMIN', label: 'Administrateur organisationnel', hint: 'Registre, utilisateurs, unités et administration centrale' },
  { value: 'EXECUTIVE', label: 'Direction Générale', hint: 'Pilotage global, instructions, validation et clôture' },
  { value: 'UNIT_MANAGER', label: 'Responsable d\'unité', hint: 'Documents et tâches de son unité' },
  { value: 'UNIT_SECRETARY', label: 'Secrétariat d\'unité', hint: 'Réception, préparation, classement et suivi' },
  { value: 'AGENT', label: 'Agent', hint: 'Tâches et documents affectés' },
];

const UNITS = ['Administration centrale', 'Direction Générale', 'Finance', 'Juridique', 'Administration', 'Opérations', 'Achats', 'Ressources Humaines'];

const roleStyles: Record<UserRole, { badge: string; dot: string }> = {
  ORGANIZATION_ADMIN: { badge: 'bg-danger-100 text-danger-700', dot: 'bg-danger-500' },
  EXECUTIVE: { badge: 'bg-primary-100 text-primary-700', dot: 'bg-primary-500' },
  UNIT_MANAGER: { badge: 'bg-accent-100 text-accent-700', dot: 'bg-accent-500' },
  UNIT_SECRETARY: { badge: 'bg-warning-100 text-warning-700', dot: 'bg-warning-500' },
  AGENT: { badge: 'bg-ink-100 text-ink-600', dot: 'bg-ink-400' },
};

function normalizeUserRole(role: unknown): UserRole {
  return typeof role === 'string' && Object.prototype.hasOwnProperty.call(roleStyles, role)
    ? role as UserRole
    : 'AGENT';
}

const inputClass = 'w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm text-ink-800 outline-none focus:border-primary-300 focus:ring-2 focus:ring-primary-100';
const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:3001' : 'https://registreintelligent-api.onrender.com')).replace(/\/+$/, '');

const invitationStatusStyles: Record<InvitationDisplayStatus, { label: string; badge: string; dot: string }> = {
  accepted: { label: 'Connecté', badge: 'bg-accent-100 text-accent-700', dot: 'bg-accent-500' },
  pending: { label: 'En attente', badge: 'bg-warning-100 text-warning-700', dot: 'bg-warning-500' },
  expired: { label: 'Expirée', badge: 'bg-ink-100 text-ink-500', dot: 'bg-ink-400' },
  revoked: { label: 'Révoquée', badge: 'bg-danger-100 text-danger-700', dot: 'bg-danger-500' },
};

const EMPTY_INVITE = {
  name: '',
  email: '',
  functionTitle: '',
  role: 'AGENT' as UserRole,
  unit: 'Finance',
  phone: '',
  message: '',
};

type CompanyUser = {
  id: string;
  owner_id?: string;
  full_name: string;
  email: string;
  function_title?: string;
  role: UserRole;
  role_label: string;
  unit: string;
  phone?: string;
  suspended?: boolean;
  created_at?: string;
};

type TeamRow = {
  id: string;
  ownerId?: string;
  name: string;
  email: string;
  role: UserRole;
  roleLabel: string;
  suspended: boolean;
  unit: string;
  avatarColor: string;
  documentCount: number;
  taskCount: number;
  lastActive: string;
};

export function AdminView({ currentUserRole, currentUserId }: { currentUserRole?: UserRole; currentUserId?: string | null }) {
  const [showInvite, setShowInvite] = useState(false);
  const [savingInvite, setSavingInvite] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [invite, setInvite] = useState(EMPTY_INVITE);
  const [profiles, setProfiles] = useState<CompanyUser[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [invitations, setInvitations] = useState<InvitationRecord[]>([]);
  const [savedInvitation, setSavedInvitation] = useState<InvitationRecord | null>(null);
  const [deletingInvitationId, setDeletingInvitationId] = useState<string | null>(null);
  const [invitationDeleteError, setInvitationDeleteError] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingInvitations, setLoadingInvitations] = useState(true);
  const [isPrimaryAdmin, setIsPrimaryAdmin] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);
  const [memberRemovalError, setMemberRemovalError] = useState('');
  const [memberRemovalNotice, setMemberRemovalNotice] = useState('');
  const activeCompany = getActiveCompanyContext();

  useEffect(() => {
    let cancelled = false;
    if (!activeCompany?.id || !currentUserId || currentUserRole !== 'ORGANIZATION_ADMIN') {
      setIsPrimaryAdmin(false);
      return;
    }
    void firestore.from<Record<string, unknown>>('companies').select().eq('id', activeCompany.id).single().then(({ data }) => {
      if (!cancelled) {
        setIsPrimaryAdmin((data as { primary_admin_uid?: string } | null)?.primary_admin_uid === currentUserId);
      }
    });
    return () => { cancelled = true; };
  }, [activeCompany?.id, currentUserId, currentUserRole]);

  const loadInvitations = async () => {
    setLoadingInvitations(true);
    const res = await firestore.from<InvitationRecord>('invitations').select();
    const rows = (res.data as InvitationRecord[] | null) ?? [];
    rows.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    setInvitations(rows);
    setLoadingInvitations(false);
  };

  useEffect(() => {
    let cancelled = false;
    async function loadTeam() {
    setLoadingUsers(true);
      const profilesQuery = activeCompany?.id
        ? firestore.from<CompanyUser>('profiles').select().eq('company_id', activeCompany.id)
        : Promise.resolve({ data: [], error: null });
      const [profilesRes, docsRes, actionsRes] = await Promise.all([
        profilesQuery,
        firestore.from<DocumentItem>('documents').select(),
        firestore.from<ActionItem>('actions').select(),
      ]);
      if (cancelled) return;
      setProfiles((profilesRes.data as CompanyUser[] | null) ?? []);
      setDocuments((docsRes.data as DocumentItem[] | null) ?? []);
      setActions((actionsRes.data as ActionItem[] | null) ?? []);
      setLoadingUsers(false);
    }
    void loadTeam();
    void loadInvitations();
    return () => { cancelled = true; };
  }, [activeCompany?.id]);

  const roleCounts = useMemo(() => {
    const counts = new Map<UserRole, number>();
    for (const member of profiles) {
      const role = normalizeUserRole(member.role);
      counts.set(role, (counts.get(role) || 0) + 1);
    }
    return counts;
  }, [profiles]);

  const teamRows = useMemo<TeamRow[]>(() => {
    const colors = ['bg-ink-700', 'bg-primary-600', 'bg-accent-600', 'bg-warning-600', 'bg-danger-600', 'bg-primary-500'];
    return profiles.map((profile, index) => {
      const name = profile.full_name || profile.email;
      const unit = profile.unit || 'Unité non définie';
      const role = normalizeUserRole(profile.role);
      const firstName = name.split(' ')[0]?.toLowerCase() || '';
      const unitDocs = documents.filter((doc) => (doc.register?.assignedService || '').toLowerCase() === unit.toLowerCase()).length;
      const ownDocs = documents.filter((doc) => doc.owner_id && profile.owner_id && doc.owner_id === profile.owner_id).length;
      const assignedTasks = actions.filter((action) => firstName && (action.assignee_name || '').toLowerCase().includes(firstName)).length;
      return {
        id: profile.id,
        ownerId: profile.owner_id,
        name,
        email: profile.email,
        role,
        roleLabel: profile.role_label || ROLE_OPTIONS.find((option) => option.value === role)?.label || 'Utilisateur',
        suspended: profile.suspended === true,
        unit,
        avatarColor: colors[index % colors.length],
        documentCount: role === 'ORGANIZATION_ADMIN' || role === 'EXECUTIVE' ? documents.length : Math.max(unitDocs, ownDocs),
        taskCount: assignedTasks,
        lastActive: 'Compte actif',
      };
    });
  }, [actions, documents, profiles]);

  const inviteRoleLabel = ROLE_OPTIONS.find((role) => role.value === invite.role)?.label ?? 'Agent';
  const invitePreview = `Bonjour ${invite.name || 'Jean Kabeya'},

Vous avez été invité à rejoindre ${activeCompany?.name || 'votre organisation'} sur Registre Intelligent.

Rôle : ${inviteRoleLabel}
Unité : ${invite.unit}

Cliquez sur le bouton « Accepter l'invitation » pour créer votre compte et accéder à votre espace de travail.

Cette invitation est personnelle et ne doit pas être transférée.`;

  const handleCreateInviteLink = async () => {
    if (!invite.name.trim() || !invite.email.trim()) return;
    const company = getActiveCompanyContext();
    if (!company) return;
    setSavingInvite(true);
    setSavedInvitation(null);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    const token = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    await firestore.from('invitations').insert({
      full_name: invite.name.trim(),
      email: invite.email.trim().toLowerCase(),
      function_title: invite.functionTitle.trim(),
      role: invite.role,
      role_label: inviteRoleLabel,
      unit: invite.unit,
      phone: invite.phone.trim(),
      message: invite.message.trim(),
      invitation_text: invitePreview,
      token,
      company_id: company.id,
      company_name: company.name,
      status: 'pending',
      expires_at: expiresAt.toISOString(),
    });

    setSavingInvite(false);
    setLinkCopied(false);
    setInviteLink(buildInvitationLink(token));
    void loadInvitations();
  };

  const handleCopyLink = () => {
    if (!inviteLink) return;
    navigator.clipboard?.writeText(inviteLink).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  };

  const mailtoHref = inviteLink
    ? `mailto:${encodeURIComponent(invite.email)}?subject=${encodeURIComponent('Invitation — Registre Intelligent')}&body=${encodeURIComponent(`${invitePreview}\n\n${inviteLink}`)}`
    : '#';
  const whatsappHref = inviteLink && invite.phone.trim()
    ? `https://wa.me/${invite.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`${invitePreview}\n\n${inviteLink}`)}`
    : null;

  const closeInviteModal = () => {
    setShowInvite(false);
    setInviteLink(null);
    setSavedInvitation(null);
    setInvite(EMPTY_INVITE);
  };

  const openSavedInvitation = (invitation: InvitationRecord) => {
    setInvite({
      name: invitation.full_name,
      email: invitation.email,
      functionTitle: invitation.function_title || '',
      role: normalizeUserRole(invitation.role),
      unit: invitation.unit || UNITS[0],
      phone: invitation.phone || '',
      message: invitation.message || '',
    });
    setSavedInvitation(invitation);
    setInviteLink(buildInvitationLink(invitation.token));
    setLinkCopied(false);
    setShowInvite(true);
  };

  const handleDeleteInvitation = async (invitation: InvitationRecord) => {
    if (!isPrimaryAdmin || invitation.status === 'accepted' || deletingInvitationId) return;
    if (!window.confirm(`Supprimer l’invitation de ${invitation.full_name} ? Son lien ne pourra plus être utilisé.`)) return;

    setDeletingInvitationId(invitation.id);
    setInvitationDeleteError('');
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Votre session a expiré. Reconnectez-vous puis réessayez.');
      const response = await fetch(`${apiBaseUrl}/api/company/invitations/${encodeURIComponent(invitation.id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(payload.error || 'L’invitation n’a pas pu être supprimée.');
      setInvitations((current) => current.filter((item) => item.id !== invitation.id));
    } catch (error) {
      setInvitationDeleteError(error instanceof Error ? error.message : 'L’invitation n’a pas pu être supprimée.');
    } finally {
      setDeletingInvitationId(null);
    }
  };

  const handleRemoveMember = async (member: TeamRow) => {
    if (!isPrimaryAdmin || !activeCompany?.id || !member.ownerId || member.ownerId === currentUserId || removingMemberId || updatingMemberId) return;
    const confirmed = window.confirm(`Retirer ${member.name} de ${activeCompany.name} ? Son compte Firebase ne sera pas supprimé, mais son accès à cette entreprise sera retiré.`);
    if (!confirmed) return;

    setRemovingMemberId(member.id);
    setMemberRemovalError('');
    setMemberRemovalNotice('');
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Votre session a expiré. Reconnectez-vous puis réessayez.');
      const response = await fetch(`${apiBaseUrl}/api/company/members/${encodeURIComponent(member.ownerId)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(payload.error || 'Le membre n’a pas pu être retiré.');
      setProfiles((current) => current.filter((profile) => profile.owner_id !== member.ownerId || profile.company_id !== activeCompany.id));
      setMemberRemovalNotice(`${member.name} a été retiré de l’entreprise.`);
    } catch (error) {
      setMemberRemovalError(error instanceof Error ? error.message : 'Le membre n’a pas pu être retiré.');
    } finally {
      setRemovingMemberId(null);
    }
  };

  const handleToggleSuspension = async (member: TeamRow) => {
    if (!isPrimaryAdmin || !activeCompany?.id || !member.ownerId || member.ownerId === currentUserId || removingMemberId || updatingMemberId) return;
    const nextSuspended = !member.suspended;
    const action = nextSuspended ? 'suspendre' : 'réactiver';
    if (!window.confirm(`${nextSuspended ? 'Suspendre' : 'Réactiver'} ${member.name} ? ${nextSuspended ? 'Il ne pourra plus se connecter à son compte.' : 'Il pourra de nouveau se connecter.'}`)) return;

    setUpdatingMemberId(member.id);
    setMemberRemovalError('');
    setMemberRemovalNotice('');
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Votre session a expiré. Reconnectez-vous puis réessayez.');
      const response = await fetch(`${apiBaseUrl}/api/company/members/${encodeURIComponent(member.ownerId)}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ suspended: nextSuspended }),
      });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(payload.error || `Impossible de ${action} ce membre.`);
      setProfiles((current) => current.map((profile) => profile.owner_id === member.ownerId && profile.company_id === activeCompany.id
        ? { ...profile, suspended: nextSuspended }
        : profile));
      setMemberRemovalNotice(nextSuspended ? `${member.name} a été suspendu.` : `${member.name} peut de nouveau se connecter.`);
    } catch (error) {
      setMemberRemovalError(error instanceof Error ? error.message : `Impossible de ${action} ce membre.`);
    } finally {
      setUpdatingMemberId(null);
    }
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in max-w-[1600px] mx-auto">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SecurityCard icon={Users} label="Utilisateurs" value={teamRows.length.toString()} subValue={`${new Set(teamRows.map((user) => user.unit)).size || UNITS.length} unités actives`} color="primary" />
        <SecurityCard icon={Shield} label="Rôles" value="5" subValue="Niveaux universels" color="accent" />
        <SecurityCard
          icon={KeyRound}
          label="Invitations"
          value={invitations.filter((i) => invitationDisplayStatus(i) === 'pending').length.toString()}
          subValue={`en attente · ${invitations.filter((i) => invitationDisplayStatus(i) === 'accepted').length} connecté${invitations.filter((i) => invitationDisplayStatus(i) === 'accepted').length === 1 ? '' : 's'}`}
          color="warning"
        />
        <SecurityCard icon={Database} label="Sauvegardes" value="Quotidiennes" subValue="Dernière: aujourd'hui" color="primary" />
      </div>

      <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 overflow-hidden">
        <div className="px-5 py-4 border-b border-ink-100">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary-600" />
            <h2 className="font-display font-bold text-ink-900 text-base">Nomenclature universelle</h2>
          </div>
          <p className="text-xs text-ink-500">Les rôles techniques restent stables, les titres affichés peuvent être adaptés par organisation.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-ink-100">
          {ROLE_OPTIONS.map((role, index) => (
            <div key={role.value} className="p-4">
              <p className="text-[10px] font-bold text-ink-400 uppercase">Niveau {index + 1}</p>
              <p className="text-sm font-bold text-ink-900 mt-1">{role.label}</p>
              <p className="text-[10px] font-mono text-primary-600 mt-1">{role.value}</p>
              <p className="text-xs text-ink-500 mt-2 leading-relaxed">{role.hint}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 overflow-hidden">
        <div className="px-5 py-4 border-b border-ink-100 flex items-center justify-between">
          <div>
            <h2 className="font-display font-bold text-ink-900 text-base">Équipe</h2>
            <p className="text-xs text-ink-500">Membres, rôles, unités et activité{isPrimaryAdmin ? ' · Administrateur principal' : ''}</p>
          </div>
          <button
            onClick={() => { setSavedInvitation(null); setShowInvite(true); }}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 px-3 py-2 rounded-lg transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Inviter
          </button>
        </div>
        {memberRemovalError && <p role="alert" className="border-b border-danger-100 bg-danger-50 px-5 py-2 text-xs text-danger-700">{memberRemovalError}</p>}
        {memberRemovalNotice && <p role="status" className="border-b border-accent-100 bg-accent-50 px-5 py-2 text-xs text-accent-700">{memberRemovalNotice}</p>}
        <div className="divide-y divide-ink-100">
          {loadingUsers && (
            <div className="px-5 py-8 text-center text-sm text-ink-500">Chargement des utilisateurs Firebase...</div>
          )}
          {!loadingUsers && teamRows.length === 0 && (
            <div className="px-5 py-8 text-center">
              <p className="text-sm font-semibold text-ink-700">Aucun utilisateur trouvé pour cette entreprise.</p>
              <p className="text-xs text-ink-500 mt-1">Invitez un utilisateur ou vérifiez que les profils contiennent le bon company_id.</p>
            </div>
          )}
          {!loadingUsers && teamRows.map((member) => (
            <div key={member.id} className="px-5 py-3.5 flex items-center gap-4 hover:bg-ink-50/50 transition-colors">
              <Avatar name={member.name} color={member.avatarColor} size="md" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-ink-800">{member.name}</p>
                <p className="text-[10px] text-ink-500">{member.email}</p>
              </div>
              <div className="hidden md:block text-right">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${roleStyles[member.role].badge}`}>
                  {member.roleLabel}
                </span>
                <p className="text-[10px] text-ink-400 mt-0.5">{member.unit}</p>
              </div>
              <div className="hidden lg:block text-right">
                <p className="text-xs font-medium text-ink-700">{member.documentCount} docs</p>
                <p className="text-[10px] text-ink-400">{member.taskCount} tâches</p>
              </div>
              <div className="text-right shrink-0">
                <span className={`text-[10px] font-medium ${member.suspended ? 'text-danger-600' : 'text-accent-600'}`}>
                  <span className={`h-1.5 w-1.5 rounded-full inline-block mr-1 ${member.suspended ? 'bg-danger-500' : 'bg-accent-500 animate-pulse-soft'}`} />
                  {member.suspended ? 'Suspendu' : member.lastActive}
                </span>
              </div>
              {isPrimaryAdmin && member.ownerId && member.ownerId !== currentUserId && (
                <>
                <button
                  type="button"
                  onClick={() => void handleToggleSuspension(member)}
                  disabled={Boolean(removingMemberId || updatingMemberId)}
                  title={member.suspended ? `Réactiver ${member.name}` : `Suspendre ${member.name}`}
                  aria-label={member.suspended ? `Réactiver ${member.name}` : `Suspendre ${member.name}`}
                  className={`shrink-0 rounded-lg p-2 transition-colors disabled:opacity-40 ${member.suspended ? 'text-accent-700 hover:bg-accent-50' : 'text-warning-700 hover:bg-warning-50'}`}
                >
                  {member.suspended ? <CheckCircle2 className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => void handleRemoveMember(member)}
                  disabled={Boolean(removingMemberId || updatingMemberId)}
                  title={`Retirer ${member.name} de l’entreprise`}
                  aria-label={`Retirer ${member.name} de l’entreprise`}
                  className="shrink-0 rounded-lg p-2 text-ink-400 transition-colors hover:bg-danger-50 hover:text-danger-700 disabled:opacity-40"
                >
                  <Trash2 className={`h-4 w-4 ${removingMemberId === member.id ? 'animate-pulse' : ''}`} />
                </button>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 overflow-hidden">
        <div className="px-5 py-4 border-b border-ink-100 flex items-center justify-between">
          <div>
            <h2 className="font-display font-bold text-ink-900 text-base">Invitations envoyées</h2>
            <p className="text-xs text-ink-500">Statut des liens d'invitation générés</p>
          </div>
          <button
            onClick={() => void loadInvitations()}
            disabled={loadingInvitations}
            title="Rafraîchir les statuts"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-600 hover:bg-ink-100 px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingInvitations ? 'animate-spin' : ''}`} />
            Rafraîchir
          </button>
        </div>
        {invitationDeleteError && <p role="alert" className="border-b border-danger-100 bg-danger-50 px-5 py-2 text-xs text-danger-700">{invitationDeleteError}</p>}
        <div className="divide-y divide-ink-100">
          {loadingInvitations && (
            <div className="px-5 py-8 text-center text-sm text-ink-500">Chargement des invitations...</div>
          )}
          {!loadingInvitations && invitations.length === 0 && (
            <div className="px-5 py-8 text-center">
              <AlertOctagon className="h-6 w-6 text-ink-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-ink-700">Aucune invitation envoyée</p>
              <p className="text-xs text-ink-500 mt-1">Cliquez sur « Inviter » ci-dessus pour générer un premier lien.</p>
            </div>
          )}
          {!loadingInvitations && invitations.map((invitation) => {
            const displayStatus = invitationDisplayStatus(invitation);
            const style = invitationStatusStyles[displayStatus];
            return (
              <div
                key={invitation.id}
                className="flex items-center gap-2 px-3 py-2 sm:px-5 sm:py-3.5 hover:bg-ink-50/50 transition-colors"
              >
                <button
                  type="button"
                  onClick={() => openSavedInvitation(invitation)}
                  aria-label={`Afficher le lien d’invitation envoyé à ${invitation.full_name}`}
                  className="flex min-w-0 flex-1 items-center gap-4 py-1 text-left"
                >
                <Avatar name={invitation.full_name} color="bg-ink-500" size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink-800 truncate">{invitation.full_name}</p>
                  <p className="text-[10px] text-ink-500 truncate">{invitation.email}</p>
                </div>
                <div className="hidden md:block text-right shrink-0">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${roleStyles[invitation.role]?.badge ?? 'bg-ink-100 text-ink-600'}`}>
                    {invitation.role_label}
                  </span>
                  <p className="text-[10px] text-ink-400 mt-0.5">{invitation.unit}</p>
                </div>
                <div className="hidden lg:block text-right shrink-0">
                  <p className="text-[10px] text-ink-400">
                    Envoyée {invitation.created_at ? new Date(invitation.created_at).toLocaleDateString('fr-FR') : '—'}
                  </p>
                  {displayStatus === 'accepted' && invitation.accepted_at && (
                    <p className="text-[10px] text-accent-600">Connecté le {new Date(invitation.accepted_at).toLocaleDateString('fr-FR')}</p>
                  )}
                  {displayStatus === 'pending' && (
                    <p className="text-[10px] text-ink-400">Expire le {new Date(invitation.expires_at).toLocaleDateString('fr-FR')}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${style.badge}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${style.dot} ${displayStatus === 'pending' ? 'animate-pulse-soft' : ''}`} />
                    {style.label}
                  </span>
                </div>
                </button>
                {isPrimaryAdmin && invitation.status !== 'accepted' && (
                  <button
                    type="button"
                    onClick={() => void handleDeleteInvitation(invitation)}
                    disabled={Boolean(deletingInvitationId)}
                    title={`Supprimer l’invitation de ${invitation.full_name}`}
                    aria-label={`Supprimer l’invitation de ${invitation.full_name}`}
                    className="shrink-0 rounded-lg p-2 text-ink-400 transition-colors hover:bg-danger-50 hover:text-danger-700 disabled:opacity-40"
                  >
                    <Trash2 className={`h-4 w-4 ${deletingInvitationId === invitation.id ? 'animate-pulse' : ''}`} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 overflow-hidden">
        <div className="px-5 py-4 border-b border-ink-100">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-primary-600" />
            <h2 className="font-display font-bold text-ink-900 text-base">Rôles et permissions</h2>
          </div>
          <p className="text-xs text-ink-500">Permissions par rôle, unité et niveau hiérarchique.</p>
        </div>
        <div className="divide-y divide-ink-100">
          {rolePermissions.map((role) => {
            const count = roleCounts.get(role.role) ?? role.userCount;
            return (
              <div key={role.role} className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${roleStyles[role.role].dot}`} />
                      <span className="text-sm font-bold text-ink-800">{role.roleLabel}</span>
                      <span className="text-[10px] font-bold text-ink-500 bg-ink-100 px-1.5 py-0.5 rounded">
                        {count} utilisateur{count > 1 ? 's' : ''}
                      </span>
                    </div>
                    <p className="text-xs text-ink-500 mt-1">{role.description}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {role.permissions.map((perm, i) => (
                    <div key={i} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs ${perm.granted ? 'bg-accent-50 text-accent-700' : 'bg-ink-50 text-ink-400'}`}>
                      {perm.granted ? <CheckCircle2 className="h-3.5 w-3.5 text-accent-600" /> : <XCircle className="h-3.5 w-3.5 text-ink-300" />}
                      <span className={perm.granted ? 'font-medium' : ''}>{perm.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 overflow-hidden">
          <div className="px-5 py-4 border-b border-ink-100">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-warning-600" />
              <h2 className="font-display font-bold text-ink-900 text-base">Règles d'escalade</h2>
            </div>
            <p className="text-xs text-ink-500">L'organisation définit ses propres règles de rappel.</p>
          </div>
          <div className="p-4 space-y-2">
            {escalationRules.map((rule) => (
              <div key={rule.id} className={`flex items-center gap-3 p-3 rounded-xl border ${rule.trigger === 'J+1 après échéance' ? 'border-danger-200 bg-danger-50/30' : 'border-ink-200/60'}`}>
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                  rule.trigger === 'J+1 après échéance' ? 'bg-danger-100' : rule.trigger === 'Jour J' ? 'bg-warning-100' : 'bg-primary-100'
                }`}>
                  <Clock className={`h-4 w-4 ${
                    rule.trigger === 'J+1 après échéance' ? 'text-danger-600' : rule.trigger === 'Jour J' ? 'text-warning-600' : 'text-primary-600'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-ink-800">{rule.trigger}</p>
                  <p className="text-[10px] text-ink-500">{rule.action}</p>
                </div>
                <span className={`h-2 w-2 rounded-full ${rule.active ? 'bg-accent-500' : 'bg-ink-300'}`} />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 overflow-hidden">
          <div className="px-5 py-4 border-b border-ink-100">
            <div className="flex items-center gap-2">
              <ScrollText className="h-4 w-4 text-accent-600" />
              <h2 className="font-display font-bold text-ink-900 text-base">Sécurité et conformité</h2>
            </div>
            <p className="text-xs text-ink-500">Contrôle et traçabilité.</p>
          </div>
          <div className="p-4 space-y-2">
            {[
              { icon: History, label: 'Journal d\'activité', status: 'Actif', detail: 'Toutes actions tracées' },
              { icon: Lock, label: 'Authentification renforcée', status: '2FA obligatoire', detail: 'Tous les rôles internes' },
              { icon: ScrollText, label: 'Politique de conservation', status: '7 ans', detail: 'Conformité réglementaire' },
              { icon: Database, label: 'Sauvegardes automatiques', status: 'Quotidiennes', detail: 'Retention 90 jours' },
              { icon: Download, label: 'Export des données', status: 'Disponible', detail: 'Format PDF, Excel, CSV' },
              { icon: Shield, label: 'Traçabilité des accès', status: 'En temps réel', detail: 'Logs détaillés par utilisateur' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-ink-200/60">
                <div className="h-8 w-8 rounded-lg bg-ink-100 flex items-center justify-center shrink-0">
                  <item.icon className="h-4 w-4 text-ink-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-ink-800">{item.label}</p>
                  <p className="text-[10px] text-ink-500">{item.detail}</p>
                </div>
                <span className="text-[10px] font-bold text-accent-700 bg-accent-100 px-2 py-0.5 rounded">{item.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4">
          <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-ink-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-ink-100 flex items-center justify-between">
              <div>
                <h2 className="font-display font-bold text-ink-900 text-base">Inviter un utilisateur</h2>
                <p className="text-xs text-ink-500">
                  {inviteLink
                    ? "Aucun email n'est envoyé automatiquement : copiez le lien ci-contre et transmettez-le vous-même."
                    : 'Lien sécurisé temporaire, aucun mot de passe envoyé par email.'}
                </p>
                {inviteLink && <p className="text-xs font-semibold text-accent-700 mt-1">Lien d'invitation créé et enregistré dans Firebase.</p>}
                {!activeCompany && <p className="text-xs font-semibold text-danger-700 mt-1">Créez ou connectez d'abord un compte business pour rattacher l'invitation à une entreprise.</p>}
              </div>
              <button onClick={closeInviteModal} className="h-8 w-8 rounded-lg hover:bg-ink-100 flex items-center justify-center">
                <X className="h-4 w-4 text-ink-500" />
              </button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 p-5">
              <div className="space-y-3">
                <FormField label="Nom complet">
                  <input value={invite.name} onChange={(e) => setInvite({ ...invite, name: e.target.value })} className={inputClass} placeholder="Jean Kabeya" />
                </FormField>
                <FormField label="Email">
                  <input type="email" value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} className={inputClass} placeholder="jean@entreprise.cd" />
                </FormField>
                <FormField label="Fonction">
                  <input value={invite.functionTitle} onChange={(e) => setInvite({ ...invite, functionTitle: e.target.value })} className={inputClass} placeholder="Comptable" />
                </FormField>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FormField label="Rôle">
                    <select value={invite.role} onChange={(e) => setInvite({ ...invite, role: e.target.value as UserRole })} className={inputClass}>
                      {ROLE_OPTIONS.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Unité">
                    <select value={invite.unit} onChange={(e) => setInvite({ ...invite, unit: e.target.value })} className={inputClass}>
                      {UNITS.map((unit) => <option key={unit}>{unit}</option>)}
                    </select>
                  </FormField>
                </div>
                <FormField label="Téléphone">
                  <input value={invite.phone} onChange={(e) => setInvite({ ...invite, phone: e.target.value })} className={inputClass} placeholder="+243..." />
                </FormField>
                <FormField label="Message d'invitation">
                  <textarea value={invite.message} onChange={(e) => setInvite({ ...invite, message: e.target.value })} className={`${inputClass} min-h-20 resize-none`} placeholder="Facultatif" />
                </FormField>
              </div>
              <div className="space-y-3">
                <div className="rounded-2xl bg-ink-50 border border-ink-200 p-4">
                    <p className="text-xs font-bold text-ink-700 mb-3">Aperçu de l'invitation</p>
                    {activeCompany && <p className="text-[10px] font-semibold text-primary-700 mb-3">Entreprise : {activeCompany.name}</p>}
                  <pre className="whitespace-pre-wrap text-xs leading-relaxed text-ink-600 font-sans">{invitePreview}</pre>
                </div>

                {inviteLink && (
                  <div className="rounded-2xl bg-primary-50 border border-primary-200 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Link2 className="h-3.5 w-3.5 text-primary-600" />
                      <p className="text-xs font-bold text-primary-800">Lien d'invitation</p>
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      <input
                        readOnly
                        value={inviteLink}
                        onFocus={(e) => e.currentTarget.select()}
                        className="flex-1 min-w-0 px-2.5 py-2 rounded-lg border border-primary-200 bg-white text-xs text-ink-700 font-mono outline-none"
                      />
                      <button
                        onClick={handleCopyLink}
                        className={`shrink-0 inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                          linkCopied ? 'bg-accent-100 text-accent-700' : 'bg-primary-600 text-white hover:bg-primary-700'
                        }`}
                      >
                        {linkCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        {linkCopied ? 'Copié' : 'Copier'}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <a
                        href={mailtoHref}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-primary-200 text-primary-700 hover:bg-primary-100 transition-colors"
                      >
                        <Mail className="h-3.5 w-3.5" />
                        Ouvrir dans le client mail
                      </a>
                      {whatsappHref && (
                        <a
                          href={whatsappHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-primary-200 text-primary-700 hover:bg-primary-100 transition-colors"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          Envoyer via WhatsApp
                        </a>
                      )}
                    </div>
                    <p className="text-[10px] text-primary-700/70 mt-3">
                      {savedInvitation
                        ? `Statut : ${invitationStatusStyles[invitationDisplayStatus(savedInvitation)].label}${savedInvitation.expires_at ? ` · Expire le ${new Date(savedInvitation.expires_at).toLocaleDateString('fr-FR')}` : ''}.`
                        : 'Valide 7 jours. Le destinataire crée son mot de passe en ouvrant ce lien.'}
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div className="px-5 py-4 border-t border-ink-100 flex items-center justify-end gap-2">
              {inviteLink ? (
                <button onClick={closeInviteModal} className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700">
                  Fermer
                </button>
              ) : (
                <>
                  <button onClick={closeInviteModal} className="px-4 py-2 rounded-lg text-xs font-semibold text-ink-600 hover:bg-ink-100">
                    Annuler
                  </button>
                  <button
                    onClick={handleCreateInviteLink}
                    disabled={savingInvite || !activeCompany || !invite.name.trim() || !invite.email.trim()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="h-3.5 w-3.5" />
                    {savingInvite ? 'Création...' : "Générer le lien d'invitation"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-ink-600 mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}

function SecurityCard({ icon: Icon, label, value, subValue, color }: { icon: typeof Shield; label: string; value: string; subValue: string; color: 'primary' | 'accent' | 'warning' }) {
  const colorMap = {
    primary: { bg: 'bg-primary-50', text: 'text-primary-600' },
    accent: { bg: 'bg-accent-50', text: 'text-accent-600' },
    warning: { bg: 'bg-warning-50', text: 'text-warning-600' },
  };
  const c = colorMap[color];
  return (
    <div className="bg-white rounded-xl shadow-card border border-ink-200/60 p-4">
      <div className={`h-9 w-9 rounded-lg ${c.bg} flex items-center justify-center mb-3`}>
        <Icon className={`h-4 w-4 ${c.text}`} strokeWidth={2} />
      </div>
      <p className="text-lg font-display font-bold text-ink-900 leading-none">{value}</p>
      <p className="text-xs text-ink-700 mt-1">{label}</p>
      <p className="text-[10px] text-ink-400 mt-0.5">{subValue}</p>
    </div>
  );
}
