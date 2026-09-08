import {
  Inbox, ScanLine, Brain, Share2, ArrowRight,
  Bell, FolderArchive, Cloud, Search, BarChart3, ShieldCheck, Users, Server,
} from 'lucide-react';

interface HowItWorksProps {
  onBack: () => void;
  onTryFree: () => void;
}

const steps = [
  {
    number: '1',
    icon: Inbox,
    title: 'Réception',
    tagline: 'Courrier papier reçu',
    detail: 'Une lettre, une facture, une convocation arrive au secrétariat ou directement chez vous — comme d\'habitude.',
  },
  {
    number: '2',
    icon: ScanLine,
    title: 'Numérisation',
    tagline: 'Scanner, photographier ou importer',
    detail: 'Scannez le document, prenez-le en photo, ou importez un document déjà existant — quel que soit le nombre de pages.',
  },
  {
    number: '3',
    icon: Brain,
    title: 'Intelligence artificielle',
    tagline: 'Analyse, classement et rappels automatiques',
    detail: 'L\'IA détecte les informations importantes, classe le document et vous propose de le ranger dans le bon dossier. Ajoutez vos propres annotations. Elle détecte aussi les délais et vous rappelle avant l\'échéance, propose des réponses à vos questions et peut lire le document à voix haute.',
  },
  {
    number: '4',
    icon: Cloud,
    title: 'Stockage et accès',
    tagline: 'Partout, à tout moment, par la voix',
    detail: 'Choisissez où stocker et archiver vos documents. Accédez-y de partout et retrouvez-les par recherche vocale : l\'IA trouve le document pour vous, vous le rappelle et le sauvegarde dans le cloud. Vous ne perdez plus jamais un document.',
  },
  {
    number: '5',
    icon: Share2,
    title: 'Collaboration',
    tagline: 'Sur place ou à distance',
    detail: 'Collaborez où que vous soyez. Vos décisions collectives, réunions ou instructions n\'attendent plus votre retour au bureau pour lire le courrier et donner vos directives en retard.',
  },
];

const advantages = [
  { icon: Bell, title: 'Suivi intelligent', desc: 'Rappels automatiques des échéances et tâches.' },
  { icon: FolderArchive, title: 'Circuit de validation', desc: 'Chaque courrier suit son parcours jusqu\'à son traitement final.' },
  { icon: Cloud, title: 'Archivage sécurisé', desc: 'Tous vos courriers accessibles à tout moment, en toute sécurité.' },
  { icon: Search, title: 'Recherche rapide', desc: 'Retrouvez un document par mot-clé, date, objet, expéditeur, etc.' },
  { icon: BarChart3, title: 'Productivité', desc: 'Moins de retards, plus d\'efficacité, meilleure traçabilité.' },
];

