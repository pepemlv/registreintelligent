import 'dotenv/config';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import cors from 'cors';
import express from 'express';
import admin from 'firebase-admin';

const requiredEnvironment = ['FIREBASE_SERVICE_ACCOUNT'];
const missingEnvironment = requiredEnvironment.filter((key) => !process.env[key]);

if (missingEnvironment.length) {
  console.error(`Missing required environment variable(s): ${missingEnvironment.join(', ')}`);
  process.exit(1);
}

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) : null;
const claudeModel = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-latest';

const openaiClient = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
const openaiModel = process.env.OPENAI_MODEL || 'gpt-4o';

// Local Ollama instance (text-only, no vision) â€” a third alternative that keeps text-based
// analysis and chat working with a real LLM even when Claude and OpenAI are both unavailable
// (out of credit, no key, rate-limited, etc). PDF/image reading still needs a vision model, so
// it stays on Claude/OpenAI and falls through to the crude offline heuristic if both fail.
const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
const ollamaModel = process.env.OLLAMA_MODEL || 'llama3.2';
let ollamaAvailable = null; // cached probe result: null = not yet checked, else boolean

async function isOllamaAvailable() {
  if (ollamaAvailable !== null) return ollamaAvailable;
  try {
    const res = await fetch(`${ollamaBaseUrl}/api/tags`, { signal: AbortSignal.timeout(1500) });
    ollamaAvailable = res.ok;
  } catch {
    ollamaAvailable = false;
  }
  return ollamaAvailable;
}

