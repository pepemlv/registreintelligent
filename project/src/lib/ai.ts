import type { DocumentItem } from './types';
import { auth } from './firebase';
import { getCategoryMeta } from './categories';
import { compareNewestDocuments } from './documentSort';
import { frenchDocumentSender, frenchDocumentSummary, frenchDocumentTitle, frenchDocumentType, frenchText } from './frenchText';

export interface AIProcessResult {
  title: string;
  sender: string;
  category: string;
  document_type: string;
  summary: string;
  content_text: string;
  amount_due: number | null;
  due_date: string | null;
  key_points?: string[];
  priority: string;
  status: string;
  processed_by?: string | null;
}

const SAMPLE_DOCUMENTS: AIProcessResult[] = [
  {
    title: 'Facture d\'eau — Septembre 2026',
    sender: 'Service des eaux de la ville',
    category: 'Bills',
    document_type: 'Facture de services publics',
    summary: 'Votre facture d\'eau de septembre s\'élève à 67,40 €, à régler avant le 5 octobre. La consommation était de 12 100 litres, conforme au mois dernier. Le paiement peut être effectué en ligne ou à la mairie.',
    content_text: 'SERVICE DES EAUX DE LA VILLE — FACTURE MENSUELLE\nCompte : WD-3382\nPériode de facturation : Septembre 2026\nConsommation : 12 100 litres\nMontant dû : 67,40 €\nDate d\'échéance : 5 octobre 2026\nPayez en ligne sur ville-eau.fr ou à la mairie.',
    amount_due: 67.40,
    due_date: '2026-10-05',
    priority: 'normal',
    status: 'unread',
  },
  {
    title: 'Relevé de carte bancaire — Septembre 2026',
    sender: 'Banque Capital One',
    category: 'Banking',
    document_type: 'Relevé de carte bancaire',
    summary: 'Votre relevé de carte bancaire de septembre affiche un solde de 2 340,85 €, avec un paiement minimum de 47,00 € dû le 12 octobre. Aucune activité frauduleuse détectée. Points de fidélité cumulés : 2 340.',
    content_text: 'BANQUE CAPITAL ONE — RELEVÉ DE CARTE BANCAIRE\nCarte : ****4471\nPériode : du 1er au 30 septembre 2026\nSolde précédent : 2 100,30 €\nNouvelles opérations : 540,55 €\nPaiements : -309,00 €\nNouveau solde : 2 340,85 €\nPaiement minimum : 47,00 €\nDate d\'échéance : 12 octobre 2026\nPoints de fidélité cumulés : 2 340',
    amount_due: 2340.85,
    due_date: '2026-10-12',
    priority: 'normal',
    status: 'unread',
  },
  {
    title: 'Avis de renouvellement de la carte grise',
    sender: 'Préfecture',
    category: 'Government',
    document_type: 'Avis administratif',
    summary: 'Votre carte grise expire le 31 octobre. Les frais de renouvellement s\'élèvent à 98,00 €. Vous pouvez renouveler en ligne, par courrier ou en personne. Le contrôle technique doit être à jour avant le renouvellement.',
    content_text: 'PRÉFECTURE — RENOUVELLEMENT DE LA CARTE GRISE\nVéhicule : Honda Civic 2022\nImmatriculation : AB-782-CD\nExpiration : 31 octobre 2026\nFrais de renouvellement : 98,00 €\nRenouvelez en ligne sur ants.gouv.fr, par courrier ou en personne.\nContrôle technique à jour requis avant le renouvellement.',
    amount_due: 98.00,
    due_date: '2026-10-31',
    priority: 'high',
    status: 'action_required',
  },
  {
    title: 'Assurance santé — Mise à jour de la couverture',
    sender: 'Mutuelle Santé Plus',
    category: 'Insurance',
    document_type: 'Avis de couverture',
    summary: 'Les garanties de votre mutuelle santé sont mises à jour pour l\'année 2027. La cotisation passera à 420 €/mois à partir du 1er janvier. Consultez les détails de la nouvelle couverture et confirmez avant le 15 novembre.',
    content_text: 'MUTUELLE SANTÉ PLUS — MISE À JOUR DU CONTRAT\nContrat : Formule Famille 500\nAssuré(e) : [Sur dossier]\nDate d\'effet : 1er janvier 2027\nNouvelle cotisation : 420,00 €/mois\nFranchise : 500 € individuel / 1 000 € famille\nChangements : mise à jour de la liste des médicaments remboursés\nAction requise : consulter et confirmer avant le 15 novembre 2026',
    amount_due: null,
    due_date: '2026-11-15',
    priority: 'normal',
    status: 'read',
  },
  {
    title: 'Avis d\'imposition foncière',
    sender: 'Centre des impôts fonciers',
    category: 'Taxes',
    document_type: 'Avis d\'imposition',
    summary: 'Votre bien a été réévalué à 385 000 €. La taxe foncière annuelle de 4 620 € est due le 15 décembre. Vous pouvez contester l\'évaluation dans un délai de 30 jours si vous n\'êtes pas d\'accord avec ce montant.',
    content_text: 'CENTRE DES IMPÔTS FONCIERS — AVIS D\'IMPOSITION\nBien : 142 rue des Érables\nValeur évaluée : 385 000 €\nTaxe annuelle : 4 620,00 €\nDate d\'échéance : 15 décembre 2026\nDélai de réclamation : 30 jours à compter de la date de l\'avis\nPayez sur impots.gouv.fr ou par courrier.',
    amount_due: 4620.00,
    due_date: '2026-12-15',
    priority: 'normal',
    status: 'read',
  },
];

