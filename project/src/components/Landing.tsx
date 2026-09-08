import { useState } from 'react';
import {
  ScanLine, Users, Building2, Brain, Search,
  Bell, ArrowRight, Check, Sparkles,
  CalendarClock, FileText, ShieldCheck, Volume2, MessageSquare,
  AlertTriangle, Clock, Server, Cloud,
} from 'lucide-react';

interface LandingProps {
  onEnter: () => void;
  onTryFree: () => void;
  onShowHowItWorks: () => void;
}

export default function Landing({ onEnter, onTryFree, onShowHowItWorks }: LandingProps) {
  const [activeService, setActiveService] = useState(0);

  const services = [
    {
      icon: ScanLine,
      tag: 'Particulier',
      title: 'Courrier Intelligent Personnel',
      subtitle: 'Vous recevez le courrier. Vous le scannez. Nous le rendons intelligent.',
      description: 'Idéal pour les particuliers qui veulent un classement par IA, des résumés, des rappels, un accès vocal et un archivage sécurisé.',
      features: ['Classement des documents par IA', 'Résumés intelligents et lecture audio', 'Détection automatique des échéances', 'Posez des questions sur n\'importe quel document'],
      color: 'bg-usps-blue',
      accent: 'text-usps-blue',
      border: 'border-usps-blue/30',
      bg: 'bg-usps-gray',
    },
    {
      icon: Users,
      tag: 'Entreprise',
      title: 'Courrier Intelligent Entreprise',
      subtitle: 'Recevez, organisez, partagez, assignez et suivez le courrier de votre organisation, ensemble.',
      description: 'Idéal pour les entreprises, secrétariats, équipes et organisations qui ont besoin d\'un circuit de validation et d\'une collaboration documentaire sécurisée.',
      features: ['Circuit de validation (secrétariat → direction → comptabilité → paiement)', 'Partage sécurisé des documents', 'Commentaires et discussion par document', 'Assignation d\'actions aux membres de l\'équipe'],
      color: 'bg-usps-blue',
      accent: 'text-usps-blue',
      border: 'border-usps-blue/30',
      bg: 'bg-usps-gray',
    },
    {
      icon: Building2,
      tag: 'Géré',
      title: 'Courrier Intelligent Géré',
      subtitle: 'Nous gérons votre courrier physique autorisé. Vous y accédez numériquement, où que vous soyez.',
      description: 'Idéal pour les voyageurs, les personnes âgées, les personnes à mobilité réduite, les travailleurs à distance et toute personne souhaitant faire numériser son courrier professionnellement.',
      features: ['Courrier physique scanné pour vous', 'Accès numérique instantané, partout', 'Transfert, destruction ou conservation sur demande', 'Notifications pour le courrier important'],
      color: 'bg-usps-red',
      accent: 'text-usps-red',
      border: 'border-usps-red/30',
      bg: 'bg-red-50',
    },
  ];

  const intelligence = [
    { icon: Brain, title: 'Classement des documents par IA', desc: 'Les documents sont automatiquement classés en Factures, Administration, Impôts, Assurance, Médical, Banque, Juridique, et plus encore.' },
    { icon: FileText, title: 'Résumés par IA', desc: 'Obtenez une explication courte de chaque document plutôt que de lire plusieurs pages. L\'original reste toujours accessible.' },
    { icon: Volume2, title: 'Lecture de vos documents', desc: 'Écoutez vos documents grâce à la synthèse vocale. Idéal pour les personnes âgées, l\'accessibilité, les voyageurs, ou toute personne qui préfère écouter.' },
    { icon: MessageSquare, title: 'Posez vos questions', desc: 'Interagissez avec vos documents. Demandez « Combien dois-je payer ? » ou « Quelle est la date limite de cette facture ? » et obtenez une réponse instantanée.' },
    { icon: CalendarClock, title: 'Détection automatique des échéances', desc: 'Le système identifie les dates d\'échéance, les délais de renouvellement, les rendez-vous et les dates d\'audience — puis crée des rappels.' },
    { icon: Bell, title: 'Tableau de bord intelligent', desc: 'Visualisez les actions à mener, les factures à venir, les rendez-vous et les échéances à venir sans ouvrir chaque document.' },
    { icon: Search, title: 'Recherche et archivage intelligents', desc: 'Recherchez par type, date, expéditeur, ou posez votre question en langage naturel. Trouvez tout, instantanément.' },
    { icon: ShieldCheck, title: 'Sécurisé et confidentiel', desc: 'Vos documents sont chiffrés et archivés en toute sécurité. Vous contrôlez qui voit quoi.' },
  ];

  const flow = ['Recevoir', 'Numériser', 'Comprendre', 'Organiser', 'Partager', 'Notifier', 'Rappeler', 'Agir', 'Archiver'];

  return (
    <div className="min-h-screen bg-white">
      {/* Bandeau */}
      <div className="usps-bar fixed top-0 left-0 right-0 z-50" />
      {/* Navigation */}
      <nav className="fixed top-1 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-extrabold text-base italic uppercase tracking-wide hidden sm:inline">
              <span className="text-usps-blue">Registre </span>
              <span className="text-usps-red">Intelligent</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={onShowHowItWorks}
              className="hidden sm:inline text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              Comment ça marche
            </button>
            <button
              onClick={onEnter}
              className="px-5 py-2 bg-usps-blue text-white rounded-lg text-sm font-medium hover:bg-usps-blue-dark transition-colors"
            >
              Ouvrir le tableau de bord
            </button>
          </div>
        </div>
      </nav>

      {/* Héro */}
      <section className="relative h-screen overflow-hidden bg-white">
        <img
          src="/hero%20pc.png"
          alt="Tableau de bord Registre Intelligent connecté au courrier scanné"
          className="absolute inset-0 h-full w-full object-cover max-[735px]:hidden"
        />
        <img
          src="/hero%20mboile.png"
          alt="Tableau de bord Registre Intelligent connecté au courrier scanné"
          className="absolute inset-0 hidden h-full w-full object-cover min-[736px]:hidden max-[735px]:block"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-gray-900/75 via-gray-700/35 to-gray-500/10 max-[735px]:bg-gradient-to-b max-[735px]:from-gray-900/75 max-[735px]:via-gray-700/25 max-[735px]:to-transparent" />
        <div className="relative z-10 flex h-full items-start px-6 pt-[30vh] sm:px-10 lg:px-16 max-[735px]:h-[60vh] max-[735px]:justify-center max-[735px]:px-5 max-[735px]:pt-20">
          <div className="max-w-2xl md:max-w-[42vw] lg:max-w-[30vw] max-[735px]:max-w-[88vw] max-[735px]:text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/15 text-white ring-1 ring-white/25 backdrop-blur-md rounded-full text-sm font-medium mb-6 min-[736px]:max-[1100px]:text-xs min-[736px]:max-[1100px]:mb-4 max-[735px]:hidden">
            <Sparkles className="w-4 h-4" />
            Une seule plateforme intelligente pour votre courrier et vos documents
            </div>
          <h1 className="text-4xl sm:text-4xl font-bold uppercase text-white leading-tight mb-5 min-[736px]:max-[1100px]:text-3xl min-[736px]:max-[1100px]:mb-4 max-[735px]:text-5xl max-[735px]:mb-4 max-[480px]:text-4xl">
            Vos courriers ne devraient plus<br />
            <span className="text-white/90">attendre sur un bureau.</span>
          </h1>
          <p className="text-base text-white/85 max-w-2xl mb-3 leading-relaxed min-[736px]:max-[1100px]:text-sm min-[736px]:max-[1100px]:mb-2 max-[735px]:text-lg max-[735px]:mb-3 max-[480px]:text-base font-semibold">
            Scannez. L'IA comprend. Votre équipe agit.
          </p>
          <p className="text-base text-white/85 max-w-2xl mb-6 leading-relaxed min-[736px]:max-[1100px]:text-sm min-[736px]:max-[1100px]:mb-5 max-[735px]:text-lg max-[735px]:mb-5 max-[480px]:text-base">
            Registre Intelligent transforme vos courriers et documents papier en dossiers intelligents : résumés, classés, partagés, suivis et archivés automatiquement.
          </p>
          <div className="grid grid-cols-2 gap-3 mb-8 text-left min-[736px]:max-[1100px]:gap-2 min-[736px]:max-[1100px]:mb-6 max-[735px]:mx-auto max-[735px]:max-w-sm max-[735px]:text-center max-[480px]:gap-2">
            {[
              ['Un seul scan', 'ou import'],
              ['Parlez à', 'vos documents'],
              ['Recevez des', 'rappels automatiques'],
              ['Classement', 'intelligent'],
            ].map(([title, subtitle]) => (
              <div key={title} className="border-l-2 border-usps-red pl-3 max-[735px]:border-l-0 max-[735px]:border-t-2 max-[735px]:pl-0 max-[735px]:pt-2">
                <div className="text-xs font-bold uppercase tracking-wide text-white min-[736px]:max-[1100px]:text-[11px] max-[735px]:text-sm max-[480px]:text-xs">{title}</div>
                <div className="text-sm text-white/75 min-[736px]:max-[1100px]:text-xs max-[735px]:text-base max-[480px]:text-sm">{subtitle}</div>
              </div>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row items-start gap-4 max-[735px]:hidden">
            <button
              onClick={onTryFree}
                className="px-8 py-3.5 bg-usps-blue text-white rounded-xl font-semibold shadow-lg shadow-usps-blue/25 hover:bg-usps-blue-dark hover:shadow-xl hover:shadow-usps-blue/30 transition-all flex items-center gap-2 whitespace-nowrap min-[736px]:max-[1100px]:px-5 min-[736px]:max-[1100px]:py-2.5 min-[736px]:max-[1100px]:text-sm group"
            >
              Essayer gratuitement
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
                <button onClick={onShowHowItWorks} className="px-8 py-3.5 bg-white text-gray-700 rounded-xl font-semibold border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all whitespace-nowrap min-[736px]:max-[1100px]:px-5 min-[736px]:max-[1100px]:py-2.5 min-[736px]:max-[1100px]:text-sm">
              Voir comment ça marche
            </button>
          </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 z-10 hidden h-[15vh] min-h-24 bg-usps-blue px-5 max-[735px]:flex max-[735px]:items-center max-[735px]:justify-between max-[735px]:gap-4">
          <button
            onClick={onTryFree}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-usps-red px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-usps-red/25 transition-all hover:bg-usps-red-dark hover:shadow-xl hover:shadow-usps-red/30 whitespace-nowrap group"
          >
            Essayer gratuitement
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
          <button onClick={onShowHowItWorks} className="flex flex-1 items-center justify-center rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition-all hover:border-gray-300 hover:bg-gray-50 whitespace-nowrap">
            Voir comment ça marche
          </button>
        </div>
      </section>

      {/* Aperçu du tableau de bord intelligent */}
      <section className="py-20 px-6 bg-usps-blue-dark text-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-3">Votre courrier et vos documents deviennent un tableau de bord d'action</h2>
            <p className="text-gray-300 text-lg">Pas seulement une collection de documents — un centre de contrôle pour tout ce qui requiert votre attention.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-5">
            {[
              { icon: AlertTriangle, label: 'Action requise', desc: 'Courrier administratif — réponse demandée', color: 'text-usps-red', border: 'border-usps-red/40' },
              { icon: CalendarClock, label: 'Factures à échéance proche', desc: 'Électricité — 148,72 € dus dans 3 jours', color: 'text-amber-400', border: 'border-amber-500/30' },
              { icon: Clock, label: 'Rendez-vous', desc: 'Médecin — 18 septembre à 10h30', color: 'text-usps-red', border: 'border-usps-red/40' },
              { icon: Bell, label: 'À venir', desc: 'Renouvellement d\'assurance — 1er octobre', color: 'text-emerald-400', border: 'border-emerald-500/30' },
              { icon: Volume2, label: 'Action vocale', desc: 'Question : Quel document est urgent cette semaine ? Réponse : Renouvellement de la carte grise à faire vendredi.', color: 'text-sky-300', border: 'border-sky-400/30' },
            ].map((card, i) => (
              <div key={i} className={`p-6 rounded-2xl bg-white/5 border ${card.border} backdrop-blur-sm`}>
                <card.icon className={`w-8 h-8 ${card.color} mb-4`} />
                <div className="text-sm font-semibold text-white mb-2">{card.label}</div>
                <div className="text-sm text-gray-300">{card.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trois services */}
      <section id="services" className="py-20 px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Trois services, une seule plateforme</h2>
            <p className="text-gray-600 text-lg">Choisissez la formule adaptée à la façon dont vous recevez votre courrier.</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6 mb-10">
            {services.map((s, i) => (
              <button
                key={i}
                onClick={() => setActiveService(i)}
                className={`text-left p-7 rounded-2xl border-2 transition-all ${
                  activeService === i
                    ? `${s.border} ${s.bg} shadow-lg scale-[1.02]`
                    : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-md'
                }`}
              >
                <div className={`w-12 h-12 rounded-xl ${s.color} flex items-center justify-center mb-5`}>
                  <s.icon className="w-6 h-6 text-white" />
                </div>
                <div className={`text-xs font-semibold uppercase tracking-wide mb-2 ${s.accent}`}>{s.tag}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{s.title}</h3>
                <p className={`text-sm font-medium mb-3 ${s.accent}`}>{s.subtitle}</p>
                <p className="text-sm text-gray-600 mb-5">{s.description}</p>
                <ul className="space-y-2.5">
                  {s.features.map((f, j) => (
                    <li key={j} className="flex items-start gap-2.5 text-sm text-gray-700">
                      <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${s.accent}`} />
                      {f}
                    </li>
                  ))}
                </ul>
              </button>
            ))}
          </div>

          <div className={`p-8 rounded-2xl ${services[activeService].bg} border-2 ${services[activeService].border}`}>
            <h3 className={`text-lg font-bold mb-6 ${services[activeService].accent}`}>
              Comment fonctionne « {services[activeService].title} »
            </h3>
            {activeService === 0 && (
              <div className="flex flex-wrap items-center gap-3 text-sm">
                {['Réception du courrier physique', 'Photo ou scan', 'L\'IA lit le document', 'L\'IA identifie le type', 'Classement dans le bon dossier', 'Extraction des informations clés', 'Résumé et lecture audio'].map((step, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="px-4 py-2 bg-white rounded-lg font-medium text-gray-700 shadow-sm">{step}</span>
                    {i < 6 && <ArrowRight className="w-4 h-4 text-gray-400" />}
                  </div>
                ))}
              </div>
            )}
            {activeService === 1 && (
              <div>
                <div className="flex flex-wrap items-center gap-3 text-sm mb-6">
                  {['Courrier reçu par le secrétariat', 'Transmis à la direction générale', 'Vérifié par la comptabilité', 'Validé pour paiement', 'Dossier clôturé et archivé'].map((step, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="px-4 py-2 bg-white rounded-lg font-medium text-gray-700 shadow-sm">{step}</span>
                      {i < 4 && <ArrowRight className="w-4 h-4 text-gray-400" />}
                    </div>
                  ))}
                </div>
                <div className="bg-white rounded-xl p-5 shadow-sm max-w-xl">
                  <div className="text-xs font-semibold text-usps-red uppercase mb-2">Exemple en entreprise</div>
                  <p className="text-sm text-gray-700 mb-3">Une facture fournisseur est partagée avec la comptabilité pour vérification et validation.</p>
                  <div className="space-y-2 text-sm">
                    <div className="bg-gray-50 rounded-lg p-2.5"><span className="font-medium text-gray-900">Responsable :</span> « Merci de vérifier cette facture. »</div>
                    <div className="bg-gray-50 rounded-lg p-2.5"><span className="font-medium text-gray-900">Comptabilité :</span> « Vérifiée. En attente de validation. »</div>
                    <div className="bg-gray-50 rounded-lg p-2.5"><span className="font-medium text-gray-900">Responsable :</span> « Validée pour paiement. »</div>
                  </div>
                </div>
              </div>
            )}
            {activeService === 2 && (
              <div className="flex flex-wrap items-center gap-3 text-sm">
                {['Le courrier est livré', 'Le centre de traitement le reçoit', 'Le courrier est identifié pour le client', 'Le courrier éligible est scanné', 'Accès numérique instantané', 'L\'IA lit et organise', 'Notifications envoyées', 'Courrier physique traité selon vos instructions'].map((step, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="px-4 py-2 bg-white rounded-lg font-medium text-gray-700 shadow-sm">{step}</span>
                    {i < 7 && <ArrowRight className="w-4 h-4 text-gray-400" />}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Intelligence */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">L'intelligence, dans tous les services</h2>
            <p className="text-gray-600 text-lg">Les mêmes capacités d'IA puissantes, quelle que soit la formule choisie.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {intelligence.map((item, i) => (
              <div key={i} className="p-6 rounded-2xl bg-gray-50 border border-gray-100 hover:shadow-md hover:bg-white transition-all group">
                <div className="w-11 h-11 rounded-xl bg-white shadow-sm flex items-center justify-center mb-4 group-hover:bg-usps-blue transition-colors">
                  <item.icon className="w-5 h-5 text-usps-blue group-hover:text-white transition-colors" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stockage des documents */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Vos documents, stockés comme vous le souhaitez</h2>
            <p className="text-gray-600 text-lg">Gardez le contrôle total, ou confiez-nous l'archivage sur le long terme.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-8 rounded-2xl bg-white border-2 border-gray-100 hover:border-usps-blue/30 hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-xl bg-usps-blue flex items-center justify-center mb-5">
                <Server className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Votre propre infrastructure</h3>
              <p className="text-sm text-gray-600">
                Installez Registre Intelligent sur votre propre serveur ou sur votre ordinateur local. Vos documents restent chez vous, sous votre contrôle exclusif, sans jamais transiter par un tiers.
              </p>
            </div>
            <div className="p-8 rounded-2xl bg-white border-2 border-usps-blue/30 shadow-lg scale-[1.02]">
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

      {/* Du courrier à l'action */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">De la réception à l'action</h2>
          <p className="text-gray-600 text-lg mb-3">Registre Intelligent transforme chaque étape du cycle de vie de votre courrier.</p>
          <p className="text-gray-600 text-lg mb-12">Détectez les échéances, recevez des rappels et demandez simplement à vos documents ce que vous devez savoir.</p>
          <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
            {flow.map((step, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className={`px-4 py-2.5 rounded-lg font-semibold ${i === 0 ? 'bg-usps-blue text-white' : 'bg-gray-100 text-gray-700'}`}>{step}</span>
                {i < flow.length - 1 && <ArrowRight className="w-4 h-4 text-gray-300" />}
              </div>
            ))}
          </div>
          <div className="mt-12 p-8 rounded-2xl bg-usps-gray border border-usps-blue/20">
            <p className="text-lg text-gray-700 italic">
              « Votre courrier important doit être accessible, compréhensible, organisé et actionnable — où que vous soyez. »
            </p>
          </div>
        </div>
      </section>

      {/* Appel à l'action */}
      <section className="py-20 px-6 bg-usps-blue">
        <div className="max-w-3xl mx-auto text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Aucun courrier oublié. Aucune échéance manquée.</h2>
          <p className="text-white/80 text-lg mb-8">Essayez gratuitement et découvrez comment fonctionne une gestion intelligente de vos documents.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onTryFree}
              className="px-8 py-3.5 bg-white text-usps-blue rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all flex items-center gap-2 group"
            >
              Essayer gratuitement
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={onShowHowItWorks}
              className="px-8 py-3.5 bg-usps-blue-dark text-white rounded-xl font-semibold border border-white/20 hover:bg-usps-blue-dark/80 transition-all"
            >
              Voir comment ça marche
            </button>
          </div>
        </div>
      </section>

      {/* Pied de page */}
      <footer className="py-10 px-6 bg-gray-900 text-gray-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm font-semibold text-white">Registre Intelligent</p>
          <p className="text-sm">Documentation intelligente</p>
        </div>
      </footer>
    </div>
  );
}