async function callOllamaChat(systemPrompt, userPrompt) {
  if (!(await isOllamaAvailable())) throw new Error('Ollama is not running locally.');
  const response = await fetch(`${ollamaBaseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: ollamaModel,
      stream: false,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
    signal: AbortSignal.timeout(120000),
  });
  if (!response.ok) throw new Error(`Ollama request failed with status ${response.status}.`);
  const data = await response.json();
  const content = data?.message?.content;
  if (!content) throw new Error('Ollama returned an empty response.');
  return content;
}

async function runLocalTextAnalysis(documentText) {
  try {
    const content = await callOllamaChat(documentAnalysisInstructions, `Document text:\n\n${documentText}`);
    return normalizeAnalysis(parseJsonResponse(content));
  } catch (error) {
    console.warn('[AI] local Ollama analysis unavailable, using basic local fallback:', error?.message || error);
    return localAnalyzeText(documentText);
  }
}

async function runLocalChat(question, documentText, conversation) {
  try {
    const content = await callOllamaChat(
      chatInstructions,
      `Document text:\n${documentText}\n\nRecent conversation:\n${JSON.stringify(conversation)}\n\nUser question: ${question}`,
    );
    return content.trim() || localChatAnswer(question, documentText);
  } catch (error) {
    console.warn('[AI] local Ollama chat unavailable, using basic local fallback:', error?.message || error);
    return localChatAnswer(question, documentText);
  }
}

// Document processing tries each AI engine in order and falls through to the
// next one if the current engine throws for any reason (rate limit, outage,
// missing API key, bad response, etc). The local engine never throws, so the
// chain always resolves.
async function runAiChain(steps) {
  let lastError;
  for (const step of steps) {
    try {
      const value = await step.run();
      if (step.name !== 'claude') {
        console.warn(`[AI] "${step.name}" engine produced the result (earlier engine(s) failed).`);
      }
      return { value, engine: step.name };
    } catch (error) {
      console.error(`[AI] "${step.name}" engine failed:`, error?.message || error);
      lastError = error;
    }
  }
  throw lastError;
}

function extractText(response) {
  return response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim();
}
const requestedAnalysisMaxChars = Number(process.env.AI_ANALYSIS_MAX_CHARS || 60000);
const analysisMaxChars = Number.isFinite(requestedAnalysisMaxChars)
  ? Math.min(120000, Math.max(10000, Math.floor(requestedAnalysisMaxChars)))
  : 60000;
const app = express();
const defaultAllowedOrigins = [
  'https://signataire.com',
  'https://www.signataire.com',
  'http://localhost:5173',
  'http://localhost:8081',
  'http://127.0.0.1:8081',
];
const configuredAllowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',');
const allowedOrigins = [...defaultAllowedOrigins, ...configuredAllowedOrigins]
  .map((origin) => origin.trim())
  .filter(Boolean);

function isAllowedOrigin(origin) {
  if (!origin || allowedOrigins.includes(origin)) return true;

  try {
    const url = new URL(origin);
    return url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname);
  } catch {
    return false;
  }
}

app.use(cors({
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) return callback(null, true);
    return callback(new Error("L'origine n'est pas autorisÃ©e."));
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Authorization', 'Content-Type'],
}));
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '50mb' }));

async function requireFirebaseUser(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: "Un jeton d'authentification Firebase est requis." });

  try {
    req.user = await admin.auth().verifyIdToken(token);
    return next();
  } catch {
    return res.status(401).json({ error: 'Votre session est invalide ou a expirÃ©.' });
  }
}

function text(value, limit = 120000) {
  return typeof value === 'string' ? value.trim().slice(0, limit) : '';
}

function prepareAnalysisText(value) {
  const fullText = typeof value === 'string' ? value.trim() : '';
  if (fullText.length <= analysisMaxChars) return fullText;

  // Keep the beginning for identity/context and the end for totals, dates, and signatures.
  const omissionMarker = '\n\n[Middle section omitted to reduce AI token usage]\n\n';
  const contentBudget = analysisMaxChars - omissionMarker.length;
  const headLength = Math.floor(contentBudget * 0.75);
  const tailLength = contentBudget - headLength;
  return `${fullText.slice(0, headLength)}${omissionMarker}${fullText.slice(-tailLength)}`;
}

/** Scans forward from the first `{` at or after `fromIndex` and returns the substring up to its matching `}`, respecting nesting and quoted strings. */
function extractBalancedObject(source, fromIndex) {
  const start = source.indexOf('{', fromIndex);
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < source.length; i++) {
    const ch = source[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  return null;
}

function parseJsonResponse(responseText) {
  const trimmed = (responseText || '').trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = fenced ? fenced[1].trim() : trimmed;

  try {
    return JSON.parse(candidate);
  } catch {
    // Fall through: the model may have added stray text around the JSON object,
    // or the response was cut off mid-way (e.g. a long PDF's fullText hit the token limit).
  }

  const firstBrace = candidate.indexOf('{');
  const lastBrace = candidate.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(candidate.slice(firstBrace, lastBrace + 1));
    } catch {
      // Fall through further.
    }
  }

  // The "analysis" object is written before "fullText" (see pdfReadAndAnalyzeInstructions),
  // so even if the tail of a truncated response is garbage, the analysis itself may still
  // be a complete, valid, balanced object worth salvaging before giving up entirely.
  const analysisKeyIndex = candidate.indexOf('"analysis"');
  if (analysisKeyIndex !== -1) {
    const analysisJson = extractBalancedObject(candidate, analysisKeyIndex);
    if (analysisJson) {
      try {
        return { analysis: JSON.parse(analysisJson) };
      } catch {
        // Fall through to the plain-text fallback below.
      }
    }
  }

  return { summary: trimmed };
}

const documentCategories = new Set([
  'Invoice', 'Medical Report', 'Bank Statement', 'Passport', 'Driver License',
  'Tax', 'Insurance', 'Employment Contract', 'Birth Certificate', 'Receipt',
  'Utility Bill', 'Academic', 'Legal', 'Other',
]);

function looksLikeRawJson(value) {
  const trimmed = value.trim();
  return (trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'));
}

function normalizeAnalysis(value) {
  const analysis = value && typeof value === 'object' ? value : {};
  const category = documentCategories.has(analysis.category) ? analysis.category : 'Other';
  const confidence = Number(analysis.confidence);
  const rawSummary = text(analysis.summary, 2000);
  return {
    category,
    summary: rawSummary && !looksLikeRawJson(rawSummary) ? rawSummary : 'Aucun rÃ©sumÃ© n\'a Ã©tÃ© gÃ©nÃ©rÃ©.',
    documentType: text(analysis.documentType, 120) || localCategoryLabelsFr[category] || category,
    confidence: Number.isFinite(confidence) ? Math.min(1, Math.max(0, confidence)) : 0.5,
    issuer: text(analysis.issuer, 200) || null,
    issueDate: text(analysis.issueDate, 20) || null,
    expirationDate: text(analysis.expirationDate, 20) || null,
    amount: Number.isFinite(Number(analysis.amount)) ? Number(analysis.amount) : null,
    currency: text(analysis.currency, 8) || 'USD',
    fields: analysis.fields && typeof analysis.fields === 'object' ? analysis.fields : {},
    tags: Array.isArray(analysis.tags) ? analysis.tags.map((item) => text(item, 60)).filter(Boolean).slice(0, 8) : [],
    keywords: Array.isArray(analysis.keywords) ? analysis.keywords.map((item) => text(item, 60)).filter(Boolean).slice(0, 12) : [],
    language: text(analysis.language, 8) || 'fr',
  };
}

const documentAnalysisInstructions = `You are PapyDoc, the primary document-analysis engine.
Analyze only the provided document text. Never invent missing values.
Write the summary, document type, field names, tags, keywords, and all user-facing analysis text in French only. Do not translate or rewrite the original document text itself; only the analysis output must be French.
Preserve proper names and official organization names in their original form.
Set expirationDate only when the document explicitly identifies a valid expiration, due, or deadline date. Never interpret a file number, dossier number, certificate number, reference, or issue date as an expiration date.
Return valid JSON only, without markdown, using exactly this shape:
{
  "category": "Invoice|Medical Report|Bank Statement|Passport|Driver License|Tax|Insurance|Employment Contract|Birth Certificate|Receipt|Utility Bill|Academic|Legal|Other",
  "summary": "string",
  "documentType": "string",
  "confidence": 0.0,
  "issuer": "string|null",
  "issueDate": "YYYY-MM-DD|null",
  "expirationDate": "YYYY-MM-DD|null",
  "amount": "number|null",
  "currency": "ISO 4217 currency code",
  "fields": { "key": "value" },
  "tags": ["string"],
  "keywords": ["string"],
  "language": "ISO 639-1 language code"
}
Keep the summary concise and in French. Confidence must be between 0 and 1. Use null when a value is absent.`;

const pdfReadAndAnalyzeInstructions = `You are PapyDoc. Read the attached PDF exactly as a human would visually read it, page by page, including any scanned, photographed, or image-only pages that have no embedded text layer. Do not skip pages.
Ignore QR codes, barcodes, and similar scannable codes: do not decode, transcribe, or describe their content anywhere in the output.
Never invent missing values. Preserve proper names and official organization names in their original form.
Write the summary, document type, field names, tags, keywords, and all user-facing analysis text in French only. Do not translate or rewrite the original document text itself.
Set expirationDate only when the document explicitly identifies a valid expiration, due, or deadline date. Never interpret a file number, dossier number, certificate number, reference, or issue date as an expiration date.
Return valid JSON only, without markdown, using exactly this shape, with "analysis" BEFORE "fullText" in your output:
{
  "analysis": {
    "category": "Invoice|Medical Report|Bank Statement|Passport|Driver License|Tax|Insurance|Employment Contract|Birth Certificate|Receipt|Utility Bill|Academic|Legal|Other",
    "summary": "string",
    "documentType": "string",
    "confidence": 0.0,
    "issuer": "string|null",
    "issueDate": "YYYY-MM-DD|null",
    "expirationDate": "YYYY-MM-DD|null",
    "amount": "number|null",
    "currency": "ISO 4217 currency code",
    "fields": { "key": "value" },
    "tags": ["string"],
    "keywords": ["string"],
    "language": "ISO 639-1 language code"
  },
  "fullText": "the complete text you read from every page, in the document's original language and wording, with each page separated by a line reading \\"Page N\\""
}
Keep the summary concise and in French. Confidence must be between 0 and 1. Use null when a value is absent.
Write "analysis" first and complete it fully before starting "fullText". This matters because long, multi-page documents (10+ pages, especially scanned ones) can exceed your output budget: if that happens, "analysis" must already be a complete, valid, useful JSON object â€” losing the tail end of "fullText" is acceptable, losing "analysis" is not. For very long documents, prioritize finishing valid JSON over transcribing every remaining page verbatim: if you are running low on space, wrap up "fullText" cleanly (even if it means summarizing or truncating the last pages with a note like "[... pages truncated ...]") rather than letting the response cut off mid-string.`;

const visionOcrInstructions = 'You are PapyDoc OCR. Extract visible text from the supplied document page image. Return only the text you can read. Preserve names, numbers, dates, punctuation, line breaks, and original wording. Ignore QR codes, barcodes, and similar scannable codes: do not decode, transcribe, or describe their content. Do not summarize. Do not translate. If the page is not readable, return NO_READABLE_TEXT.';

const chatInstructions = 'You are PapyDoc. Answer in French using only the supplied text. It may contain a single document, or several documents concatenated and each introduced by a "### Document N" heading with metadata (title, sender, category, amount, due date) followed by its full text â€” when there are several, search across all of them to answer questions that require comparing, counting, filtering, or aggregating across documents (e.g. "which document is due soonest", "how many invoices are from supplier X", "which documents relate to taxes"), and cite which document(s) support your answer by title when helpful. Do not translate or rewrite the original document text unless the user explicitly asks for a translation. If the answer is not in the supplied text, say so clearly rather than guessing.';

// ---- Local (offline, no external API) fallback engine ----
// This never throws and never calls out to a third party. It is the final
// safety net so document processing always completes even if both Claude
// and OpenAI are unreachable or misconfigured.

const localCategoryKeywords = {
  'Invoice': ['invoice', 'bill to', 'amount due', 'invoice number'],
  'Medical Report': ['diagnosis', 'patient', 'physician', 'clinic', 'prescription', 'medical'],
  'Bank Statement': ['account balance', 'statement period', 'transaction', 'bank statement', 'routing number'],
  'Passport': ['passport', 'nationality', 'date of birth', 'passport number'],
  'Driver License': ['driver license', "driver's license", 'license number', 'class d'],
  'Tax': ['irs', 'tax return', 'w-2', '1099', 'taxable income'],
  'Insurance': ['policy number', 'insurance', 'premium', 'coverage', 'deductible'],
  'Employment Contract': ['employment agreement', 'employer', 'employee', 'job title', 'salary'],
  'Birth Certificate': ['birth certificate', 'place of birth'],
  'Receipt': ['receipt', 'total paid', 'thank you for your purchase'],
  'Utility Bill': ['utility', 'electricity', 'water bill', 'gas bill', 'kwh'],
  'Academic': ['transcript', 'university', 'diploma', 'gpa', 'academic'],
  'Legal': ['court', 'plaintiff', 'defendant', 'legal notice'],
};

const localCategoryLabelsFr = {
  'Invoice': 'Facture',
  'Medical Report': 'Rapport mÃ©dical',
  'Bank Statement': 'RelevÃ© bancaire',
  'Passport': 'Passeport',
  'Driver License': 'Permis de conduire',
  'Tax': 'Document fiscal',
  'Insurance': 'Document d\'assurance',
  'Employment Contract': 'Contrat de travail',
  'Birth Certificate': 'Acte de naissance',
  'Receipt': 'ReÃ§u',
  'Utility Bill': 'Facture de services publics',
  'Academic': 'Document acadÃ©mique',
  'Legal': 'Document juridique',
  'Other': 'Autre document',
};

function localCategorize(lowerText) {
  let best = 'Other';
  let bestScore = 0;
  for (const [category, words] of Object.entries(localCategoryKeywords)) {
    const score = words.reduce((sum, word) => sum + (lowerText.includes(word) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      best = category;
    }
  }
  return best;
}

function localExtractAmount(rawText) {
  const match = rawText.match(/\$\s?([\d,]+\.\d{2})/);
  if (!match) return null;
  const value = Number(match[1].replace(/,/g, ''));
  return Number.isFinite(value) ? value : null;
}

function localNormalizeDateGuess(raw) {
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

function localExtractDateNear(rawText, keywords) {
  const datePattern = /\b(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4}|[A-Z][a-z]+ \d{1,2},? \d{4})\b/;
  for (const line of rawText.split('\n')) {
    const lower = line.toLowerCase();
    if (keywords.some((keyword) => lower.includes(keyword))) {
      const match = line.match(datePattern);
      if (match) return localNormalizeDateGuess(match[1]);
    }
  }
  return null;
}

function localAnalyzeText(rawText) {
  const lowerText = rawText.toLowerCase();
  const category = localCategorize(lowerText);
  const firstLine = rawText.split('\n').map((line) => line.trim()).find(Boolean) || '';
  const categoryLabelFr = localCategoryLabelsFr[category] || category;
  return {
    category,
    summary: `Analyse hors ligne (les services d'IA Ã©taient indisponibles) : dÃ©tectÃ© comme ${categoryLabelFr}.${firstLine ? ` PremiÃ¨re ligne lue : "${firstLine.slice(0, 140)}"` : ''} Veuillez consulter le document original pour tous les dÃ©tails.`,
    documentType: categoryLabelFr,
    confidence: 0.25,
    issuer: null,
    issueDate: localExtractDateNear(rawText, ['issued', 'date:', 'dated']),
    expirationDate: localExtractDateNear(rawText, ['due', 'expire', 'expiration', 'deadline']),
    amount: localExtractAmount(rawText),
    currency: 'USD',
    fields: {},
    tags: [],
    keywords: [],
    language: 'fr',
  };
}

function localAnalyzePdfOrImageFallback() {
  return {
    fullText: '',
    analysis: {
      category: 'Other',
      summary: "La lecture automatique est temporairement indisponible (tous les moteurs d'IA ont Ã©chouÃ©). Veuillez ouvrir le document original et saisir les dÃ©tails manuellement.",
      documentType: 'Document',
      confidence: 0,
      issuer: null,
      issueDate: null,
      expirationDate: null,
      amount: null,
      currency: 'USD',
      fields: {},
      tags: [],
      keywords: [],
      language: 'fr',
    },
  };
}

function localChatAnswer(question, documentText) {
  const q = question.toLowerCase();
  if (q.includes('how much') || q.includes('amount') || q.includes('owe')) {
    const amount = localExtractAmount(documentText);
    return amount !== null
      ? `D'aprÃ¨s une analyse hors ligne basique, le montant mentionnÃ© est de ${amount.toFixed(2)} $.`
      : "Je n'ai trouvÃ© aucun montant prÃ©cis dans ce document.";
  }
  if (q.includes('when') || q.includes('due') || q.includes('deadline') || q.includes('expire')) {
    const date = localExtractDateNear(documentText, ['due', 'expire', 'expiration', 'deadline']);
    return date
      ? `D'aprÃ¨s une analyse hors ligne basique, la date concernÃ©e est le ${date}.`
      : "Je n'ai trouvÃ© aucune date prÃ©cise dans ce document.";
  }
  return "Les services d'IA sont temporairement indisponibles, je ne peux donc effectuer qu'une analyse hors ligne basique de ce document. Veuillez rÃ©essayer plus tard pour obtenir une rÃ©ponse complÃ¨te.";
}

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.post('/api/ai/analyze', requireFirebaseUser, async (req, res, next) => {
  try {
    const documentText = prepareAnalysisText(req.body?.documentText);
    if (!documentText) return res.status(400).json({ error: 'Le texte du document (documentText) est requis.' });

    const { value: analysis, engine } = await runAiChain([
      {
        name: 'claude',
        run: async () => {
          if (!anthropic) throw new Error('Anthropic is not configured.');
          const response = await anthropic.messages.create({
            model: claudeModel,
            max_tokens: 1000,
            system: documentAnalysisInstructions,
            messages: [{ role: 'user', content: `Document text:\n\n${documentText}` }],
          });
          return normalizeAnalysis(parseJsonResponse(extractText(response)));
        },
      },
      {
        name: 'openai',
        run: async () => {
          if (!openaiClient) throw new Error('OpenAI is not configured.');
          const response = await openaiClient.chat.completions.create({
            model: openaiModel,
            max_tokens: 1000,
            messages: [
              { role: 'system', content: documentAnalysisInstructions },
              { role: 'user', content: `Document text:\n\n${documentText}` },
            ],
          });
          return normalizeAnalysis(parseJsonResponse(response.choices?.[0]?.message?.content));
        },
      },
      {
        name: 'local',
        run: async () => runLocalTextAnalysis(documentText),
      },
    ]);

    return res.json({ analysis, engine });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/ai/analyze-pdf', requireFirebaseUser, async (req, res, next) => {
  try {
    const pdfBase64 = text(req.body?.pdfBase64, 45_000_000);
    if (!pdfBase64) return res.status(400).json({ error: 'Le PDF (pdfBase64) est requis.' });

    const { value: result, engine } = await runAiChain([
      {
        name: 'claude',
        run: async () => {
          if (!anthropic) throw new Error('Anthropic is not configured.');
          const response = await anthropic.messages.create({
            model: claudeModel,
            max_tokens: 20000,
            system: pdfReadAndAnalyzeInstructions,
            messages: [{
              role: 'user',
              content: [
                { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 } },
                { type: 'text', text: 'Read this PDF page by page and respond with the JSON described in your instructions.' },
              ],
            }],
          });
          const parsed = parseJsonResponse(extractText(response));
          return { fullText: text(parsed.fullText, 200000), analysis: normalizeAnalysis(parsed.analysis || parsed) };
        },
      },
      {
        name: 'openai',
        run: async () => {
          if (!openaiClient) throw new Error('OpenAI is not configured.');
          const response = await openaiClient.responses.create({
            model: openaiModel,
            max_output_tokens: 20000,
            input: [{
              role: 'user',
              content: [
                { type: 'input_text', text: `${pdfReadAndAnalyzeInstructions}\n\nRead this PDF page by page and respond with the JSON described above.` },
                { type: 'input_file', filename: 'document.pdf', file_data: `data:application/pdf;base64,${pdfBase64}` },
              ],
            }],
          });
          const parsed = parseJsonResponse(response.output_text);
          return { fullText: text(parsed.fullText, 200000), analysis: normalizeAnalysis(parsed.analysis || parsed) };
        },
      },
      {
        name: 'local',
        run: async () => localAnalyzePdfOrImageFallback(),
      },
    ]);

    return res.json({ ...result, engine });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/ai/vision-ocr', requireFirebaseUser, async (req, res, next) => {
  try {
    const imageDataUrl = text(req.body?.imageDataUrl, 45_000_000);
    const pageNumber = Number(req.body?.pageNumber || 1);
    const imageMatch = imageDataUrl.match(/^data:(image\/(?:png|jpe?g|webp));base64,(.+)$/i);
    if (!imageMatch) {
      return res.status(400).json({ error: "Une image de page est requise." });
    }
    const [, mediaType, base64Data] = imageMatch;
    const safePageNumber = Number.isFinite(pageNumber) ? pageNumber : 1;

    const { value: extractedText } = await runAiChain([
      {
        name: 'claude',
        run: async () => {
          if (!anthropic) throw new Error('Anthropic is not configured.');
          const response = await anthropic.messages.create({
            model: claudeModel,
            max_tokens: 2500,
            system: visionOcrInstructions,
            messages: [{
              role: 'user',
              content: [
                { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64Data } },
                { type: 'text', text: `Extract readable text from page ${safePageNumber}.` },
              ],
            }],
          });
          return text(extractText(response), 20000);
        },
      },
      {
        name: 'openai',
        run: async () => {
          if (!openaiClient) throw new Error('OpenAI is not configured.');
          const response = await openaiClient.chat.completions.create({
            model: openaiModel,
            max_tokens: 2500,
            messages: [
              { role: 'system', content: visionOcrInstructions },
              {
                role: 'user',
                content: [
                  { type: 'image_url', image_url: { url: imageDataUrl } },
                  { type: 'text', text: `Extract readable text from page ${safePageNumber}.` },
                ],
              },
            ],
          });
          return text(response.choices?.[0]?.message?.content, 20000);
        },
      },
      {
        name: 'local',
        run: async () => '',
      },
    ]);

    return res.json({ text: extractedText === 'NO_READABLE_TEXT' ? '' : extractedText });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/ai/chat', requireFirebaseUser, async (req, res, next) => {
  try {
    const question = text(req.body?.question, 4000);
    const documentText = text(req.body?.documentText);
    const conversation = Array.isArray(req.body?.conversation) ? req.body.conversation.slice(-8) : [];
    if (!question || !documentText) {
      return res.status(400).json({ error: 'La question et le texte du document (documentText) sont requis.' });
    }

    const { value: answer } = await runAiChain([
      {
        name: 'claude',
        run: async () => {
          if (!anthropic) throw new Error('Anthropic is not configured.');
          const response = await anthropic.messages.create({
            model: claudeModel,
            max_tokens: 600,
            system: chatInstructions,
            messages: [{
              role: 'user',
              content: `Document text:\n${documentText}\n\nRecent conversation:\n${JSON.stringify(conversation)}\n\nUser question: ${question}`,
            }],
          });
          return extractText(response) || "Je n'ai pas pu gÃ©nÃ©rer de rÃ©ponse.";
        },
      },
      {
        name: 'openai',
        run: async () => {
          if (!openaiClient) throw new Error('OpenAI is not configured.');
          const response = await openaiClient.chat.completions.create({
            model: openaiModel,
            max_tokens: 600,
            messages: [
              { role: 'system', content: chatInstructions },
              {
                role: 'user',
                content: `Document text:\n${documentText}\n\nRecent conversation:\n${JSON.stringify(conversation)}\n\nUser question: ${question}`,
              },
            ],
          });
          return response.choices?.[0]?.message?.content?.trim() || "Je n'ai pas pu gÃ©nÃ©rer de rÃ©ponse.";
        },
      },
      {
        name: 'local',
        run: async () => runLocalChat(question, documentText, conversation),
      },
    ]);

    return res.json({ answer, engine });
  } catch (error) {
    return next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  const status = error?.status || 500;
  const message = status >= 500 ? "Le service d'IA est temporairement indisponible." : error.message;
  res.status(status).json({ error: message });
});

const port = Number(process.env.PORT || 3001);
app.listen(port, () => console.log(`PapyDoc AI backend listening on port ${port}`));