export default function HowItWorks({ onBack, onTryFree }: HowItWorksProps) {
  return (
    <div className="min-h-screen bg-white">
      <div className="usps-bar fixed top-0 left-0 right-0 z-50" />
      <nav className="fixed top-1 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-3">
            <span className="font-extrabold text-base italic uppercase tracking-wide hidden sm:inline">
              <span className="text-usps-blue">Registre </span>
              <span className="text-usps-red">Intelligent</span>
            </span>
          </button>
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="hidden sm:inline text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              Retour à l'accueil
            </button>
            <button
              onClick={onTryFree}
              className="px-5 py-2 bg-usps-blue text-white rounded-lg text-sm font-medium hover:bg-usps-blue-dark transition-colors"
            >
              Essayer gratuitement
            </button>
          </div>
        </div>
      </nav>

      {/* Infographie */}
      <section className="pt-24 pb-16 px-6 bg-usps-gray">
        <div className="max-w-6xl mx-auto">
          <img
            src="/how-it-works.png"
            alt="Comment fonctionne Registre Intelligent : réception, scan, intelligence artificielle, transfert dans l'ordinateur, partage et suivi du courrier"
            className="w-full h-auto rounded-2xl shadow-lg border border-gray-100"
          />
        </div>
      </section>

      {/* Schéma explicatif */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Le parcours de votre courrier, étape par étape</h2>
            <p className="text-gray-600 text-lg">Cinq étapes, du papier reçu jusqu'au dossier classé, partagé et suivi.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-5">
            {steps.map((step, i) => (
              <div key={i} className="relative p-6 rounded-2xl bg-gray-50 border border-gray-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-usps-blue flex items-center justify-center flex-shrink-0">
                    <step.icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="w-7 h-7 rounded-full bg-usps-red text-white text-xs font-bold flex items-center justify-center">{step.number}</div>
                </div>
                <h3 className="font-bold text-gray-900 mb-1">{step.title}</h3>
                <p className="text-xs font-semibold text-usps-blue uppercase tracking-wide mb-2">{step.tagline}</p>
                <p className="text-sm text-gray-600 leading-relaxed">{step.detail}</p>
                {i < steps.length - 1 && (
                  <ArrowRight className="hidden lg:block absolute top-1/2 -right-3 w-5 h-5 text-gray-300" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Avantages */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Les avantages</h2>
            <p className="text-gray-600 text-lg">Ce que Registre Intelligent change concrètement au quotidien.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-5">
            {advantages.map((a, i) => (
              <div key={i} className="p-6 rounded-2xl bg-white border border-gray-100 text-center hover:shadow-md transition-all">
                <div className="w-12 h-12 mx-auto rounded-full bg-amber-50 flex items-center justify-center mb-4">
                  <a.icon className="w-6 h-6 text-usps-blue" />
                </div>
                <h3 className="text-sm font-bold text-gray-900 mb-1">{a.title}</h3>
                <p className="text-xs text-gray-600 leading-relaxed">{a.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stockage */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Vos documents, stockés comme vous le souhaitez</h2>
            <p className="text-gray-600 text-lg">Gardez le contrôle total, ou confiez-nous l'archivage sur le long terme.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-8 rounded-2xl bg-gray-50 border-2 border-gray-100 hover:border-usps-blue/30 hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-xl bg-usps-blue flex items-center justify-center mb-5">
                <Server className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Votre propre infrastructure</h3>
              <p className="text-sm text-gray-600">
                Installez Registre Intelligent sur votre propre serveur ou sur votre ordinateur local. Vos documents restent chez vous, sous votre contrôle exclusif, sans jamais transiter par un tiers.
              </p>
            </div>
            <div className="p-8 rounded-2xl bg-usps-gray border-2 border-usps-blue/30 shadow-lg scale-[1.02]">
              <div className="w-12 h-12 rounded-xl bg-usps-red flex items-center justify-center mb-5">
                <Cloud className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Notre espace cloud sécurisé</h3>
              <p className="text-sm text-gray-600">
                Louez un espace sur notre cloud et laissez-nous gérer l'archivage. Vos documents restent accessibles à tout moment et conservés en toute sécurité pendant plus de 10 ans.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Appel à l'action */}
      <section className="py-16 px-6 bg-usps-blue text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">Prêt à rendre votre courrier intelligent ?</h2>
          <p className="text-white/80 text-lg mb-8">Essayez gratuitement et découvrez comment fonctionne une gestion intelligente de vos documents.</p>
          <div className="flex flex-wrap items-center justify-center gap-8 mb-10 text-sm font-medium">
            <div className="flex items-center gap-2"><ShieldCheck className="w-5 h-5" /> Sécurisé &amp; confidentiel</div>
            <div className="flex items-center gap-2"><Cloud className="w-5 h-5" /> Accessible partout</div>
            <div className="flex items-center gap-2"><Users className="w-5 h-5" /> Collaboration en temps réel</div>
          </div>
          <button
            onClick={onTryFree}
            className="px-8 py-3.5 bg-white text-usps-blue rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all inline-flex items-center gap-2 group"
          >
            Essayer gratuitement
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </section>

      <footer className="py-10 px-6 bg-gray-900 text-gray-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm font-semibold text-white">Registre Intelligent</p>
          <p className="text-sm">Documentation intelligente</p>
        </div>
      </footer>
    </div>
  );
}
