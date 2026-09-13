import { useState, type ReactNode } from 'react';
import { Bell, Check, LogOut, Menu, Search, Sparkles, X } from 'lucide-react';
import { Avatar } from './Badges';

interface NotificationSummary {
  id: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

interface TopBarProps {
  title: string;
  subtitle: string;
  onToggleSidebar: () => void;
  onAnalyze?: () => void;
  onSignOut?: () => void;
  userLabel?: string;
  userRole?: string;
  compact?: boolean;
  /** Rendered instead of the "Analyser" button while an upload/analysis is minimized in the background. */
  uploadProgress?: ReactNode;
  notifications?: NotificationSummary[];
  onNotificationRead?: (notificationId: string) => void | Promise<void>;
}

export function TopBar({
  title,
  subtitle,
  onToggleSidebar,
  onAnalyze,
  onSignOut,
  userLabel = 'Utilisateur',
  compact = false,
  userRole = 'Directeur Général',
  uploadProgress,
  notifications = [],
  onNotificationRead,
}: TopBarProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const unreadCount = notifications.filter((notification) => !notification.read).length;
  return (
    <header className={`shrink-0 ${compact ? 'h-12 sm:h-16' : 'h-16'} bg-white/80 backdrop-blur-xl border-b border-ink-200/60 sticky top-0 z-30 flex items-center px-2 sm:px-4 gap-2 sm:gap-4`}>
      <button
        onClick={onToggleSidebar}
        className="p-2 rounded-lg hover:bg-ink-100 transition-colors text-ink-600"
        aria-label="Afficher ou masquer le menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className={`flex-1 min-w-0 ${compact ? 'max-sm:hidden' : ''}`}>
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

      <div className="relative">
      <button onClick={() => setShowNotifications((visible) => !visible)} className="relative p-2 rounded-lg hover:bg-ink-100 transition-colors text-ink-600" aria-label="Notifications">
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-danger-500 text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white">{unreadCount}</span>}
      </button>
      {showNotifications && (
        <div className="absolute right-0 top-full mt-2 z-50 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-ink-200 bg-white shadow-2xl p-3">
          <div className="flex items-center justify-between px-1 mb-2">
            <p className="text-sm font-bold text-ink-800">Alertes</p>
            <button onClick={() => setShowNotifications(false)} className="p-1 rounded-lg text-ink-400 hover:bg-ink-100" aria-label="Fermer les alertes"><X className="h-4 w-4" /></button>
          </div>
          {notifications.length === 0 ? (
            <p className="px-1 py-5 text-xs text-ink-400 text-center">Aucune alerte.</p>
          ) : (
            <div className="space-y-1.5 max-h-72 overflow-y-auto">
              {notifications.slice(0, 8).map((notification) => (
                <button key={notification.id} onClick={() => onNotificationRead?.(notification.id)} className={`w-full text-left rounded-xl p-2.5 border transition-colors ${notification.read ? 'border-ink-100 bg-white' : 'border-primary-100 bg-primary-50 hover:bg-primary-100'}`}>
                  <div className="flex items-start gap-2">
                    <Check className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${notification.read ? 'text-ink-300' : 'text-primary-600'}`} />
                    <span className="min-w-0"><span className="block text-xs font-semibold text-ink-800">{notification.title}</span><span className="block text-[11px] text-ink-500 mt-0.5">{notification.message}</span></span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      </div>

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
