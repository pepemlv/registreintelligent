import {
  Sparkles,
  ArrowRight,
  FileText,
  Brain,
  Zap,
  Shield,
  Building2,
  Users,
  ShoppingCart,
  TrendingUp,
  CheckCircle2,
  ArrowLeftRight,
  Bot,
  Layers,
  Star,
  Quote,
} from 'lucide-react';

interface LandingPageProps {
  onLogin: () => void;
}

export function LandingPage({ onLogin }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-lg border-b border-ink-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary-600 to-accent-600 flex items-center justify-center shadow-lg shadow-primary-600/20">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <span className="font-display font-bold text-ink-900 text-lg">Registre intelligent</span>
          </div>
          <div className="hidden md:flex items-center gap-7">
            <a href="#features" className="text-sm font-medium text-ink-600 hover:text-primary-600 transition-colors">Fonctionnalités</a>
            <a href="#b2b" className="text-sm font-medium text-ink-600 hover:text-primary-600 transition-colors">Réseau B2B</a>
            <a href="#how" className="text-sm font-medium text-ink-600 hover:text-primary-600 transition-colors">Comment ça marche</a>
            <a href="#pricing" className="text-sm font-medium text-ink-600 hover:text-primary-600 transition-colors">Tarifs</a>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onLogin} className="text-sm font-semibold text-ink-600 hover:text-primary-600 px-3 py-2 transition-colors">
              Se connecter
            </button>
            <button onClick={onLogin} className="text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 px-4 py-2 rounded-xl transition-colors shadow-lg shadow-primary-600/20">
              Essai gratuit
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative min-h-[680px] pt-32 pb-20 lg:pt-40 lg:pb-28 overflow-hidden">
        <picture className="absolute inset-0">
          <source media="(min-width: 768px)" srcSet="/hero%20pc.png" />
          <img
            src="/hero%20mboile.png"
            alt=""
            className="h-full w-full object-cover"
          />
        </picture>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl lg:max-w-[35vw] animate-slide-up">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-50 border border-primary-200 mb-6">
                <Sparkles className="h-3.5 w-3.5 text-primary-600" />
                <span className="text-xs font-semibold text-primary-700">Réseau B2B intelligent intégré</span>
              </div>
              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-black leading-[1.12] mb-6">
                Vos documents ne sont plus seulement enregistrés.
                <span className="block mt-2 text-black">
                  Ils sont suivis jusqu'à leur traitement.
                </span>
              </h1>
              <p className="text-base lg:text-lg text-ink-500 leading-relaxed mb-8 max-w-xl">
                Registre Intelligent centralise vos courriers, factures, contrats et demandes de cotation.
                L'IA lit, résume, classe, détecte les échéances et suit chaque document de sa réception jusqu'à son
                traitement et son archivage.
              </p>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <button onClick={onLogin} className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-primary-600 to-accent-600 shadow-xl shadow-primary-600/25 hover:shadow-primary-600/40 transition-all group">
                  Commencer gratuitement
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </button>
                <a href="#how" className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-bold text-ink-700 bg-white border border-ink-200 hover:border-primary-300 hover:bg-primary-50/30 transition-all">
                  Voir la démo
                </a>
              </div>
              <p className="mt-8 text-xs font-semibold text-ink-500">
                Courriers • Factures • Cotations • Échéances • Collaboration • Archivage
              </p>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="bg-ink-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { value: '200+', label: 'Entreprises actives' },
              { value: '48K+', label: 'Documents traités' },
              { value: '96%', label: 'Précision IA' },
              { value: '5j', label: 'Économisés / mois' },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <p className="font-display text-3xl lg:text-4xl font-bold text-white">{stat.value}</p>
                <p className="text-xs text-ink-400 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-primary-600">Fonctionnalités</span>
            <h2 className="font-display text-3xl lg:text-4xl font-bold text-ink-900 mt-2 mb-4">Tout votre travail documentaire au même endroit</h2>
            <p className="text-base text-ink-500">Centralisez, automatisez et collaborez. L'IA fait le tri, repère l'urgence et garde vos équipes alignées.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <FeatureCard icon={FileText} title="Courriers entrants & sortants" desc="Registre électronique, lecture IA, résumé, affectation au bon service et suivi complet des réponses." color="primary" />
            <FeatureCard icon={ShoppingCart} title="Proformas & cotations" desc="Tri automatique des proformas, comparaison des offres, détection des écarts et dépouillement assisté par IA." color="accent" />
            <FeatureCard icon={Building2} title="Réseau B2B" desc="Un carnet de partenaires où chaque entreprise peut être client et fournisseur selon le contexte." color="warning" />
            <FeatureCard icon={Bot} title="Parlez à vos documents" desc="Posez des questions en langage naturel ou par voix. L'IA lit vos documents, les résume et retrouve les réponses." color="primary" />
            <FeatureCard icon={Layers} title="Projets & travail de groupe" desc="Documents, échanges, tâches, validations et pièces jointes restent regroupés dans des dossiers de projet traçables." color="accent" />
            <FeatureCard icon={Shield} title="Délais, rappels & rôles" desc="L'IA détecte les échéances des factures et courriers, relance les responsables et respecte les permissions." color="warning" />
          </div>
        </div>
      </section>

      {/* B2B Section */}
      <section id="b2b" className="py-20 lg:py-28 bg-ink-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-accent-600">Réseau B2B</span>
              <h2 className="font-display text-3xl lg:text-4xl font-bold text-ink-900 mt-2 mb-4">Une entreprise, plusieurs rôles</h2>
              <p className="text-base text-ink-500 leading-relaxed mb-6">
                Registre intelligent ne sépare pas clients et fournisseurs. Une même entreprise peut être votre fournisseur aujourd'hui
                et votre client demain. Chaque partenaire reçoit un code Registre intelligent unique pour échanger documents et cotations.
              </p>
              <div className="space-y-3 mb-8">
                {[
                  { icon: ArrowLeftRight, title: 'Relation bidirectionnelle', desc: 'Fournisseur et client sur le même profil' },
                  { icon: Building2, title: 'Carnet de partenaires', desc: 'Fournisseurs Registre intelligent + externes non inscrits' },
                  { icon: Zap, title: 'Code Registre intelligent unique', desc: 'Trouvez et invitez une entreprise en 1 clic' },
                  { icon: TrendingUp, title: 'Opportunités reçues', desc: 'Recevez des demandes de cotation du réseau' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-xl bg-white shadow-sm border border-ink-200/60 flex items-center justify-center shrink-0">
                      <item.icon className="h-4.5 w-4.5 text-primary-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-ink-800">{item.title}</p>
                      <p className="text-xs text-ink-500">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={onLogin} className="flex items-center gap-2 text-sm font-bold text-primary-600 hover:text-primary-700 group">
                Explorer le réseau B2B
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            {/* B2B Visual */}
            <div className="relative">
              <div className="bg-white rounded-3xl shadow-xl border border-ink-200/60 p-6">
                <p className="text-xs font-bold text-ink-500 mb-4">Carnet de partenaires</p>
                <div className="space-y-2">
                  {[
                    { name: 'CongoTech SARL', code: 'DF-CT-83921', type: 'Fournisseur', color: 'bg-primary-600', status: 'Vérifié' },
                    { name: 'Logistique Plus', code: 'DF-LP-61583', type: 'Fournisseur & Client', color: 'bg-accent-600', status: 'Vérifié' },
                    { name: 'ABC Construction', code: 'DF-ABC-47291', type: 'Client', color: 'bg-warning-600', status: 'Vérifié' },
                    { name: 'Clean Services', code: 'DF-CSE-51847', type: 'Fournisseur externe', color: 'bg-ink-600', status: 'Externe' },
                  ].map((co, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-ink-50 rounded-xl border border-ink-200/60">
                      <div className={`h-9 w-9 rounded-lg ${co.color} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                        {co.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-ink-800">{co.name}</p>
                        <p className="text-[9px] font-mono text-ink-400">{co.code}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[9px] font-semibold text-primary-700 bg-primary-50 px-1.5 py-0.5 rounded block mb-1">{co.type}</span>
                        <span className={`text-[8px] font-semibold px-1.5 py-0.5 rounded ${co.status === 'Vérifié' ? 'bg-accent-100 text-accent-700' : 'bg-warning-100 text-warning-700'}`}>{co.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-primary-600">Processus</span>
            <h2 className="font-display text-3xl lg:text-4xl font-bold text-ink-900 mt-2 mb-4">Comment ça marche</h2>
            <p className="text-base text-ink-500">Du document qui arrive à la décision finale, tout reste connecté et traçable.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { num: '01', icon: FileText, title: 'Réception', desc: 'Courrier entrant, courrier sortant, facture, proforma ou contrat : tout arrive dans le même espace.' },
              { num: '02', icon: Brain, title: 'Lecture IA', desc: 'L\'IA lit, résume, classe, extrait les montants, repère les délais et suggère la priorité.' },
              { num: '03', icon: Users, title: 'Travail de groupe', desc: 'Les équipes discutent, assignent, valident et suivent les actions autour de chaque document ou projet.' },
              { num: '04', icon: CheckCircle2, title: 'Rappels & suivi', desc: 'Les échéances déclenchent des rappels et chaque décision reste archivée avec son historique.' },
            ].map((step, i) => (
              <div key={i} className="relative">
                <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 p-6 h-full hover:shadow-card-hover transition-all">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                      <step.icon className="h-5 w-5 text-white" />
                    </div>
                    <span className="font-display text-2xl font-bold text-ink-200">{step.num}</span>
                  </div>
                  <h3 className="font-display font-bold text-ink-900 text-sm mb-2">{step.title}</h3>
                  <p className="text-xs text-ink-500 leading-relaxed">{step.desc}</p>
                </div>
                {i < 3 && <ArrowRight className="hidden lg:block absolute top-1/2 -right-3 -translate-y-1/2 h-4 w-4 text-ink-300 z-10" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 lg:py-28 bg-ink-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-primary-600">Témoignages</span>
            <h2 className="font-display text-3xl lg:text-4xl font-bold text-ink-900 mt-2 mb-4">Ils ont transformé leur gestion documentaire</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { name: 'Pierre Durand', role: 'DG, XYZ SARL', text: 'Nous avons réduit le délai de traitement des factures de 7 jours à 2. L\'analyse IA nous fait gagner un temps précieux.', color: 'bg-primary-600' },
              { name: 'Marie Dubois', role: 'Comptabilité, ABC SA', text: 'Le réseau B2B a changé notre façon de travailler avec nos fournisseurs. Tout est centralisé et traçable.', color: 'bg-accent-600' },
              { name: 'Karim Benali', role: 'Commercial, CongoTech', text: 'Je reçois les demandes de cotation directement sur Registre intelligent. Je réponds en quelques clics, c\'s beaucoup plus rapide.', color: 'bg-warning-600' },
            ].map((t, i) => (
              <div key={i} className="bg-white rounded-2xl shadow-card border border-ink-200/60 p-6">
                <Quote className="h-6 w-6 text-primary-200 mb-3" />
                <p className="text-sm text-ink-600 leading-relaxed mb-5">{t.text}</p>
                <div className="flex items-center gap-3 pt-4 border-t border-ink-100">
                  <div className={`h-9 w-9 rounded-full ${t.color} flex items-center justify-center text-white text-xs font-bold`}>
                    {t.name.split(' ').map((n) => n[0]).join('')}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-ink-800">{t.name}</p>
                    <p className="text-[10px] text-ink-400">{t.role}</p>
                  </div>
                  <div className="ml-auto flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => <Star key={s} className="h-3 w-3 text-warning-400 fill-warning-400" />)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-primary-600">Tarifs</span>
            <h2 className="font-display text-3xl lg:text-4xl font-bold text-ink-900 mt-2 mb-4">Un plan adapté à chaque entreprise</h2>
            <p className="text-base text-ink-500">Commencez gratuitement. Passez à un plan supérieur quand vous êtes prêt.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto">
            <PricingCard
              name="Starter"
              price="0"
              desc="Pour découvrir Registre intelligent"
              features={['Jusqu\'à 50 documents / mois', 'Analyse IA basique', '1 utilisateur', 'Carnet de 10 partenaires']}
              cta="Commencer"
              onCta={onLogin}
              highlighted={false}
            />
            <PricingCard
              name="Pro"
              price="49"
              desc="Pour les PME"
              features={['Documents illimités', 'Analyse IA avancée', '10 utilisateurs', 'Réseau B2B complet', 'Copilote IA vocal', 'Cotations & dépouillement IA']}
              cta="Essai 14 jours"
              onCta={onLogin}
              highlighted={true}
            />
            <PricingCard
              name="Enterprise"
              price="Sur devis"
              desc="Pour les grandes organisations"
              features={['Tout le plan Pro', 'Utilisateurs illimités', 'SSO & rôles personnalisés', 'API & intégrations', 'Support dédié 24/7', 'Hébergement dédié']}
              cta="Nous contacter"
              onCta={onLogin}
              highlighted={false}
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 lg:py-28">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-ink-900 via-ink-800 to-primary-900 p-10 lg:p-16 text-center">
            <div className="absolute inset-0 grid-pattern opacity-10" />
            <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-primary-500/20 blur-3xl" />
            <div className="absolute -left-20 -bottom-20 h-72 w-72 rounded-full bg-accent-500/15 blur-3xl" />
            <div className="relative">
              <Sparkles className="h-8 w-8 text-accent-400 mx-auto mb-4" />
              <h2 className="font-display text-3xl lg:text-4xl font-bold text-white mb-4">Prêt à parler à vos documents ?</h2>
              <p className="text-base text-white/70 mb-8 max-w-xl mx-auto">Rejoignez les 200+ entreprises qui centralisent courriers, factures, proformas, projets et collaborations avec Registre intelligent.</p>
              <button onClick={onLogin} className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl text-sm font-bold text-primary-700 bg-white hover:bg-primary-50 transition-colors shadow-xl group">
                Démarrer maintenant
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <p className="text-[10px] text-white/40 mt-4">Aucune carte bancaire requise · Configuration en 2 minutes</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-ink-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary-600 to-accent-600 flex items-center justify-center">
                  <FileText className="h-4.5 w-4.5 text-white" />
                </div>
                <span className="font-display font-bold text-white text-base">Registre intelligent</span>
              </div>
              <p className="text-xs text-ink-400 leading-relaxed max-w-xs">La plateforme documentaire collaborative qui lit, trie, résume et suit vos courriers, factures, proformas et projets.</p>
            </div>
            <div>
              <p className="text-xs font-bold text-white mb-3">Produit</p>
              <div className="space-y-2">
                {['Fonctionnalités', 'Réseau B2B', 'Tarifs', 'Sécurité'].map((l) => (
                  <a key={l} href="#" className="block text-xs text-ink-400 hover:text-white transition-colors">{l}</a>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-white mb-3">Entreprise</p>
              <div className="space-y-2">
                {['À propos', 'Blog', 'Contact', 'Carrières'].map((l) => (
                  <a key={l} href="#" className="block text-xs text-ink-400 hover:text-white transition-colors">{l}</a>
                ))}
              </div>
            </div>
          </div>
          <div className="pt-8 border-t border-ink-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[10px] text-ink-500">© 2026 Registre intelligent. Tous droits réservés.</p>
            <div className="flex items-center gap-4 text-[10px] text-ink-500">
              <a href="#" className="hover:text-white transition-colors">Mentions légales</a>
              <a href="#" className="hover:text-white transition-colors">Confidentialité</a>
              <a href="#" className="hover:text-white transition-colors">CGU</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, desc, color }: { icon: typeof FileText; title: string; desc: string; color: 'primary' | 'accent' | 'warning' }) {
  const colorMap = {
    primary: { bg: 'bg-primary-50', text: 'text-primary-600', ring: 'group-hover:border-primary-300' },
    accent: { bg: 'bg-accent-50', text: 'text-accent-600', ring: 'group-hover:border-accent-300' },
    warning: { bg: 'bg-warning-50', text: 'text-warning-600', ring: 'group-hover:border-warning-300' },
  };
  const c = colorMap[color];
  return (
    <div className={`group bg-white rounded-2xl shadow-card border border-ink-200/60 p-6 transition-all hover:shadow-card-hover ${c.ring}`}>
      <div className={`h-11 w-11 rounded-xl ${c.bg} flex items-center justify-center mb-4`}>
        <Icon className={`h-5.5 w-5.5 ${c.text}`} />
      </div>
      <h3 className="font-display font-bold text-ink-900 text-sm mb-2">{title}</h3>
      <p className="text-xs text-ink-500 leading-relaxed">{desc}</p>
    </div>
  );
}

function PricingCard({ name, price, desc, features, cta, onCta, highlighted }: { name: string; price: string; desc: string; features: string[]; cta: string; onCta: () => void; highlighted: boolean }) {
  return (
    <div className={`relative rounded-2xl border p-6 transition-all ${highlighted ? 'border-primary-400 shadow-2xl shadow-primary-600/10 bg-white scale-105' : 'border-ink-200/60 bg-white shadow-card hover:shadow-card-hover'}`}>
      {highlighted && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold text-white bg-gradient-to-r from-primary-600 to-accent-600 px-3 py-1 rounded-full shadow-lg">
          Le plus populaire
        </span>
      )}
      <p className="font-display font-bold text-ink-900 text-sm">{name}</p>
      <p className="text-[10px] text-ink-400 mb-4">{desc}</p>
      <div className="mb-5">
        {price === 'Sur devis' ? (
          <p className="font-display text-2xl font-bold text-ink-900">Sur devis</p>
        ) : (
          <div className="flex items-end gap-1">
            <span className="font-display text-3xl font-bold text-ink-900">{price}</span>
            <span className="text-sm text-ink-400 mb-1">€/mois</span>
          </div>
        )}
      </div>
      <ul className="space-y-2.5 mb-6">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-accent-500 shrink-0 mt-0.5" />
            <span className="text-xs text-ink-600">{f}</span>
          </li>
        ))}
      </ul>
      <button
        onClick={onCta}
        className={`w-full py-2.5 rounded-xl text-sm font-bold transition-colors ${
          highlighted ? 'text-white bg-gradient-to-r from-primary-600 to-accent-600 hover:shadow-lg shadow-primary-600/20' : 'text-primary-700 bg-primary-50 hover:bg-primary-100'
        }`}
      >
        {cta}
      </button>
    </div>
  );
}
