import { useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  Inbox,
  FolderKanban,
  CheckSquare,
  Users,
  FileText,
  Archive,
  BarChart3,
  Sparkles,
  Settings,
  Shield,
  ShoppingCart,
  Trash2,
  Briefcase,
  Package,
  ContactRound,
  Building2,
  Rocket,
  PanelLeftClose,
} from 'lucide-react';

export type View =
  | 'dashboard'
  | 'courriers'
  | 'dossiers'
  | 'taches'
  | 'achats'
  | 'b2b-catalog'
  | 'directory'
  | 'institutions'
  | 'projects'
  | 'b2b'
  | 'b2b-opportunities'
  | 'b2b-partners'
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
  | 'reminders'
  | 'settings'
  | 'trash';

interface SidebarProps {
  view: View;
  onNavigate: (view: View) => void;
  collapsed: boolean;
  onCollapse: () => void;
  canSeeTrash?: boolean;
  documentCount?: number;
  taskCount?: number;
  isInstitutionAccount?: boolean;
}

function buildNavSections(canSeeTrash: boolean, isInstitutionAccount: boolean): {
  label?: string;
  items: { id: View; label: string; icon: typeof LayoutDashboard; badge?: number }[];
}[] {
  return [
    {
      items: [
        { id: 'dashboard', label: 'Accueil', icon: LayoutDashboard },
      ],
    },
    {
      label: 'Registre',
      items: [
        { id: 'courriers', label: 'Courriers intelligents', icon: Inbox, badge: 18 },
        { id: 'dossiers', label: 'Dossiers', icon: FolderKanban },
        { id: 'taches', label: 'Tâches', icon: CheckSquare, badge: 7 },
      ],
    },
    {
      label: 'B2B',
      items: [
        { id: 'b2b-catalog', label: 'Mes produits & services', icon: Package },
        { id: 'directory', label: 'Annuaire', icon: ContactRound },
        { id: 'achats', label: 'Demandes de cotation intelligentes', icon: ShoppingCart },
        { id: 'b2b-opportunities', label: 'Opportunités', icon: Briefcase },
        { id: 'b2b-partners', label: 'Prestataires', icon: Users },
      ],
    },
    {
      label: 'Projets',
      items: [
        { id: 'projects', label: 'Projets', icon: Rocket },
        { id: 'rapports', label: 'Rapports', icon: FileText },
      ],
    },
    ...(isInstitutionAccount ? [{ label: 'Inter-institutions', items: [{ id: 'institutions' as View, label: 'Institutions', icon: Building2 }] }] : []),
    {
      label: 'Pilotage',
      items: [
        { id: 'archive', label: 'Archives', icon: Archive },
        { id: 'performance', label: 'Performance', icon: BarChart3 },
        { id: 'assistant', label: 'Copilote IA', icon: Sparkles },
        { id: 'admin', label: 'Administration de l’entreprise', icon: Shield },
        ...(canSeeTrash ? [{ id: 'trash' as View, label: 'Corbeille', icon: Trash2 }] : []),
      ],
    },
  ];
}

export function Sidebar({ view, onNavigate, collapsed, onCollapse, canSeeTrash = false, documentCount = 0, taskCount = 0, isInstitutionAccount = false }: SidebarProps) {
  const sidebarRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (collapsed) return;

    const handleOutsideClick = (event: PointerEvent) => {
      if (!window.matchMedia('(max-width: 767px)').matches) return;
      if (event.target instanceof Node && !sidebarRef.current?.contains(event.target)) {
        onCollapse();
      }
    };

    document.addEventListener('pointerdown', handleOutsideClick);
    return () => document.removeEventListener('pointerdown', handleOutsideClick);
  }, [collapsed, onCollapse]);

  const navSections = buildNavSections(canSeeTrash, isInstitutionAccount).map((section) => ({
    ...section,
    items: section.items.map((item) => item.id === 'courriers'
      ? { ...item, badge: documentCount }
      : item.id === 'taches' ? { ...item, badge: taskCount } : item),
  }));
  return (
    <aside
      ref={sidebarRef}
      style={{ width: collapsed ? 68 : 248 }}
      className="shrink-0 overflow-hidden transition-[width] duration-500 ease-in-out bg-ink-900 flex flex-col h-screen sticky top-0"
    >
      <div className="h-16 flex items-center gap-3 px-4 border-b border-white/10">
        <img src="/logo-registre.png" alt="" className="h-9 w-9 shrink-0 rounded-lg bg-white object-contain p-0.5 shadow-lg" />
        {!collapsed && (
          <div className="animate-fade-in min-w-0 flex-1 overflow-hidden">
            <p className="font-display font-bold text-white text-sm leading-tight">Registre intelligent</p>
            <p className="text-[10px] text-ink-400 leading-tight">Gestion intelligente</p>
          </div>
        )}
        {!collapsed && (
          <button
            type="button"
            onClick={onCollapse}
            aria-label="Réduire le menu"
            title="Réduire le menu"
            className="ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-300 transition-colors hover:bg-white/10 hover:text-white md:hidden"
          >
            <PanelLeftClose className="h-5 w-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 py-3 px-3 overflow-y-auto scrollbar-thin">
        {navSections.map((section, si) => (
          <div key={si} className="mb-3">
            {!collapsed && section.label && (
              <p className="px-3 mb-1.5 text-xs font-bold uppercase tracking-wider text-white">
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
        <button onClick={() => onNavigate('settings')} className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all ${view === 'settings' ? 'bg-white/10 text-white' : 'text-ink-400 hover:bg-white/5 hover:text-white'}`}>
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
