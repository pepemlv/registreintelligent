import {
  LayoutDashboard,
  Inbox,
  FolderKanban,
  CheckSquare,
  Users,
  ArrowRightLeft,
  FileText,
  Archive,
  BarChart3,
  Sparkles,
  Settings,
  Shield,
  ShoppingCart,
} from 'lucide-react';

export type View =
  | 'dashboard'
  | 'courriers'
  | 'dossiers'
  | 'taches'
  | 'achats'
  | 'collaboration'
  | 'b2b'
  | 'rapports'
  | 'archive'
  | 'performance'
  | 'assistant'
  | 'voice'
  | 'admin'
  | 'inbox'
  | 'search'
  | 'folders'
  | 'bills'
  | 'reminders';

interface SidebarProps {
  view: View;
  onNavigate: (view: View) => void;
  collapsed: boolean;
}

const navSections: {
  label?: string;
  items: { id: View; label: string; icon: typeof LayoutDashboard; badge?: number }[];
}[] = [
  {
    items: [
      { id: 'dashboard', label: 'Accueil', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Registre',
    items: [
      { id: 'courriers', label: 'Registre intelligent', icon: Inbox, badge: 18 },
      { id: 'dossiers', label: 'Dossiers', icon: FolderKanban },
      { id: 'taches', label: 'Tâches', icon: CheckSquare, badge: 7 },
    ],
  },
  {
    label: 'Achats',
    items: [
      { id: 'achats', label: 'Demandes de cotation', icon: ShoppingCart, badge: 2 },
    ],
  },
  {
    label: 'Collaboration',
    items: [
      { id: 'collaboration', label: 'Collaboration', icon: Users },
      { id: 'b2b', label: 'Réseau B2B', icon: ArrowRightLeft },
      { id: 'rapports', label: 'Rapports', icon: FileText },
    ],
  },
  {
    label: 'Pilotage',
    items: [
      { id: 'archive', label: 'Archives', icon: Archive },
      { id: 'performance', label: 'Performance', icon: BarChart3 },
      { id: 'assistant', label: 'Copilote IA', icon: Sparkles },
      { id: 'admin', label: 'Administration', icon: Shield },
    ],
  },
];

export function Sidebar({ view, onNavigate, collapsed }: SidebarProps) {
  return (
    <aside
      className={`${
        collapsed ? 'w-[68px]' : 'w-[248px]'
      } shrink-0 transition-all duration-300 bg-ink-900 flex flex-col h-screen sticky top-0`}
    >
      <div className="h-16 flex items-center gap-3 px-4 border-b border-white/10">
        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center shrink-0 shadow-lg shadow-primary-500/20">
          <FileText className="h-5 w-5 text-white" strokeWidth={2.5} />
        </div>
        {!collapsed && (
          <div className="animate-fade-in overflow-hidden">
            <p className="font-display font-bold text-white text-sm leading-tight">Registre intelligent</p>
            <p className="text-[10px] text-ink-400 leading-tight">Gestion intelligente</p>
          </div>
        )}
      </div>

      <nav className="flex-1 py-3 px-3 overflow-y-auto scrollbar-thin">
        {navSections.map((section, si) => (
          <div key={si} className="mb-3">
            {!collapsed && section.label && (
              <p className="px-3 mb-1.5 text-[9px] font-bold uppercase tracking-wider text-ink-500">
                {section.label}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = view === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 group relative ${
                      active
                        ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-lg shadow-primary-900/50'
                        : 'text-ink-400 hover:bg-white/5 hover:text-white'
                    }`}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon className={`h-[18px] w-[18px] shrink-0 ${active ? '' : 'group-hover:scale-110 transition-transform'}`} strokeWidth={2} />
                    {!collapsed && <span className="flex-1 text-left truncate">{item.label}</span>}
                    {!collapsed && item.badge && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        active ? 'bg-white/20 text-white' : 'bg-ink-700 text-ink-300'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                    {collapsed && item.badge && (
                      <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-accent-400 animate-pulse-soft" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-white/10">
        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-ink-400 hover:bg-white/5 hover:text-white transition-all">
          <Settings className="h-5 w-5 shrink-0" strokeWidth={2} />
          {!collapsed && <span>Paramètres</span>}
        </button>

        {!collapsed && (
          <div className="mt-3 p-3 rounded-xl bg-gradient-to-br from-primary-600/20 to-accent-600/20 border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-accent-400 to-primary-400 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <span className="text-xs font-semibold text-white">Plan Pro</span>
            </div>
            <p className="text-[10px] text-ink-400 leading-relaxed mb-2">
              IA illimitée, archivage cloud et collaboration externe.
            </p>
            <button className="text-[10px] font-bold text-accent-400 hover:text-accent-300 transition-colors">
              Gérer l'abonnement →
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
