import type { ReactNode } from 'react';
import { Bell, LogOut, Menu, Search, Sparkles } from 'lucide-react';
import { Avatar } from './Badges';

interface TopBarProps {
  title: string;
  subtitle: string;
  onToggleSidebar: () => void;
  onAnalyze?: () => void;
  onSignOut?: () => void;
  userLabel?: string;
  userRole?: string;
  /** Rendered instead of the "Analyser" button while an upload/analysis is minimized in the background. */
  uploadProgress?: ReactNode;
}

export function TopBar({
  title,
  subtitle,
  onToggleSidebar,
  onAnalyze,
  onSignOut,
  userLabel = 'Utilisateur',
  userRole = 'Directeur Général',
  uploadProgress,
}: TopBarProps) {
  return (
    <header className="h-16 bg-white/80 backdrop-blur-xl border-b border-ink-200/60 sticky top-0 z-30 flex items-center px-4 gap-4">
      <button
        onClick={onToggleSidebar}
        className="p-2 rounded-lg hover:bg-ink-100 transition-colors text-ink-600"
        aria-label="Afficher ou masquer le menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex-1 min-w-0">
        <h1 className="font-display font-bold text-ink-900 text-lg leading-tight truncate">{title}</h1>
        <p className="text-xs text-ink-500 truncate hidden sm:block">{subtitle}</p>
      </div>

      <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-ink-50 rounded-xl border border-ink-200 w-64 lg:w-80">
        <Search className="h-4 w-4 text-ink-400 shrink-0" />
        <input
          type="text"
          placeholder="Rechercher un document..."
          className="bg-transparent text-sm outline-none flex-1 placeholder:text-ink-400 text-ink-700"
        />
      </div>

      <button className="relative p-2 rounded-lg hover:bg-ink-100 transition-colors text-ink-600" aria-label="Notifications">
        <Bell className="h-5 w-5" />
        <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-danger-500 ring-2 ring-white" />
      </button>

      {uploadProgress ? (
        <div className="hidden sm:block">{uploadProgress}</div>
      ) : (
        <button
          onClick={onAnalyze}
          className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 text-white text-sm font-semibold shadow-lg shadow-primary-600/20 hover:shadow-primary-600/40 transition-all hover:scale-[1.02]"
        >
          <Sparkles className="h-4 w-4" />
          <span className="hidden lg:inline">Analyser</span>
        </button>
      )}

      <div className="flex items-center gap-2 pl-3 border-l border-ink-200">
        <Avatar name={userLabel} color="bg-ink-700" size="sm" />
        <div className="hidden lg:block leading-tight">
          <p className="text-xs font-semibold text-ink-800 truncate max-w-40">{userLabel}</p>
          <p className="text-[10px] text-ink-500">{userRole}</p>
        </div>
        <button
          onClick={onSignOut}
          className="flex items-center gap-1.5 p-2 lg:px-3 rounded-lg hover:bg-danger-50 transition-colors text-ink-500 hover:text-danger-600"
          aria-label="Se déconnecter"
          title="Se déconnecter"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden lg:inline text-xs font-semibold">Déconnexion</span>
        </button>
      </div>
    </header>
  );
}
