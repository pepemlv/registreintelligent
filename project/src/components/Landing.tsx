import {
  ArrowRight, Sparkles, FileText, Inbox, FolderKanban, CheckSquare, ClipboardCheck, Archive,
  LayoutDashboard, ScanLine, Brain, Send, ListChecks, Eye, ArrowDownToLine,
  MessageCircleQuestion, PhoneCall, MapPinned, MessageSquare, ShoppingCart,
  FileSearch, TrendingDown, Share2, Store, Handshake,
  Tractor, Cpu, HardHat, Zap, HeartPulse, Mountain, Truck, Briefcase,
  Clock, CalendarClock, ShieldCheck, Globe, TrendingUp, Eye as EyeIcon, Wallet,
} from 'lucide-react';

interface LandingProps {
  onEnter: () => void;
  onTryFree: () => void;
  onShowHowItWorks: () => void;
  onAdminLogin: () => void;
}

export default function Landing({ onEnter, onTryFree, onShowHowItWorks, onAdminLogin }: LandingProps) {
  const insideCards = [
    { icon: Inbox, title: 'Courriers intelligents', desc: "Enregistrez vos courriers entrants et sortants. L'IA lit, résume, classe et détecte automatiquement les informations importantes." },
    { icon: FolderKanban, title: 'Dossiers', desc: 'Regroupez courriers, contrats, factures, rapports, tâches, décisions et pièces jointes autour d\'une même affaire.' },
    { icon: CheckSquare, title: 'Tâches & échéances', desc: 'Transformez une instruction ou une recommandation en tâche avec responsable, priorité, échéance, rappel et suivi.' },
    { icon: TrendingUp, title: 'Suivi de projet en temps réel', desc: 'Suivez l’avancement des projets, les tâches, les responsables, les échéances et les indicateurs clés depuis un espace partagé.' },
    { icon: ClipboardCheck, title: 'Audits & recommandations', desc: "Transformez les recommandations d'audit et d'inspection en actions mesurables jusqu'à leur validation." },
    { icon: Archive, title: 'Archives intelligentes', desc: 'Archivez vos documents et retrouvez rapidement l\'information grâce à une organisation structurée et à la recherche intelligente.' },
    { icon: LayoutDashboard, title: 'Tableau de bord', desc: 'Visualisez immédiatement les dossiers urgents, tâches en retard, échéances, courriers à traiter et actions en attente.' },
  ];

  const mailSteps = [
    { icon: ScanLine, title: '1. Scannez', desc: 'Scannez, photographiez ou importez votre courrier.' },
    { icon: Brain, title: "2. L'IA analyse", desc: 'Expéditeur • Objet • Référence • Montants • Dates • Échéances • Résumé • Actions attendues' },
    { icon: Send, title: '3. Transmettez', desc: 'Envoyez le document au DG, à une direction, à un département ou à un collaborateur autorisé.' },
    { icon: ListChecks, title: '4. Agissez', desc: 'Créez une instruction, une tâche, une échéance ou une demande de traitement.' },
    { icon: Eye, title: '5. Suivez', desc: 'Visualisez qui a reçu, consulté, transmis, traité ou validé le document.' },
    { icon: ArrowDownToLine, title: '6. Archivez', desc: 'Conservez le document et tout son historique.' },
  ];
  const mailFlow = ['Réception', 'Analyse IA', 'Transmission', 'Action', 'Suivi', 'Validation', 'Archivage'];

  const statusQuestions = [
    'Où en sommes-nous avec ce client ?',
    'Qui traite ce courrier ?',
    'Le conseiller juridique a-t-il reçu cette plainte ?',
    'Quelle est notre prochaine échéance ?',
    "Qui s'occupe des recommandations de l'audit ?",
    'Quels dossiers sont en retard ?',
  ];
  const statusFlow = ['Responsable', 'Documents', 'Instructions', 'Tâches', 'Échéances', 'Dernière action', 'Statut'];

  const remoteActions = ['Consulter', 'Donner une instruction', 'Transmettre', 'Affecter', 'Valider', 'Rejeter', 'Demander une correction', 'Suivre'];

  const copilotQuestions = [
    'Quels courriers sont urgents ?',
    'Quelles échéances arrivent cette semaine ?',
    'Quels dossiers sont en retard ?',
    'Résume-moi ce contrat.',
    "Quelles recommandations d'audit restent ouvertes ?",
    'Quelles factures arrivent à échéance ?',
    'Compare ces offres fournisseurs.',
  ];

  const purchaseCompare = ['Prix', 'Qualité', 'Spécifications', 'Stock', 'Garantie', 'Localisation', 'Livraison'];
  const purchaseFlow = ['Besoin', 'Fournisseurs', 'Offres', 'Comparaison', 'Validation', 'Achat'];

  const rfqFields = ['Fournisseur', 'Produit', 'Quantité', 'Prix', 'Taxes', 'Livraison', 'Garantie', 'Total'];

  const tenderFields = ['Fournisseur', 'Produit', 'Prix', 'Quantité', 'Spécifications', 'Garantie', 'Disponibilité', 'Livraison', 'Total'];
  const tenderFlow = ['100 offres', 'Analyse IA', 'Données structurées', 'Tableau comparatif', 'Écarts signalés', 'Vérification humaine', 'Décision'];

  const showcaseFields = ['Profil', 'Secteur', 'Produits', 'Services', 'Prix', 'Stocks', 'Localisation', 'Livraison'];
  const directoryTags = [
    'Agriculture & Élevage', 'Alimentation', 'Banques & Finances', 'Informatique & Télécoms',
    'Construction & BTP', 'Énergie', 'Équipements', 'Import-Export', 'Industries', 'Mines',
    'Santé', 'Sécurité', 'Transport & Logistique', 'Services aux entreprises', 'et plus encore',
  ];

  const supplierActions = [
    'Consultez les appels d\'offres', 'Recevez les demandes correspondant à votre activité',
    'Répondez aux demandes de cotation', 'Envoyez vos pro forma', 'Présentez vos produits',
    'Recevez des demandes de disponibilité', 'Recevez des demandes de livraison', 'Soumettez directement vos offres',
  ];

  const sectors = [
    { icon: Tractor, title: 'Agriculture & élevage', items: 'Fermes • Plantations • Équipements agricoles • Intrants • Élevage • Produits vétérinaires' },
    { icon: Cpu, title: 'Bureautique, informatique & télécoms', items: 'Ordinateurs • Imprimantes • Logiciels • Réseaux • Internet • Télécommunications' },
    { icon: HardHat, title: 'Construction & travaux publics', items: 'Construction • Génie civil • Matériaux • Électricité • Plomberie • Engins' },
    { icon: Zap, title: 'Énergie', items: 'Électricité • Solaire • Groupes électrogènes • Batteries • Carburants' },
    { icon: HeartPulse, title: 'Santé', items: 'Hôpitaux • Cliniques • Pharmacies • Laboratoires • Matériel médical' },
    { icon: Mountain, title: 'Mines', items: 'Exploitation • Exploration • Forage • Équipements • Sous-traitance minière' },
    { icon: Truck, title: 'Transport & logistique', items: 'Route • Air • Fret • Transit • Livraison • Entreposage' },
    { icon: Briefcase, title: 'Services aux entreprises', items: 'Juridique • Audit • Comptabilité • RH • Formation • Nettoyage • Conseil' },
  ];

  const insideTags = ['Courriers', 'Dossiers', 'Projets en temps réel', 'Tâches', 'Échéances', 'Audits', 'Achats', 'Archives', 'IA'];
  const outsideTags = ['Annuaire B2B', 'Catalogue', 'Fournisseurs', 'Clients', 'Besoins', 'Cotations', "Appels d'offres", 'Opportunités'];

  const whyUs = [
    { icon: Clock, title: 'Gagnez du temps', desc: "Réduisez la recherche d'information, la saisie et les traitements administratifs répétitifs." },
    { icon: CalendarClock, title: 'Ne manquez plus une échéance', desc: 'Identifiez les dates importantes et organisez rappels et actions.' },
    { icon: ShieldCheck, title: 'Gardez le contrôle', desc: 'Suivez les documents, dossiers, responsables et décisions.' },
    { icon: Globe, title: 'Travaillez à distance', desc: 'Donnez accès aux informations nécessaires aux responsables autorisés, où qu\'ils se trouvent.' },
    { icon: Brain, title: 'Analysez plus rapidement', desc: "Utilisez l'IA pour lire et structurer documents et offres." },
    { icon: ShoppingCart, title: 'Achetez mieux', desc: 'Comparez prix, qualité, disponibilité et conditions.' },
    { icon: EyeIcon, title: 'Renforcez la transparence', desc: "Conservez l'historique des offres, prix et décisions." },
    { icon: Store, title: 'Soyez visible', desc: 'Présentez votre entreprise, vos produits et vos services aux acheteurs du réseau.' },
    { icon: TrendingUp, title: 'Vendez davantage', desc: "Transformez les besoins, cotations et appels d'offres en nouvelles opportunités commerciales." },
  ];

  return (
    <div className="min-h-screen bg-white text-ink-900">
      {/* Bandeau */}
      <div className="usps-bar fixed top-0 left-0 right-0 z-50" />
      {/* Navigation */}
      <nav className="fixed top-1 left-0 right-0 z-50 border-b border-ink-100 bg-white/85 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo-registre.png" alt="" className="h-9 w-9 rounded-lg bg-white object-contain p-0.5 shadow-sm" />
            <span className="font-display font-bold text-ink-900 text-lg">Registre Intelligent</span>
            <span className="text-[10px] font-bold text-accent-700 bg-accent-50 px-1.5 py-0.5 rounded">IA</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={onShowHowItWorks}
              className="hidden sm:inline text-sm font-medium text-ink-600 hover:text-primary-600 transition-colors"
            >
              Comment ça marche
            </button>
            <button
              onClick={onEnter}
              className="px-5 py-2 rounded-xl bg-primary-600 text-white text-sm font-bold shadow-lg shadow-primary-600/20 hover:bg-primary-700 transition-colors"
            >
              Essai gratuit
            </button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative h-screen h-[100svh] min-h-0 overflow-hidden bg-white pt-20 lg:h-auto lg:min-h-[720px]">
        <img
          src="/hero pc.png"
          alt="Tableau de bord Registre Intelligent connecté au courrier scanné"
          className="absolute right-4 top-32 hidden h-auto w-[49%] rounded-3xl object-contain shadow-2xl shadow-ink-900/10 lg:block"
        />
        <img
          src="/hero mboile.png"
          alt="Tableau de bord Registre Intelligent connecté au courrier scanné"
          className="absolute inset-x-5 top-28 block h-auto w-[calc(100%-2.5rem)] rounded-3xl object-cover shadow-xl lg:hidden"
        />
        <div className="landing-hero-content relative z-10 mx-auto flex h-full min-h-0 max-w-7xl items-start px-4 pt-16 sm:px-6 lg:h-auto lg:min-h-[640px] lg:px-8">
          <div className="max-w-xl lg:w-[48%] lg:pt-10">
            <div className="landing-hero-badge inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-50 border border-primary-200 text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              Registre Intelligent
            </div>
            <h1 className="landing-hero-title font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-ink-900 leading-[1.1] mb-6">
              Gérez mieux votre entreprise.<br />
              <span className="text-primary-700">Achetez mieux. Vendez davantage.</span>
            </h1>
            <p className="landing-hero-description text-base lg:text-lg text-ink-500 leading-relaxed mb-8 max-w-xl">
              Registre Intelligent accompagne les entreprises et les institutions publiques ou privées. La plateforme centralise courriers, dossiers, projets, tâches, échéances, audits et achats, tout en connectant votre organisation à un réseau B2B de fournisseurs, clients et opportunités.
            </p>
            <p className="hidden">
              L'intelligence artificielle vous aide à <strong className="text-white">lire, classer, analyser, comparer, suivre et transformer l'information en action</strong>, dans un environnement sécurisé et traçable.
            </p>
            <div className="landing-hero-actions flex flex-col sm:flex-row items-start gap-3 mb-8">
              <button
                onClick={onTryFree}
                className="px-6 py-3.5 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-primary-600 to-accent-600 shadow-xl shadow-primary-600/25 hover:shadow-primary-600/40 transition-all flex items-center gap-2 group"
              >
                Commencer gratuitement
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button onClick={onShowHowItWorks} className="px-6 py-3.5 rounded-2xl text-sm font-bold text-ink-700 bg-white border border-ink-200 hover:border-primary-300 hover:bg-primary-50/30 transition-all">
                Voir la démonstration
              </button>
            </div>
          </div>
        </div>
        <div className="hidden">
          <button
            onClick={onTryFree}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-400 px-5 py-2.5 text-sm font-bold text-slate-950 shadow-lg shadow-rose-400/25 transition-all hover:bg-rose-300 hover:shadow-xl hover:shadow-rose-400/30 whitespace-nowrap group"
          >
            Commencer gratuitement
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
          <button onClick={onShowHowItWorks} className="flex flex-1 items-center justify-center rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition-all hover:border-gray-300 hover:bg-gray-50 whitespace-nowrap">
            Voir la démonstration
          </button>
        </div>
      </section>

      <section className="bg-ink-900 py-3 sm:py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-8">
          {[['Courriers', 'Entrants et sortants'], ['IA', 'Lecture et analyse'], ['Achats', 'Cotation et comparaison'], ['B2B', 'Clients et fournisseurs']].map(([value, label]) => <div key={value} className="text-center"><p className="font-display text-2xl lg:text-3xl font-bold text-white">{value}</p><p className="text-xs text-ink-400 mt-1">{label}</p></div>)}
        </div>
      </section>

      {/* TOUTE VOTRE ENTREPRISE DANS UN SEUL ESPACE */}
      <section id="features" className="py-20 lg:py-28 bg-white px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <p className="text-xs font-bold uppercase tracking-wide text-usps-blue mb-3">Toute votre entreprise dans un seul espace</p>
            <h2 className="text-3xl font-bold text-gray-900 mb-5">Arrêtez de chercher l'information. Commencez à l'exploiter.</h2>
            <p className="text-gray-600 leading-relaxed mb-3">
              Courriers dans un parapheur. Documents dans des classeurs. Instructions sur WhatsApp. Dossiers sur différents ordinateurs.
              Échéances dans la mémoire d'un collaborateur. Offres fournisseurs dans des emails.
            </p>
            <p className="text-gray-900 font-semibold">Registre Intelligent rassemble tout dans un même environnement.</p>
          </div>
          <div className="mb-12">
            <h2 className="text-center text-3xl font-bold text-gray-900 mb-8">Une plateforme. Deux forces.</h2>
            <div className="grid md:grid-cols-2 gap-5">
              <div className="p-6 md:p-8 rounded-lg bg-usps-gray border border-usps-blue/20">
                <div className="w-11 h-11 rounded-lg bg-usps-blue flex items-center justify-center mb-5">
                  <ShieldCheck className="w-5 h-5 text-white" />
                </div>
                <p className="text-xs font-bold uppercase tracking-wide text-usps-blue mb-2">À l’intérieur de votre entreprise</p>
                <h3 className="text-2xl font-bold text-gray-900 mb-5">Gérez mieux.</h3>
                <div className="flex flex-wrap gap-2">
                  {insideTags.map((tag) => <span key={tag} className="px-3 py-1.5 rounded-md bg-white border border-usps-blue/20 text-sm font-semibold text-usps-blue">{tag}</span>)}
                </div>
              </div>
              <div className="p-6 md:p-8 rounded-lg bg-red-50 border border-usps-red/20">
                <div className="w-11 h-11 rounded-lg bg-usps-red flex items-center justify-center mb-5">
                  <Share2 className="w-5 h-5 text-white" />
                </div>
                <p className="text-xs font-bold uppercase tracking-wide text-usps-red mb-2">À l’extérieur de votre entreprise</p>
                <h3 className="text-2xl font-bold text-gray-900 mb-5">Développez votre marché.</h3>
                <div className="flex flex-wrap gap-2">
                  {outsideTags.map((tag) => <span key={tag} className="px-3 py-1.5 rounded-md bg-white border border-usps-red/20 text-sm font-semibold text-usps-red">{tag}</span>)}
                </div>
              </div>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {insideCards.map((item, i) => (
              <div key={i} className="p-6 rounded-2xl bg-white border border-gray-100 hover:shadow-md transition-all group">
                <div className="w-11 h-11 rounded-xl bg-usps-gray flex items-center justify-center mb-4 group-hover:bg-usps-blue transition-colors">
                  <item.icon className="w-5 h-5 text-usps-blue group-hover:text-white transition-colors" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* VOTRE COURRIER NE S'ARRÊTE PLUS AU SECRÉTARIAT */}
      <section className="hidden">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <p className="text-xs font-bold uppercase tracking-wide text-usps-red mb-3">Votre courrier ne s'arrête plus au secrétariat</p>
            <h2 className="text-3xl font-bold text-gray-900">Du courrier reçu à l'action.</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-12">
            {mailSteps.map((step, i) => (
              <div key={i} className="p-6 rounded-2xl bg-gray-50 border border-gray-100">
                <div className="w-11 h-11 rounded-xl bg-usps-blue flex items-center justify-center mb-4">
                  <step.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
            {mailFlow.map((step, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className={`px-4 py-2.5 rounded-lg font-semibold ${i === 0 ? 'bg-usps-blue text-white' : 'bg-gray-100 text-gray-700'}`}>{step}</span>
                {i < mailFlow.length - 1 && <ArrowRight className="w-4 h-4 text-gray-300" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* OÙ EN SOMMES-NOUS ? */}
      <section className="hidden">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <p className="text-xs font-bold uppercase tracking-wide text-sky-300 mb-3">Où en sommes-nous ?</p>
            <h2 className="text-3xl font-bold">La réponse est déjà dans Registre Intelligent.</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
            {statusQuestions.map((q, i) => (
              <div key={i} className="p-5 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3">
                <MessageCircleQuestion className="w-5 h-5 text-sky-300 shrink-0 mt-0.5" />
                <p className="text-sm text-gray-100 italic">« {q} »</p>
              </div>
            ))}
          </div>
          <p className="text-center text-gray-300 mb-6">Registre Intelligent centralise l'historique de chaque dossier.</p>
          <div className="flex flex-wrap items-center justify-center gap-2 text-sm mb-10">
            {statusFlow.map((step, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="px-4 py-2.5 rounded-lg font-semibold bg-white/10 text-white">{step}</span>
                {i < statusFlow.length - 1 && <ArrowRight className="w-4 h-4 text-white/30" />}
              </div>
            ))}
          </div>
          <p className="text-center text-xl font-bold">Moins de recherches. Moins d'appels. Plus de visibilité.</p>
        </div>
      </section>

      {/* VOTRE ENTREPRISE CONTINUE DE FONCTIONNER, MÊME À DISTANCE */}
      <section className="hidden">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <p className="text-xs font-bold uppercase tracking-wide text-usps-blue mb-3">Votre entreprise continue de fonctionner, même à distance</p>
            <h2 className="text-3xl font-bold text-gray-900">Le DG est en voyage ? Le document n'attend plus sur son bureau.</h2>
            <p className="text-gray-600 mt-4">Les responsables autorisés accèdent à leurs dossiers depuis leur espace sécurisé. Ils peuvent :</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 text-sm mb-12">
            {remoteActions.map((step, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="px-4 py-2.5 rounded-lg font-semibold bg-white border border-gray-200 text-gray-700 shadow-sm">{step}</span>
                {i < remoteActions.length - 1 && <ArrowRight className="w-4 h-4 text-gray-300" />}
              </div>
            ))}
          </div>
          <div className="grid sm:grid-cols-3 gap-4 mb-10 max-w-4xl mx-auto">
            {[
              { icon: PhoneCall, text: 'Le DG est au ministère.' },
              { icon: MapPinned, text: 'Le Directeur est en mission.' },
              { icon: Globe, text: 'Le responsable travaille depuis une autre ville.' },
            ].map((item, i) => (
              <div key={i} className="p-5 rounded-2xl bg-white border border-gray-100 flex items-start gap-3">
                <item.icon className="w-5 h-5 text-usps-blue shrink-0 mt-0.5" />
                <p className="text-sm text-gray-700">{item.text}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-gray-900 font-semibold mb-2">L'information reste accessible et le processus continue.</p>
          <p className="text-center text-xl font-bold text-usps-blue">Votre entreprise fonctionne là où se trouvent ses décideurs.</p>
        </div>
      </section>

      {/* COPILOTE IA */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <p className="text-xs font-bold uppercase tracking-wide text-usps-red mb-3">Copilote IA</p>
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Posez une question à votre entreprise.</h2>
            <p className="text-gray-600">Registre Intelligent transforme vos documents en informations exploitables. Demandez par exemple :</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
            {copilotQuestions.map((q, i) => (
              <div key={i} className="p-5 rounded-2xl bg-usps-gray border border-usps-blue/20 flex items-start gap-3">
                <MessageSquare className="w-5 h-5 text-usps-blue shrink-0 mt-0.5" />
                <p className="text-sm text-gray-700 italic">« {q} »</p>
              </div>
            ))}
          </div>
          <p className="text-center text-xl font-bold text-gray-900">Vos documents ne sont plus seulement stockés. Ils deviennent exploitables.</p>
        </div>
      </section>

      {/* ACHATS INTELLIGENTS */}
      <section className="hidden">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <p className="text-xs font-bold uppercase tracking-wide text-usps-blue mb-3">Achats intelligents</p>
            <h2 className="text-3xl font-bold text-gray-900">Achetez au meilleur rapport prix, qualité et disponibilité.</h2>
            <p className="text-gray-600 mt-4">Exprimez simplement votre besoin :</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 mb-10">
            {['20 ordinateurs Core i7', '10 imprimantes laser', '5 onduleurs'].map((need, i) => (
              <span key={i} className="px-4 py-2.5 rounded-xl bg-white border border-gray-200 shadow-sm text-sm font-semibold text-gray-800">{need}</span>
            ))}
          </div>
          <p className="text-center text-gray-600 mb-6">Registre Intelligent rapproche votre besoin des fournisseurs et catalogues disponibles. Comparez :</p>
          <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
            {purchaseCompare.map((item) => (
              <span key={item} className="px-3 py-1.5 rounded-full bg-white border border-gray-200 text-xs font-medium text-gray-700">{item}</span>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 text-sm mb-8">
            {purchaseFlow.map((step, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className={`px-4 py-2.5 rounded-lg font-semibold ${i === 0 ? 'bg-usps-blue text-white' : 'bg-white border border-gray-200 text-gray-700'}`}>{step}</span>
                {i < purchaseFlow.length - 1 && <ArrowRight className="w-4 h-4 text-gray-300" />}
              </div>
            ))}
          </div>
          <p className="text-center text-xl font-bold text-gray-900">Plus de concurrence. Plus de transparence. Plus de contrôle.</p>
        </div>
      </section>

      {/* DEMANDES DE COTATION */}
      <section className="hidden">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <p className="text-xs font-bold uppercase tracking-wide text-usps-red mb-3">Demandes de cotation</p>
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Consultez plusieurs fournisseurs avant de décider.</h2>
            <p className="text-gray-600">Créez une demande de cotation directement depuis votre état de besoin.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6 mb-10">
            <div className="p-8 rounded-2xl bg-white border-2 border-gray-100 hover:border-usps-blue/30 hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-xl bg-usps-blue flex items-center justify-center mb-5">
                <Globe className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Consultation ouverte</h3>
              <p className="text-sm text-gray-600">Publiez votre demande auprès des fournisseurs qualifiés du réseau.</p>
            </div>
            <div className="p-8 rounded-2xl bg-white border-2 border-usps-red/30 hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-xl bg-usps-red flex items-center justify-center mb-5">
                <FileSearch className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Consultation ciblée</h3>
              <p className="text-sm text-gray-600">Sélectionnez directement les fournisseurs que vous souhaitez consulter.</p>
            </div>
          </div>
          <p className="text-center text-gray-600 mb-4">Les offres sont reçues et conservées dans un même environnement.</p>
          <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
            {rfqFields.map((item) => (
              <span key={item} className="px-3 py-1.5 rounded-full bg-gray-50 border border-gray-200 text-xs font-medium text-gray-700">{item}</span>
            ))}
          </div>
          <p className="text-center text-xl font-bold text-gray-900">Chaque décision devient documentée et traçable.</p>
        </div>
      </section>

      {/* APPELS D'OFFRES + IA */}
      <section className="hidden">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <p className="text-xs font-bold uppercase tracking-wide text-sky-300 mb-3">Appels d'offres + intelligence artificielle</p>
            <h2 className="text-3xl font-bold mb-3">50 ou 100 offres à analyser ?</h2>
            <p className="text-gray-300">Ne mobilisez plus votre équipe pour tout recopier manuellement. Importez les offres reçues, Registre Intelligent extrait automatiquement :</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 mb-12">
            {tenderFields.map((item) => (
              <span key={item} className="px-3 py-1.5 rounded-full bg-white/10 text-xs font-medium text-gray-100">{item}</span>
            ))}
          </div>
          <p className="text-center text-gray-300 mb-8">Puis prépare la comparaison selon vos critères.</p>
          <div className="flex flex-wrap items-center justify-center gap-2 text-sm mb-10">
            {tenderFlow.map((step, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="px-4 py-2.5 rounded-lg font-semibold bg-white/10 text-white">{step}</span>
                {i < tenderFlow.length - 1 && <ArrowRight className="w-4 h-4 text-white/30" />}
              </div>
            ))}
          </div>
          <p className="text-center text-gray-300 mb-2">Votre commission consacre son temps à l'essentiel :</p>
          <p className="text-center text-2xl font-bold mb-3">Vérifier. Comprendre. Décider.</p>
          <p className="text-center text-sm text-gray-400">La décision finale reste entre les mains de votre organisation.</p>
        </div>
      </section>

      {/* RÉDUISEZ LES RISQUES DE SURFACTURATION */}
      <section className="hidden">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-xs font-bold uppercase tracking-wide text-usps-red mb-3">Réduisez les risques de surfacturation</p>
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Comparez avant de payer.</h2>
          <p className="text-gray-600 mb-8">Registre Intelligent conserve l'historique de vos prix, fournisseurs, offres, pro forma, cotations et décisions.</p>
          <div className="max-w-md mx-auto p-6 rounded-2xl bg-gray-50 border border-gray-200 text-left mb-6">
            <div className="flex items-center gap-2 mb-3 text-sm text-gray-600"><Wallet className="w-4 h-4 text-usps-blue" /> Derniers prix : <strong className="text-gray-900">450 $ • 465 $ • 480 $</strong></div>
            <div className="flex items-center gap-2 mb-4 text-sm text-gray-600"><TrendingDown className="w-4 h-4 rotate-180 text-usps-red" /> Nouvelle proposition : <strong className="text-usps-red">720 $</strong></div>
            <div className="p-3 rounded-xl bg-red-50 border border-usps-red/30 text-sm font-semibold text-usps-red">Écart important détecté — Vérification recommandée.</div>
          </div>
          <p className="text-gray-600 mb-8">Vous disposez ainsi d'éléments concrets avant de valider une décision d'achat.</p>
          <p className="text-2xl font-bold text-gray-900">Économisez. Comparez. Justifiez. Contrôlez.</p>
        </div>
      </section>

      {/* RÉSEAU B2B */}
      <section id="b2b" className="py-20 lg:py-28 px-6 bg-ink-50">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs font-bold uppercase tracking-wide text-usps-blue mb-3">Réseau B2B Registre Intelligent</p>
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Vous avez la meilleure offre. Mais qui la voit ?</h2>
          <p className="text-gray-600 mb-3">
            Votre entreprise peut proposer un excellent produit, un meilleur prix, un meilleur service ou une meilleure disponibilité.
          </p>
          <p className="text-gray-600 mb-8">
            Mais si les décideurs ne vous connaissent pas, votre offre reste invisible. La publicité, la notoriété, l'ancienneté,
            l'emplacement et les réseaux commerciaux donnent souvent davantage de visibilité à certains concurrents.
          </p>
          <p className="text-2xl font-bold text-usps-blue">Registre Intelligent connecte votre offre aux entreprises qui recherchent ce que vous vendez.</p>
        </div>
      </section>

      {/* CRÉEZ VOTRE VITRINE B2B */}
      <section className="hidden">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-xs font-bold uppercase tracking-wide text-usps-red mb-3">Créez votre vitrine B2B</p>
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Transformez votre catalogue en canal commercial.</h2>
          <p className="text-gray-600 mb-4">Présentez votre entreprise :</p>
          <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
            {showcaseFields.map((item) => (
              <span key={item} className="px-3 py-1.5 rounded-full bg-usps-gray border border-usps-blue/20 text-xs font-medium text-usps-blue">{item}</span>
            ))}
          </div>
          <p className="text-gray-600 mb-4">Votre activité est classée dans l'annuaire professionnel :</p>
          <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
            {directoryTags.map((item) => (
              <span key={item} className="px-3 py-1.5 rounded-full bg-gray-50 border border-gray-200 text-xs font-medium text-gray-600">{item}</span>
            ))}
          </div>
          <p className="text-gray-600 mb-3">Lorsqu'un acheteur recherche un produit ou service correspondant à votre activité :</p>
          <p className="text-2xl font-bold text-gray-900">Votre offre devient visible auprès du décideur concerné.</p>
        </div>
      </section>

      {/* VENDEZ AU-DELÀ DE VOTRE RÉSEAU HABITUEL */}
      <section className="hidden">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <p className="text-xs font-bold uppercase tracking-wide text-sky-300 mb-3">Vendez au-delà de votre réseau habituel</p>
            <h2 className="text-3xl font-bold mb-3">Les besoins des entreprises deviennent vos opportunités.</h2>
            <p className="text-gray-300">Depuis votre espace fournisseur :</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-12">
            {supplierActions.map((action, i) => (
              <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2.5">
                <Handshake className="w-4 h-4 text-sky-300 shrink-0" />
                <span className="text-sm text-gray-100">{action}</span>
              </div>
            ))}
          </div>
          <div className="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto mb-8">
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
              <p className="text-[10px] font-bold uppercase text-gray-400 mb-2">L'entreprise acheteuse dit</p>
              <p className="text-sm italic text-gray-100">« Voici ce dont j'ai besoin. »</p>
            </div>
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
              <p className="text-[10px] font-bold uppercase text-gray-400 mb-2">Le fournisseur dit</p>
              <p className="text-sm italic text-gray-100">« Voici ce que je peux fournir. »</p>
            </div>
          </div>
          <p className="text-center text-gray-300 mb-1">Registre Intelligent les connecte.</p>
          <p className="text-center text-2xl font-bold">Vos produits rencontrent les besoins des entreprises.</p>
        </div>
      </section>

      {/* ANNUAIRE B2B PAR SECTEUR */}
      <section className="hidden">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <p className="text-xs font-bold uppercase tracking-wide text-usps-blue mb-3">Un annuaire B2B organisé par secteur</p>
            <h2 className="text-3xl font-bold text-gray-900">Trouvez rapidement le bon fournisseur.</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {sectors.map((sector, i) => (
              <div key={i} className="p-6 rounded-2xl bg-white border border-gray-100 hover:shadow-md transition-all">
                <div className="w-11 h-11 rounded-xl bg-usps-gray flex items-center justify-center mb-4">
                  <sector.icon className="w-5 h-5 text-usps-blue" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2 text-sm">{sector.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{sector.items}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-gray-500 mt-8">Et de nombreux autres secteurs d'activité.</p>
        </div>
      </section>

      {/* Cartes déplacées dans la section principale des fonctionnalités. */}
      <section className="hidden">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900">Une plateforme. Deux forces.</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-8 rounded-2xl bg-usps-gray border-2 border-usps-blue/20">
              <div className="w-12 h-12 rounded-xl bg-usps-blue flex items-center justify-center mb-5">
                <ShieldCheck className="w-6 h-6 text-white" />
              </div>
              <p className="text-xs font-bold uppercase tracking-wide text-usps-blue mb-2">À l'intérieur de votre entreprise</p>
              <h3 className="text-xl font-bold text-gray-900 mb-5">Gérez mieux.</h3>
              <div className="flex flex-wrap gap-2">
                {insideTags.map((tag) => (
                  <span key={tag} className="px-3 py-1.5 rounded-full bg-white border border-usps-blue/20 text-xs font-semibold text-usps-blue">{tag}</span>
                ))}
              </div>
            </div>
            <div className="p-8 rounded-2xl bg-red-50 border-2 border-usps-red/20">
              <div className="w-12 h-12 rounded-xl bg-usps-red flex items-center justify-center mb-5">
                <Share2 className="w-6 h-6 text-white" />
              </div>
              <p className="text-xs font-bold uppercase tracking-wide text-usps-red mb-2">À l'extérieur de votre entreprise</p>
              <h3 className="text-xl font-bold text-gray-900 mb-5">Développez votre marché.</h3>
              <div className="flex flex-wrap gap-2">
                {outsideTags.map((tag) => (
                  <span key={tag} className="px-3 py-1.5 rounded-full bg-white border border-usps-red/20 text-xs font-semibold text-usps-red">{tag}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* POURQUOI REGISTRE INTELLIGENT */}
      <section className="hidden">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900">Pourquoi Registre Intelligent ?</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {whyUs.map((item, i) => (
              <div key={i} className="p-6 rounded-2xl bg-white border border-gray-100 hover:shadow-md transition-all group">
                <div className="w-11 h-11 rounded-xl bg-gray-50 shadow-sm flex items-center justify-center mb-4 group-hover:bg-usps-blue transition-colors">
                  <item.icon className="w-5 h-5 text-usps-blue group-hover:text-white transition-colors" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2 text-sm">{item.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Appel à l'action final */}
      <section className="py-20 px-6 bg-usps-blue">
        <div className="max-w-3xl mx-auto text-center text-white">
          <p className="text-xs font-bold uppercase tracking-wide text-white/70 mb-3">Registre Intelligent</p>
          <h2 className="text-2xl font-bold mb-2">Une plateforme pour gérer votre entreprise et la connecter au marché.</h2>
          <p className="text-white/80 mb-1">À l'intérieur, gérez mieux.</p>
          <p className="text-white/80 mb-8">À l'extérieur, soyez visible.</p>
          <h3 className="text-2xl font-bold mb-8">Gagnez du temps. Décidez plus vite. Achetez mieux. Développez votre marché.</h3>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <button
              onClick={onTryFree}
              className="px-8 py-3.5 bg-white text-usps-blue rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all flex items-center gap-2 group"
            >
              Commencer gratuitement
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={onShowHowItWorks}
              className="px-8 py-3.5 bg-usps-blue-dark text-white rounded-xl font-semibold border border-white/20 hover:bg-usps-blue-dark/80 transition-all"
            >
              Demander une démonstration
            </button>
          </div>
          <p className="text-sm text-white/70 italic">« De l'information à l'action. De l'action à la décision. »</p>
        </div>
      </section>

      {/* Pied de page */}
      <footer className="py-10 px-6 bg-gray-900 text-gray-400">
        <div className="mb-4 text-center"><button onClick={onAdminLogin} className="text-xs text-gray-500 underline hover:text-white">Administration système · Gestion des abonnements</button></div>
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm font-semibold text-white">Registre Intelligent</p>
          <p className="text-sm">Gérez votre entreprise. Connectez votre marché.</p>
        </div>
      </footer>
    </div>
  );
}
