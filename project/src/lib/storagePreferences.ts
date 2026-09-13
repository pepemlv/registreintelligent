export type StorageMode = 'cloud' | 'local' | 'server' | 'hybrid';

export interface StoragePreferences {
  mode: StorageMode;
  serverUrl: string;
  allowLocal: boolean;
  localDirectoryName: string;
}

const DEFAULT_PREFERENCES: StoragePreferences = {
  mode: 'cloud',
  serverUrl: '',
  allowLocal: false,
  localDirectoryName: '',
};

const DB_NAME = 'registre-intelligent-storage';
const STORE_NAME = 'handles';
const HANDLE_KEY = 'archive-directory';

export function readStoragePreferences(companyId?: string): StoragePreferences {
  const key = `registre-storage-preferences:${companyId || 'default'}`;
  try {
    return { ...DEFAULT_PREFERENCES, ...JSON.parse(localStorage.getItem(key) || '{}') };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function writeStoragePreferences(companyId: string | undefined, preferences: StoragePreferences) {
  localStorage.setItem(`registre-storage-preferences:${companyId || 'default'}`, JSON.stringify(preferences));
}

function openHandleDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveArchiveDirectoryHandle(handle: FileSystemDirectoryHandle) {
  const db = await openHandleDb();
  await new Promise<void>((resolve, reject) => {
    const request = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put(handle, HANDLE_KEY);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
  db.close();
}

export async function getArchiveDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openHandleDb();
    const handle = await new Promise<FileSystemDirectoryHandle | null>((resolve, reject) => {
      const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(HANDLE_KEY);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return handle;
  } catch {
    return null;
  }
}

export async function chooseArchiveDirectory(): Promise<FileSystemDirectoryHandle | null> {
  if (!('showDirectoryPicker' in window)) throw new Error('Votre navigateur ne permet pas la sélection d’un dossier local. Utilisez Chrome ou Edge sur ordinateur.');
  const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
  await saveArchiveDirectoryHandle(handle);
  return handle;
}

export async function saveFileToArchiveDirectory(file: File, fileName: string) {
  const directory = await getArchiveDirectoryHandle();
  if (!directory) throw new Error('Choisissez d’abord votre dossier d’archivage local dans Paramètres.');
  const permission = await directory.queryPermission({ mode: 'readwrite' });
  if (permission !== 'granted' && (await directory.requestPermission({ mode: 'readwrite' })) !== 'granted') {
    throw new Error('L’autorisation d’écriture dans le dossier local a été refusée.');
  }
  const target = await directory.getFileHandle(fileName, { create: true });
  const writable = await target.createWritable();
  await writable.write(file);
  await writable.close();
}

export async function saveFileToServer(file: File, serverUrl: string, fileName: string): Promise<string> {
  if (!serverUrl.trim()) throw new Error('Configurez l’URL du serveur local dans Paramètres.');
  const body = new FormData();
  body.append('file', file, fileName);
  const response = await fetch(serverUrl, { method: 'POST', body });
  if (!response.ok) throw new Error(`Le serveur local a refusé le fichier (${response.status}).`);
  try {
    const result = await response.json() as { url?: string };
    return result.url || '';
  } catch {
    return '';
  }
}
