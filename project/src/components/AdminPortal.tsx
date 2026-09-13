import { useEffect, useState } from 'react';
import { ArrowLeft, Building2, Check, ChevronDown, ChevronUp, Eye, FileText, Lock, LogOut, Shield, Users, X } from 'lucide-react';
import { firestore } from '@/lib/firebase';

type AdminPortalProps = { onBack: () => void };
type ModerationStatus = 'active' | 'review' | 'suspended';
type Row = Record<string, unknown> & { id: string };
type Tab = 'companies' | 'users' | 'rfqs';

const statusBadge: Record<ModerationStatus, { label: string; bg: string; text: string }> = {
  active: { label: 'Actif', bg: 'bg-accent-100', text: 'text-accent-700' },
  review: { label: 'En revue', bg: 'bg-warning-100', text: 'text-warning-700' },
  suspended: { label: 'Suspendu', bg: 'bg-danger-100', text: 'text-danger-700' },
};

function resolveStatus(value: unknown): ModerationStatus {
  return value === 'review' || value === 'suspended' ? value : 'active';
}

function formatDate(value: unknown): string {
  if (!value || typeof value !== 'string') return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
  return String(value);
}

/** Fields already shown in the row summary — excluded from the "all details" expansion so nothing repeats. */
const HIDDEN_FIELD_KEYS = new Set(['id']);

function isImageField(key: string, value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && /logo|image|photo|avatar/i.test(key);
}

function DetailGrid({ row, statusField }: { row: Row; statusField: string }) {
  const entries = Object.entries(row).filter(([key]) => !HIDDEN_FIELD_KEYS.has(key) && key !== statusField);
  if (entries.length === 0) return <p className="text-xs text-ink-400">Aucune information supplémentaire.</p>;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4 bg-ink-50 rounded-xl">
      {entries.map(([key, value]) => (
        <div key={key} className="min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-wide text-ink-400">{key.replace(/_/g, ' ')}</p>
          {isImageField(key, value) ? (
            <a href={value} target="_blank" rel="noreferrer" className="inline-block mt-1">
              <img src={value} alt={key} className="h-16 w-16 rounded-lg object-cover ring-1 ring-ink-200 hover:ring-primary-400 transition-all" />
            </a>
          ) : (
            <p className="text-xs text-ink-700 break-words">{displayValue(value)}</p>
          )}
        </div>
      ))}
    </div>
  );
}

function ModerationButtons({ status, onChange }: { status: ModerationStatus; onChange: (next: ModerationStatus) => void }) {
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <button
        onClick={() => onChange('active')}
        disabled={status === 'active'}
        className="inline-flex items-center gap-1 rounded-lg bg-accent-600 px-2.5 py-1.5 text-[10px] font-semibold text-white disabled:opacity-40"
      >
        <Check className="h-3 w-3" /> Actif
      </button>
      <button
        onClick={() => onChange('review')}
        disabled={status === 'review'}
        className="inline-flex items-center gap-1 rounded-lg bg-warning-500 px-2.5 py-1.5 text-[10px] font-semibold text-white disabled:opacity-40"
      >
        <Eye className="h-3 w-3" /> En revue
      </button>
      <button
        onClick={() => onChange('suspended')}
        disabled={status === 'suspended'}
        className="inline-flex items-center gap-1 rounded-lg bg-danger-600 px-2.5 py-1.5 text-[10px] font-semibold text-white disabled:opacity-40"
      >
        <X className="h-3 w-3" /> Suspendre
      </button>
    </div>
  );
}

