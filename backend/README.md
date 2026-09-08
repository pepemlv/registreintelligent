# Backend Registre Intelligent

Serveur prive pour l'IA documentaire. Il recoit le jeton Firebase de l'utilisateur connecte, le verifie avec Firebase Admin, puis utilise le meilleur moteur disponible selon cette priorite:

1. Claude, si `ANTHROPIC_API_KEY` est configuree.
2. OpenAI, si `OPENAI_API_KEY` est configuree.
3. IA locale.

L'IA locale essaie d'abord Ollama si `OLLAMA_BASE_URL` repond, puis utilise un fallback basique sans API externe.

`FIREBASE_SERVICE_ACCOUNT` reste obligatoire, car toutes les routes IA protegent les documents avec l'authentification Firebase.

## Lancement Local

1. Installer les dependances: `npm install`
2. Copier `.env.example` vers `.env`
3. Renseigner `FIREBASE_SERVICE_ACCOUNT`
4. Optionnel pour une IA locale reelle: installer Ollama puis lancer `ollama pull llama3.2`
5. Demarrer: `npm start`
6. Verifier: `http://localhost:3001/health`

## Variables

- `FIREBASE_SERVICE_ACCOUNT`: obligatoire.
- `PORT`: optionnel, par defaut `3001`.
- `ALLOWED_ORIGINS`: optionnel, les localhost courants sont autorises par defaut.
- `ANTHROPIC_API_KEY`: optionnel.
- `ANTHROPIC_MODEL`: optionnel, par defaut `claude-3-5-sonnet-latest`.
- `OPENAI_API_KEY`: optionnel.
- `OPENAI_MODEL`: optionnel, par defaut `gpt-4o`.
- `OLLAMA_BASE_URL`: optionnel, par defaut `http://127.0.0.1:11434`.
- `OLLAMA_MODEL`: optionnel, par defaut `llama3.2`.
- `AI_ANALYSIS_MAX_CHARS`: optionnel, par defaut `60000`.

## Endpoints

Toutes les routes ci-dessous exigent `Authorization: Bearer <jeton Firebase>`.

- `POST /api/ai/analyze` avec `{ "documentText": "..." }`
- `POST /api/ai/analyze-pdf` avec `{ "pdfBase64": "<octets PDF en base64>" }`
- `POST /api/ai/vision-ocr` avec `{ "imageDataUrl": "data:image/...;base64,...", "pageNumber": 1 }`
- `POST /api/ai/chat` avec `{ "documentText": "...", "question": "...", "conversation": [] }`