export function simulateAIProcessing(): Promise<AIProcessResult> {
  const delay = 1800 + Math.random() * 1200;
  const doc = SAMPLE_DOCUMENTS[Math.floor(Math.random() * SAMPLE_DOCUMENTS.length)];
  return new Promise((resolve) => {
    setTimeout(() => resolve({ ...doc }), delay);
  });
}

interface BackendAnalysis {
  category?: string;
  summary?: string;
  documentType?: string;
  issuer?: string | null;
  issueDate?: string | null;
  expirationDate?: string | null;
  amount?: number | null;
  currency?: string;
  tags?: string[];
  keywords?: string[];
  keyPoints?: string[];
}

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:3001' : 'https://registreintelligent-api.onrender.com')).replace(/\/+$/, '');

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = () => reject(new Error('Impossible de lire le fichier sélectionné.'));
    reader.readAsDataURL(file);
  });
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Impossible de lire l\'image sélectionnée.'));
    reader.readAsDataURL(file);
  });
}

async function postToAi<T>(path: string, body: unknown): Promise<T> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('Veuillez vous connecter avant d\'analyser des documents.');

  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error('Serveur IA inaccessible. Configurez VITE_API_BASE_URL avec l’URL HTTPS du backend et autorisez ce site dans ALLOWED_ORIGINS.');
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || 'Le service d\'extraction IA n\'a pas pu traiter ce document.');
  }
  return payload as T;
}

function mapCategory(category?: string, documentType?: string): string {
  const text = `${category || ''} ${documentType || ''}`.toLowerCase();
  if (text.includes('invoice') || text.includes('receipt') || text.includes('utility') || text.includes('bill')) return 'Bills';
  if (text.includes('passport') || text.includes('driver') || text.includes('government')) return 'Government';
  if (text.includes('tax')) return 'Taxes';
  if (text.includes('insurance')) return 'Insurance';
  if (text.includes('medical') || text.includes('health')) return 'Medical';
  if (text.includes('bank') || text.includes('statement') || text.includes('financial')) return 'Banking';
  if (text.includes('legal') || text.includes('contract')) return 'Legal';
  if (text.includes('employment')) return 'Employment';
  if (text.includes('academic') || text.includes('school')) return 'School';
  return 'Other';
}