export default function AdminPortal({ onBack }: AdminPortalProps) {
  const [authenticated, setAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('companies');
  const [companies, setCompanies] = useState<Row[]>([]);
  const [users, setUsers] = useState<Row[]>([]);
  const [rfqs, setRfqs] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [companiesRes, usersRes, rfqsRes] = await Promise.all([
      firestore.from<Row>('companies').select(),
      firestore.from<Row>('profiles').select(),
      firestore.from<Row>('rfqs').select(),
    ]);
    setCompanies((companiesRes.data as Row[] | null) ?? []);
    setUsers((usersRes.data as Row[] | null) ?? []);
    setRfqs((rfqsRes.data as Row[] | null) ?? []);
    setLoading(false);
  };

  useEffect(() => { if (authenticated) void load(); }, [authenticated]);

  const login = (event: React.FormEvent) => {
    event.preventDefault();
    if (username.trim() === 'admin' && password === 'admin01') { setAuthenticated(true); setError(''); }
    else setError('Identifiants administrateur incorrects.');
  };

  const updateStatus = async (table: string, id: string, field: string, status: ModerationStatus) => {
    const updates = table === 'companies'
      ? { [field]: status, ...(companies.find((company) => company.id === id)?.account_type === 'institution' ? { account_status: status, institution_status: status } : {}) }
      : { [field]: status };
    await firestore.from(table).update(updates).eq('id', id);
    await load();
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-ink-50 flex items-center justify-center p-6">
        <form onSubmit={login} className="w-full max-w-sm rounded-2xl border border-ink-200 bg-white p-7 shadow-xl">
          <button type="button" onClick={onBack} className="mb-6 flex items-center gap-1 text-xs text-ink-500 hover:text-primary-600">
            <ArrowLeft className="h-4 w-4" /> Retour
          </button>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-600 text-white">
            <Shield className="h-6 w-6" />
          </div>
          <h1 className="text-center text-xl font-bold text-ink-900">Administration de la plateforme</h1>
          <p className="mb-6 mt-1 text-center text-xs text-ink-500">Accès réservé aux administrateurs de l'application.</p>
          <label className="mb-3 block text-xs font-semibold text-ink-600">
            Identifiant
            <input value={username} onChange={(e) => setUsername(e.target.value)} className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2.5 text-sm" />
          </label>
          <label className="mb-4 block text-xs font-semibold text-ink-600">
            Mot de passe
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2.5 text-sm" />
          </label>
          {error && <p className="mb-3 rounded-lg bg-danger-50 px-3 py-2 text-xs font-semibold text-danger-700">{error}</p>}
          <button className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 py-2.5 text-sm font-semibold text-white hover:bg-primary-700">
            <Lock className="h-4 w-4" /> Se connecter
          </button>
        </form>
      </div>
    );
  }

  const companiesByStatus = (s: ModerationStatus) => companies.filter((row) => resolveStatus(row.directory_status) === s);
  const usersByStatus = (s: ModerationStatus) => users.filter((row) => resolveStatus(row.moderation_status) === s);
  const rfqsByStatus = (s: ModerationStatus) => rfqs.filter((row) => resolveStatus(row.moderation_status) === s);

  const tabs: { id: Tab; label: string; icon: typeof Building2; count: number }[] = [
    { id: 'companies', label: 'Annuaire', icon: Building2, count: companies.length },
    { id: 'users', label: 'Utilisateurs', icon: Users, count: users.length },
    { id: 'rfqs', label: "Appels d'offre", icon: FileText, count: rfqs.length },
  ];

  return (
    <div className="min-h-screen bg-ink-50 p-5 md:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary-600">Administration globale</p>
            <h1 className="text-2xl font-bold text-ink-900">Modération de la plateforme</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setAuthenticated(false)} className="inline-flex items-center gap-2 rounded-lg border border-ink-200 bg-white px-3 py-2 text-xs font-semibold text-ink-600">
              <LogOut className="h-4 w-4" /> Déconnexion
            </button>
            <button onClick={onBack} className="inline-flex items-center gap-2 rounded-lg bg-ink-900 px-3 py-2 text-xs font-semibold text-white">
              <X className="h-4 w-4" /> Fermer
            </button>
          </div>
        </header>

        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            ['Entreprises', companies.length],
            ['Utilisateurs', users.length],
            ["Appels d'offre", rfqs.length],
            ['En revue (tous)', companiesByStatus('review').length + usersByStatus('review').length + rfqsByStatus('review').length],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-xl border border-ink-200 bg-white p-4">
              <p className="text-2xl font-bold text-ink-900">{value}</p>
              <p className="text-xs text-ink-500">{label}</p>
            </div>
          ))}
        </div>

        <div className="mb-5 flex items-center gap-1 rounded-2xl border border-ink-200 bg-white p-1.5 w-fit">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                tab === t.id ? 'bg-primary-600 text-white' : 'text-ink-500 hover:bg-ink-100'
              }`}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${tab === t.id ? 'bg-white/20' : 'bg-ink-100'}`}>{t.count}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm text-ink-400">Chargement...</div>
        ) : (
          <>
            {/* ===== ANNUAIRE (companies) ===== */}
            {tab === 'companies' && (
              <section className="rounded-2xl border border-ink-200 bg-white p-5">
                <h2 className="mb-4 text-base font-bold text-ink-900">Entreprises de l'annuaire B2B</h2>
                {companies.length === 0 ? (
                  <p className="text-xs text-ink-500">Aucune entreprise enregistrée.</p>
                ) : (
                  <div className="space-y-2">
                    {companies.map((row) => {
                      const status = resolveStatus(row.directory_status);
                      const badge = statusBadge[status];
                      const expanded = expandedId === row.id;
                      return (
                        <div key={row.id} className="rounded-xl border border-ink-100 overflow-hidden">
                          <div className="flex flex-wrap items-center gap-3 p-3">
                            <button onClick={() => setExpandedId(expanded ? null : row.id)} className="flex items-center gap-2 flex-1 min-w-0 text-left">
                              {expanded ? <ChevronUp className="h-4 w-4 text-ink-400 shrink-0" /> : <ChevronDown className="h-4 w-4 text-ink-400 shrink-0" />}
                              {typeof row.logo_url === 'string' && row.logo_url ? (
                                <img src={row.logo_url} alt="" className="h-8 w-8 rounded-lg object-cover shrink-0 ring-1 ring-ink-200" />
                              ) : (
                                <div className="h-8 w-8 rounded-lg bg-ink-100 flex items-center justify-center shrink-0">
                                  <Building2 className="h-4 w-4 text-ink-400" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-ink-800 truncate">{displayValue(row.name)}</p>
                                <p className="text-[10px] text-ink-500 truncate">
                                  {displayValue(row.organization_type)} · {displayValue(row.city)}, {displayValue(row.country)} · {displayValue(row.primary_admin_email)}
                                </p>
                              </div>
                            </button>
                            <span className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.bg} ${badge.text}`}>{badge.label}</span>
                            <ModerationButtons status={status} onChange={(next) => void updateStatus('companies', row.id, 'directory_status', next)} />
                          </div>
                          {expanded && <div className="px-3 pb-3"><DetailGrid row={row} statusField="directory_status" /></div>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            )}

            {/* ===== UTILISATEURS (profiles) ===== */}
            {tab === 'users' && (
              <section className="rounded-2xl border border-ink-200 bg-white p-5">
                <h2 className="mb-4 text-base font-bold text-ink-900">Utilisateurs enregistrés</h2>
                {users.length === 0 ? (
                  <p className="text-xs text-ink-500">Aucun utilisateur enregistré.</p>
                ) : (
                  <div className="space-y-2">
                    {users.map((row) => {
                      const status = resolveStatus(row.moderation_status);
                      const badge = statusBadge[status];
                      const expanded = expandedId === row.id;
                      return (
                        <div key={row.id} className="rounded-xl border border-ink-100 overflow-hidden">
                          <div className="flex flex-wrap items-center gap-3 p-3">
                            <button onClick={() => setExpandedId(expanded ? null : row.id)} className="flex items-center gap-2 flex-1 min-w-0 text-left">
                              {expanded ? <ChevronUp className="h-4 w-4 text-ink-400 shrink-0" /> : <ChevronDown className="h-4 w-4 text-ink-400 shrink-0" />}
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-ink-800 truncate">{displayValue(row.full_name)}</p>
                                <p className="text-[10px] text-ink-500 truncate">
                                  {displayValue(row.email)} · {displayValue(row.role_label)} · {displayValue(row.company_name)}
                                </p>
                              </div>
                            </button>
                            <span className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.bg} ${badge.text}`}>{badge.label}</span>
                            <ModerationButtons status={status} onChange={(next) => void updateStatus('profiles', row.id, 'moderation_status', next)} />
                          </div>
                          {expanded && <div className="px-3 pb-3"><DetailGrid row={row} statusField="moderation_status" /></div>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            )}

            {/* ===== APPELS D'OFFRE (rfqs) ===== */}
            {tab === 'rfqs' && (
              <section className="rounded-2xl border border-ink-200 bg-white p-5">
                <h2 className="mb-4 text-base font-bold text-ink-900">Appels d'offre publiés</h2>
                {rfqs.length === 0 ? (
                  <p className="text-xs text-ink-500">Aucun appel d'offre enregistré.</p>
                ) : (
                  <div className="space-y-2">
                    {rfqs.map((row) => {
                      const status = resolveStatus(row.moderation_status);
                      const badge = statusBadge[status];
                      const expanded = expandedId === row.id;
                      return (
                        <div key={row.id} className="rounded-xl border border-ink-100 overflow-hidden">
                          <div className="flex flex-wrap items-center gap-3 p-3">
                            <button onClick={() => setExpandedId(expanded ? null : row.id)} className="flex items-center gap-2 flex-1 min-w-0 text-left">
                              {expanded ? <ChevronUp className="h-4 w-4 text-ink-400 shrink-0" /> : <ChevronDown className="h-4 w-4 text-ink-400 shrink-0" />}
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-ink-800 truncate">{displayValue(row.title)}</p>
                                <p className="text-[10px] text-ink-500 truncate">
                                  {displayValue(row.reference)} · Créé par {displayValue(row.createdBy)} le {formatDate(row.createdDate)} · Échéance {formatDate(row.deadline)}
                                </p>
                              </div>
                            </button>
                            <span className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.bg} ${badge.text}`}>{badge.label}</span>
                            <ModerationButtons status={status} onChange={(next) => void updateStatus('rfqs', row.id, 'moderation_status', next)} />
                          </div>
                          {expanded && <div className="px-3 pb-3"><DetailGrid row={row} statusField="moderation_status" /></div>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
