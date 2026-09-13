import { useEffect, useState, type FormEvent } from 'react';
import { ShieldCheck, AlertTriangle, Loader2 } from 'lucide-react';
import {
  acceptInvitation, findInvitationByToken, firebaseAuthErrorMessage, invitationStatus, type InvitationRecord,
} from '@/lib/invitations';

interface AcceptInviteProps {
  token: string;
  onDone: () => void;
}

export default function AcceptInvite({ token, onDone }: AcceptInviteProps) {
  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<InvitationRecord | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    findInvitationByToken(token)
      .then((result) => { if (!cancelled) setInvitation(result); })
      .catch(() => { if (!cancelled) setInvitation(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token]);

  const status = invitation ? invitationStatus(invitation) : null;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!invitation) return;
    setError(null);
    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    setSubmitting(true);
    try {
      await acceptInvitation(invitation, password);
      onDone();
    } catch (err) {
      setError(firebaseAuthErrorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-ink-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2.5 mb-6 justify-center">
          <img src="/logo-registre.png" alt="" className="h-9 w-9 rounded-lg bg-white object-contain p-0.5 shadow-sm" />
          <span className="font-display font-bold text-ink-900">Registre intelligent</span>
        </div>

        <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 p-6">
          {loading && (
            <div className="py-10 text-center">
              <Loader2 className="h-6 w-6 text-primary-500 animate-spin mx-auto mb-3" />
              <p className="text-sm text-ink-500">Vérification de l'invitation...</p>
            </div>
          )}

          {!loading && (!invitation || status !== 'valid') && (
            <div className="py-6 text-center">
              <div className="h-12 w-12 rounded-2xl bg-warning-50 mx-auto flex items-center justify-center mb-4">
                <AlertTriangle className="h-6 w-6 text-warning-600" />
              </div>
              <h1 className="font-display font-bold text-ink-900 text-lg mb-1">
                {!invitation && "Invitation introuvable"}
                {invitation && status === 'expired' && 'Invitation expirée'}
                {invitation && status === 'used' && 'Invitation déjà utilisée'}
              </h1>
              <p className="text-sm text-ink-500 mb-5">
                {!invitation && "Ce lien d'invitation n'est plus valide. Demandez un nouveau lien à votre administrateur."}
                {invitation && status === 'expired' && "Ce lien a expiré (validité 7 jours). Demandez à votre administrateur de vous envoyer une nouvelle invitation."}
                {invitation && status === 'used' && "Ce lien a déjà été utilisé pour créer un compte. Connectez-vous normalement."}
              </p>
              <button
                onClick={onDone}
                className="px-4 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition-colors"
              >
                Retour à l'accueil
              </button>
            </div>
          )}

          {!loading && invitation && status === 'valid' && (
            <>
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck className="h-4 w-4 text-accent-600" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-accent-600">Invitation vérifiée</span>
              </div>
              <h1 className="font-display font-bold text-ink-900 text-lg mb-1">Bonjour {invitation.full_name}</h1>
              <p className="text-sm text-ink-500 mb-5">
                Vous avez été invité(e) à rejoindre <span className="font-semibold text-ink-700">{invitation.company_name || 'votre organisation'}</span> en tant que <span className="font-semibold text-ink-700">{invitation.role_label}</span>
                {invitation.unit && <> — unité <span className="font-semibold text-ink-700">{invitation.unit}</span></>}.
                Créez un mot de passe pour activer votre compte ({invitation.email}).
              </p>

              <form onSubmit={handleSubmit}>
                <label className="text-xs text-ink-400 font-medium uppercase mb-1 block">Mot de passe</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  required
                  className="w-full px-3 py-2.5 bg-ink-50 border border-ink-200 rounded-lg text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-primary-300"
                />
                <label className="text-xs text-ink-400 font-medium uppercase mb-1 block">Confirmer le mot de passe</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={6}
                  required
                  className="w-full px-3 py-2.5 bg-ink-50 border border-ink-200 rounded-lg text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-primary-300"
                />

                {error && <div className="text-sm text-danger-600 mb-4">{error}</div>}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full px-4 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 disabled:opacity-50 transition-colors"
                >
                  {submitting ? 'Création du compte...' : "Accepter l'invitation et créer mon compte"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