function derivePriority(dueDate: string | null, amount: number | null): string {
  if (!dueDate) return amount && amount > 1000 ? 'high' : 'normal';
  const days = Math.ceil((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days <= 3) return 'urgent';
  if (days <= 14 || (amount && amount > 1000)) return 'high';
  return 'normal';
}

function toResult(file: File, fullText: string, analysis: BackendAnalysis, engine: string | null): AIProcessResult {
  const documentType = analysis.documentType || 'Document';
  const sender = analysis.issuer || 'Expéditeur inconnu';
  const dueDate = analysis.expirationDate || null;
  const amount = typeof analysis.amount === 'number' ? analysis.amount : null;

  return {
    title: sender === 'Expéditeur inconnu' ? documentType : `${sender} - ${documentType}`,
    sender,
    category: mapCategory(analysis.category, documentType),
    document_type: documentType,
    summary: analysis.summary || 'Le document a été extrait, mais aucun résumé n\'a été renvoyé.',
    content_text: fullText || `${file.name}\n\nAucun texte lisible n'a été extrait.`,
    amount_due: amount,
    due_date: dueDate,
    key_points: Array.isArray(analysis.keyPoints) ? analysis.keyPoints.filter((point): point is string => typeof point === 'string' && Boolean(point.trim())) : [],
    priority: derivePriority(dueDate, amount),
    status: 'unread',
    processed_by: engine,
  };
}

export type AnalysisStep = 'extract' | 'identify' | 'detect';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * `onStepDone` is called once per step in order (extract -> identify -> detect)
 * so the UI can check them off as they complete. The PDF endpoint does all the
 * work in a single request with no mid-flight signal, so its steps are revealed
 * with a short stagger after the response lands rather than tracking real
 * server-side progress.
 */
export async function analyzeDocumentFile(file: File, onStepDone?: (step: AnalysisStep) => void): Promise<AIProcessResult> {
  const notify = onStepDone ?? (() => undefined);
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  if (isPdf) {
    const pdfBase64 = await fileToBase64(file);
    const result = await postToAi<{ fullText: string; analysis: BackendAnalysis; engine: string }>('/api/ai/analyze-pdf', { pdfBase64 });
    notify('extract');
    await sleep(250);
    notify('identify');
    await sleep(250);
    notify('detect');
    return toResult(file, result.fullText, result.analysis, result.engine);
  }

  const isWord = /\.(doc|docx)$/i.test(file.name)
    || file.type === 'application/msword'
    || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (isWord) {
    const wordBase64 = await fileToBase64(file);
    const result = await postToAi<{ fullText: string; analysis: BackendAnalysis; engine: string }>('/api/ai/analyze-word', { wordBase64 });
    notify('extract');
    await sleep(250);
    notify('identify');
    await sleep(250);
    notify('detect');
    return toResult(file, result.fullText, result.analysis, result.engine);
  }

  if (!['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(file.type)) {
    throw new Error('L\'extraction réelle prend actuellement en charge les fichiers PDF, PNG, JPG et WEBP.');
  }

  const imageDataUrl = await fileToDataUrl(file);
  const ocr = await postToAi<{ text: string }>('/api/ai/vision-ocr', { imageDataUrl, pageNumber: 1 });
  notify('extract');
  const analyzed = await postToAi<{ analysis: BackendAnalysis; engine: string }>('/api/ai/analyze', { documentText: ocr.text });
  notify('identify');
  await sleep(250);
  notify('detect');
  return toResult(file, ocr.text, analyzed.analysis, analyzed.engine);
}

export interface ReportSummaryInput {
  label: string;
  summary: string;
  keyPoints?: string[];
}

export interface ConsolidatedReport {
  summary: string;
  keyPoints: string[];
}

export async function consolidateReportSummaries(reports: ReportSummaryInput[]): Promise<{ consolidated: ConsolidatedReport; engine: string }> {
  return postToAi<{ consolidated: ConsolidatedReport; engine: string }>('/api/ai/consolidate', { reports });
}

export interface AIAnswer {
  question: string;
  answer: string;
}

function documentToText(doc: DocumentItem, index?: number): string {
  const parts = [
    index !== undefined ? `### Document ${index + 1}` : null,
    `Titre: ${doc.title}`,
    `Expéditeur: ${doc.sender}`,
    `Catégorie: ${doc.category}`,
    `Type: ${doc.document_type}`,
    `Statut: ${doc.status}`,
    doc.amount_due !== null ? `Montant dû: ${doc.amount_due} ${doc.currency}` : null,
    doc.due_date ? `Échéance: ${doc.due_date}` : null,
    `Reçu le: ${doc.received_date}`,
    doc.summary ? `Résumé: ${doc.summary}` : null,
    doc.content_text ? `Texte complet du document:\n${doc.content_text}` : null,
  ].filter(Boolean);
  return parts.join('\n');
}

/** Concatenates every document's metadata and full text into one corpus the backend can search through. */
function documentsToCorpus(documents: DocumentItem[]): string {
  return documents.map((doc, i) => documentToText(doc, i)).join('\n\n');
}

export async function askDocumentQuestion(question: string, doc: DocumentItem): Promise<AIAnswer> {
  try {
    const result = await postToAi<{ answer: string }>('/api/ai/chat', {
      question,
      documentText: documentToText(doc),
    });
    return {
      question,
      answer: frenchText(result.answer || 'Le backend IA n’a pas renvoyé de réponse.'),
    };
  } catch {
    return answerQuestion(question, doc);
  }
}

export async function askGlobalQuestion(question: string, documents: DocumentItem[]): Promise<AIAnswer> {
  if (documents.length === 0) return answerGlobalQuestion(question, documents);
  try {
    const result = await postToAi<{ answer: string }>('/api/ai/chat', {
      question,
      documentText: documentsToCorpus(documents),
    });
    return {
      question,
      answer: frenchText(result.answer || 'Le backend IA n’a pas renvoyé de réponse.'),
    };
  } catch {
    return answerGlobalQuestion(question, documents);
  }
}

export async function prepareFrenchReading(doc: DocumentItem, mode: 'summary' | 'full'): Promise<string> {
  const baseText = mode === 'summary'
    ? frenchDocumentSummary(doc)
    : frenchText(doc.content_text || doc.summary);

  if (!baseText.trim()) {
    return `Document ${frenchDocumentTitle(doc)}. Aucun texte lisible n'a été extrait.`;
  }

  if (mode === 'summary') {
    return `${frenchDocumentTitle(doc)}. Expéditeur : ${frenchDocumentSender(doc)}. ${baseText}`;
  }

  try {
    const result = await postToAi<{ answer: string }>('/api/ai/chat', {
      question: 'Prépare une version française claire et fidèle pour une lecture vocale. Traduis en français si le texte est dans une autre langue. Garde les noms propres, les montants, les références et les dates. Réponds uniquement avec le texte à lire.',
      documentText: documentToText(doc),
    });
    return frenchText(result.answer || baseText);
  } catch {
    return `${frenchDocumentTitle(doc)}. Expéditeur : ${frenchDocumentSender(doc)}. ${baseText}`;
  }
}

export function answerQuestion(question: string, doc: DocumentItem): AIAnswer {
  const q = question.toLowerCase();
  const content = doc.content_text.toLowerCase();
  const summary = doc.summary.toLowerCase();

  const asksAmount = (q.includes('how much') || q.includes('combien')) &&
    (q.includes('owe') || q.includes('due') || q.includes('pay') || q.includes('amount') || q.includes('dois') || q.includes('doit') || q.includes('payer') || q.includes('montant'));
  if (asksAmount) {
    if (doc.amount_due !== null) {
      return { question, answer: `D'après ce ${frenchDocumentType(doc)}, vous devez ${doc.amount_due.toFixed(2)} ${doc.currency || 'EUR'}.` };
    }
    return { question, answer: 'Ce document ne mentionne pas de montant précis à payer.' };
  }

  const asksDeadline = (q.includes('when') || q.includes('quand')) &&
    (q.includes('due') || q.includes('deadline') || q.includes('expire') || q.includes('échéance') || q.includes('echeance') || q.includes('expir'));
  if (asksDeadline) {
    if (doc.due_date) {
      const d = new Date(doc.due_date);
      return { question, answer: `L'échéance est le ${d.toLocaleDateString('fr-FR', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}.` };
    }
    return { question, answer: 'Aucune échéance précise n\'est mentionnée dans ce document.' };
  }

  const asksRequirement = (q.includes('what') || q.includes('que') || q.includes('quoi')) &&
    (q.includes('require') || q.includes('need') || q.includes(' do') || q.includes('demande') || q.includes('faut') || q.includes('faire') || q.includes('besoin'));
  if (asksRequirement) {
    if (doc.status === 'action_required') {
      return { question, answer: `Ce ${frenchDocumentType(doc)} nécessite votre attention. ${frenchDocumentSummary(doc)}` };
    }
    return { question, answer: `Il s'agit d'un document de type ${frenchDocumentType(doc)}. ${frenchDocumentSummary(doc)}` };
  }

  const asksSender = (q.includes('who') && q.includes('from')) || (q.includes('qui') && (q.includes('envoie') || q.includes('expéditeur') || q.includes('expediteur') || q.includes('vient')));
  if (asksSender) {
    return { question, answer: `Ce document provient de ${frenchDocumentSender(doc)}.` };
  }

  const asksAbout = (q.includes('what') && (q.includes('this') || q.includes('about') || q.includes('document'))) ||
    ((q.includes('quoi') || q.includes('qu\'est-ce') || q.includes('quel')) && (q.includes('ce') || q.includes('document') || q.includes('propos')));
  if (asksAbout) {
    return { question, answer: `Il s'agit d'un document de type ${frenchDocumentType(doc)} de la part de ${frenchDocumentSender(doc)}. ${frenchDocumentSummary(doc)}` };
  }

  const asksAppointment = (q.includes('next') || q.includes('prochain')) && (q.includes('appointment') || q.includes('rendez-vous') || q.includes('rendez vous'));
  if (asksAppointment) {
    if (doc.category === 'Medical') {
      return { question, answer: `Votre prochain rendez-vous est mentionné dans ce document. ${frenchDocumentSummary(doc)}` };
    }
    return { question, answer: 'Aucun rendez-vous n\'est mentionné dans ce document.' };
  }

  if (q.includes('summary') || q.includes('summarize') || q.includes('résum') || q.includes('resum')) {
    return { question, answer: frenchDocumentSummary(doc) };
  }

  // Generic: search content for keywords
  const words = q.split(/\s+/).filter((w) => w.length > 3);
  const matched = words.some((w) => content.includes(w) || summary.includes(w));
  if (matched) {
    return { question, answer: `D'après ce document : ${frenchDocumentSummary(doc)}` };
  }

  return {
    question,
    answer: `Je vois qu'il s'agit d'un document de type ${frenchDocumentType(doc)} de la part de ${frenchDocumentSender(doc)}. Les points clés sont : ${frenchDocumentSummary(doc)} Vous pouvez consulter le texte complet du document pour plus d'informations.`,
  };
}

const CATEGORY_KEYWORDS: Record<string, string> = {
  bills: 'Bills', factures: 'Bills', facture: 'Bills',
  government: 'Government', administration: 'Government', gouvernement: 'Government',
  taxes: 'Taxes', impôts: 'Taxes', impots: 'Taxes', impôt: 'Taxes',
  insurance: 'Insurance', assurance: 'Insurance',
  medical: 'Medical', médical: 'Medical',
  banking: 'Banking', banque: 'Banking',
  legal: 'Legal', juridique: 'Legal',
  business: 'Business', entreprise: 'Business',
};

export function answerGlobalQuestion(question: string, documents: DocumentItem[]): AIAnswer {
  const q = question.toLowerCase();

  const asksDueSoon = q.includes('due this week') || q.includes('due soon') ||
    q.includes('cette semaine') || q.includes('bientôt') || q.includes('bientot');
  if (asksDueSoon) {
    const now = new Date();
    const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const due = documents.filter((d) => {
      if (!d.due_date) return false;
      const dd = new Date(d.due_date);
      return dd >= now && dd <= weekLater;
    });
    if (due.length === 0) return { question, answer: 'Vous n\'avez aucune facture ni échéance cette semaine.' };
    const items = due.map((d) => `${frenchDocumentTitle(d)} - ${d.amount_due?.toFixed(2) ?? 'montant non détecté'} ${d.currency || 'EUR'} (échéance ${new Date(d.due_date!).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' })})`).join('\n');
    return { question, answer: `Vous avez ${due.length} élément${due.length === 1 ? '' : 's'} à échéance cette semaine :\n\n${items}` };
  }

  const asksNearestDeadline = q.includes('nearest deadline') || q.includes('next deadline') || q.includes('upcoming') ||
    q.includes('prochaine échéance') || q.includes('prochaine echeance') || q.includes('à venir') || q.includes('a venir');
  if (asksNearestDeadline) {
    const withDates = documents.filter((d) => d.due_date).sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime());
    if (withDates.length === 0) return { question, answer: 'Vous n\'avez aucune échéance à venir.' };
    const d = withDates[0];
    return { question, answer: `Votre prochaine échéance est "${frenchDocumentTitle(d)}" de ${frenchDocumentSender(d)}, à traiter le ${new Date(d.due_date!).toLocaleDateString('fr-FR', { month: 'long', day: 'numeric', year: 'numeric' })}.` };
  }

  const asksAction = q.includes('action') || q.includes('attention') || q.includes('important');
  if (asksAction) {
    const action = documents.filter((d) => d.status === 'action_required');
    if (action.length === 0) return { question, answer: 'Aucun document ne nécessite d\'action pour le moment.' };
    const items = action.map((d) => `- ${frenchDocumentTitle(d)} - expéditeur : ${frenchDocumentSender(d)}`).join('\n');
    return { question, answer: `${action.length} document${action.length === 1 ? ' nécessite' : 's nécessitent'} votre attention :\n\n${items}` };
  }

  const asksBills = q.includes('bills') || q.includes('owe') || q.includes('factures') || q.includes('facture') || q.includes('dois');
  if (asksBills) {
    const bills = documents.filter((d) => d.category === 'Bills' && d.amount_due !== null);
    const total = bills.reduce((sum, d) => sum + (d.amount_due || 0), 0);
    return { question, answer: `Vous avez ${bills.length} facture${bills.length === 1 ? '' : 's'} pour un total de ${total.toFixed(2)} €.` };
  }

  const asksLatest = (q.includes('read') || q.includes('lis') || q.includes('lire')) && (q.includes('latest') || q.includes('recent') || q.includes('dernier') || q.includes('récent') || q.includes('recente') || q.includes('récente'));
  if (asksLatest) {
    const sorted = [...documents].sort(compareNewestDocuments);
    if (sorted.length === 0) return { question, answer: 'Vous n\'avez encore aucun document.' };
    const d = sorted[0];
    return { question, answer: `Votre document le plus récent est "${frenchDocumentTitle(d)}" de ${frenchDocumentSender(d)}, reçu le ${new Date(d.received_date).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' })}. ${frenchDocumentSummary(d)}` };
  }

  // Try to match category (English or French keyword)
  for (const keyword of Object.keys(CATEGORY_KEYWORDS)) {
    if (q.includes(keyword)) {
      const catKey = CATEGORY_KEYWORDS[keyword];
      const matched = documents.filter((d) => d.category.toLowerCase() === catKey.toLowerCase());
      const catLabel = getCategoryMeta(catKey).label;
      if (matched.length === 0) return { question, answer: `Vous n'avez aucun document dans la catégorie ${catLabel}.` };
      const items = matched.map((d) => `- ${frenchDocumentTitle(d)}`).join('\n');
      return { question, answer: `Vous avez ${matched.length} document${matched.length === 1 ? '' : 's'} dans la catégorie ${catLabel} :\n\n${items}` };
    }
  }

  return {
    question,
    answer: `J'ai trouvé ${documents.length} documents dans vos archives. Vous pouvez me demander par exemple : "Quelles factures dois-je payer cette semaine ?", "Quelle est ma prochaine échéance ?", ou "Montre-moi les documents qui nécessitent mon attention."`,
  };
}
