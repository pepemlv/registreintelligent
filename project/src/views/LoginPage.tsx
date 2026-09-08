import { useState } from 'react';
import { FileText, Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft, Shield, Zap, Sparkles } from 'lucide-react';

interface LoginPageProps {
  onLogin: () => void;
  onBack: () => void;
}

export function LoginPage({ onLogin, onBack }: LoginPageProps) {
  const [email, setEmail] = useState('pierre.durand@xyz.cd');
  const [password, setPassword] = useState('demo1234');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    setTimeout(() => {
      onLogin();
    }, 900);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:flex-1 relative overflow-hidden bg-gradient-to-br from-ink-900 via-ink-800 to-primary-900">
        <div className="absolute inset-0 grid-pattern opacity-10" />
        <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-primary-500/15 blur-3xl" />
        <div className="absolute bottom-0 -left-20 h-[400px] w-[400px] rounded-full bg-accent-500/10 blur-3xl" />

        <div className="relative flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-lg">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <span className="font-display font-bold text-white text-xl">Registre intelligent</span>
          </div>

          {/* Content */}
          <div className="max-w-md">
            <h1 className="font-display text-3xl font-bold text-white leading-tight mb-4">
              La plateforme IA qui lit, classe et fait avancer vos documents
            </h1>
            <p className="text-sm text-white/60 leading-relaxed mb-8">
              Centralisez courriers entrants et sortants, factures, proformas, projets et travail de groupe.
              L'IA résume, détecte les délais, prépare les rappels et répond à vos questions.
            </p>
            <div className="space-y-3">
              {[
                { icon: Zap, text: 'Lecture, résumé et tri automatique' },
                { icon: Shield, text: 'Délais, rappels, sécurité et rôles personnalisés' },
                { icon: Sparkles, text: 'Collaboration de groupe et dialogue avec les documents' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center shrink-0">
                    <item.icon className="h-4 w-4 text-accent-400" />
                  </div>
                  <span className="text-xs text-white/70">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom stats */}
          <div className="flex items-center gap-6">
            <div>
              <p className="font-display text-xl font-bold text-white">200+</p>
              <p className="text-[10px] text-white/40">entreprises</p>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div>
              <p className="font-display text-xl font-bold text-white">48K+</p>
              <p className="text-[10px] text-white/40">documents</p>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div>
              <p className="font-display text-xl font-bold text-white">96%</p>
              <p className="text-[10px] text-white/40">précision IA</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-ink-50">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2 mb-8 justify-center">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary-600 to-accent-600 flex items-center justify-center">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <span className="font-display font-bold text-ink-900 text-xl">Registre intelligent</span>
          </div>

          <button onClick={onBack} className="text-xs font-medium text-ink-500 hover:text-primary-600 flex items-center gap-1.5 mb-6">
            <ArrowLeft className="h-3.5 w-3.5" /> Retour au site
          </button>

          <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 p-8">
            <h2 className="font-display text-xl font-bold text-ink-900 mb-1">Connexion</h2>
            <p className="text-xs text-ink-500 mb-6">Accédez à votre espace de travail Registre intelligent</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-ink-600 mb-1.5 block">E-mail professionnel</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="vous@entreprise.cd"
                    required
                    className="w-full pl-10 pr-3 py-2.5 bg-ink-50 rounded-xl border border-ink-200 text-sm outline-none focus:border-primary-400 transition-colors"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-ink-600">Mot de passe</label>
                  <button type="button" className="text-[10px] font-semibold text-primary-600 hover:text-primary-700">Mot de passe oublié ?</button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-10 pr-10 py-2.5 bg-ink-50 rounded-xl border border-ink-200 text-sm outline-none focus:border-primary-400 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" defaultChecked className="text-primary-600 rounded" />
                <span className="text-xs text-ink-600">Se souvenir de moi</span>
              </label>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-primary-600 to-accent-600 hover:shadow-lg shadow-primary-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {loading ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Connexion en cours...
                  </>
                ) : (
                  <>
                    Se connecter
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-ink-100" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-3 text-[10px] text-ink-400 uppercase tracking-wide">ou</span>
              </div>
            </div>

            <p className="text-center text-xs text-ink-500">
              Pas encore de compte ?{' '}
              <button onClick={onLogin} className="font-bold text-primary-600 hover:text-primary-700">Créer un compte</button>
            </p>
          </div>

          <p className="text-center text-[10px] text-ink-400 mt-6">
            En vous connectant, vous acceptez nos{' '}
            <a href="#" className="underline hover:text-ink-600">CGU</a> et notre{' '}
            <a href="#" className="underline hover:text-ink-600">politique de confidentialité</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
