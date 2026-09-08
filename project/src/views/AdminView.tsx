import {
  Shield,
  Users,
  Lock,
  ScrollText,
  CheckCircle2,
  XCircle,
  Bell,
  History,
  Database,
  Download,
  KeyRound,
  Clock,
} from 'lucide-react';
import { teamMembers, rolePermissions, escalationRules } from '@/data';
import { Avatar } from '@/components/Badges';

export function AdminView() {
  return (
    <div className="p-6 space-y-6 animate-fade-in max-w-[1600px] mx-auto">
      {/* Security overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SecurityCard icon={Users} label="Utilisateurs" value={teamMembers.length.toString()} subValue={`${teamMembers.filter((u) => u.role === 'external').length} externes`} color="primary" />
        <SecurityCard icon={Shield} label="Rôles" value={rolePermissions.length.toString()} subValue="Niveaux d'accès" color="accent" />
        <SecurityCard icon={KeyRound} label="Auth. renforcée" value="Active" subValue="2FA requis" color="warning" />
        <SecurityCard icon={Database} label="Sauvegardes" value="Quotidiennes" subValue="Dernière: aujourd'hui" color="primary" />
      </div>

      {/* Team members */}
      <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 overflow-hidden">
        <div className="px-5 py-4 border-b border-ink-100 flex items-center justify-between">
          <div>
            <h2 className="font-display font-bold text-ink-900 text-base">Équipe</h2>
            <p className="text-xs text-ink-500">Membres, rôles et activité</p>
          </div>
          <button className="text-xs font-semibold text-primary-600 hover:text-primary-700">+ Inviter</button>
        </div>
        <div className="divide-y divide-ink-100">
          {teamMembers.map((member) => (
            <div key={member.id} className="px-5 py-3.5 flex items-center gap-4 hover:bg-ink-50/50 transition-colors">
              <Avatar name={member.name} color={member.avatarColor} size="md" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-ink-800">{member.name}</p>
                <p className="text-[10px] text-ink-500">{member.email}</p>
              </div>
              <div className="hidden md:block text-right">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  member.role === 'super_admin' ? 'bg-danger-100 text-danger-700' :
                  member.role === 'dg' ? 'bg-primary-100 text-primary-700' :
                  member.role === 'manager' ? 'bg-accent-100 text-accent-700' :
                  member.role === 'collaborator' ? 'bg-ink-100 text-ink-600' : 'bg-warning-100 text-warning-700'
                }`}>
                  {member.roleLabel}
                </span>
                <p className="text-[10px] text-ink-400 mt-0.5">{member.department}</p>
              </div>
              <div className="hidden lg:block text-right">
                <p className="text-xs font-medium text-ink-700">{member.documentCount} docs</p>
                <p className="text-[10px] text-ink-400">{member.taskCount} tâches</p>
              </div>
              <div className="text-right shrink-0">
                <span className={`text-[10px] font-medium ${member.lastActive === 'En ligne' ? 'text-accent-600' : 'text-ink-400'}`}>
                  {member.lastActive === 'En ligne' && <span className="h-1.5 w-1.5 rounded-full bg-accent-500 inline-block mr-1 animate-pulse-soft" />}
                  {member.lastActive}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Roles & permissions */}
      <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 overflow-hidden">
        <div className="px-5 py-4 border-b border-ink-100">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-primary-600" />
            <h2 className="font-display font-bold text-ink-900 text-base">Rôles et permissions</h2>
          </div>
          <p className="text-xs text-ink-500">Permissions par rôle — indispensable pour vendre aux entreprises</p>
        </div>
        <div className="divide-y divide-ink-100">
          {rolePermissions.map((role) => (
            <div key={role.role} className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${
                      role.role === 'super_admin' ? 'bg-danger-500' :
                      role.role === 'dg' ? 'bg-primary-500' :
                      role.role === 'manager' ? 'bg-accent-500' :
                      role.role === 'collaborator' ? 'bg-ink-400' : 'bg-warning-500'
                    }`} />
                    <span className="text-sm font-bold text-ink-800">{role.roleLabel}</span>
                    <span className="text-[10px] font-bold text-ink-500 bg-ink-100 px-1.5 py-0.5 rounded">{role.userCount} utilisateur{role.userCount > 1 ? 's' : ''}</span>
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
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Escalation rules */}
        <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 overflow-hidden">
          <div className="px-5 py-4 border-b border-ink-100">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-warning-600" />
              <h2 className="font-display font-bold text-ink-900 text-base">Règles d'escalade</h2>
            </div>
            <p className="text-xs text-ink-500">L'entreprise définit ses propres règles de rappel</p>
          </div>
          <div className="p-4 space-y-2">
            {escalationRules.map((rule) => (
              <div key={rule.id} className={`flex items-center gap-3 p-3 rounded-xl border ${rule.trigger === 'J+1 après échéance' ? 'border-danger-200 bg-danger-50/30' : 'border-ink-200/60'}`}>
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                  rule.trigger === 'J+1 après échéance' ? 'bg-danger-100' :
                  rule.trigger === 'Jour J' ? 'bg-warning-100' : 'bg-primary-100'
                }`}>
                  <Clock className={`h-4 w-4 ${
                    rule.trigger === 'J+1 après échéance' ? 'text-danger-600' :
                    rule.trigger === 'Jour J' ? 'text-warning-600' : 'text-primary-600'
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

        {/* Security & compliance */}
        <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 overflow-hidden">
          <div className="px-5 py-4 border-b border-ink-100">
            <div className="flex items-center gap-2">
              <ScrollText className="h-4 w-4 text-accent-600" />
              <h2 className="font-display font-bold text-ink-900 text-base">Sécurité et conformité</h2>
            </div>
            <p className="text-xs text-ink-500">Contrôle et traçabilité</p>
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
    </div>
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
