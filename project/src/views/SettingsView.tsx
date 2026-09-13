import { useEffect, useState } from 'react';
import { Check, Cloud, FolderOpen, HardDrive, Save, Server, ShieldCheck } from 'lucide-react';
import { firestore, getActiveCompanyContext } from '@/lib/firebase';
import { chooseArchiveDirectory, readStoragePreferences, writeStoragePreferences, type StorageMode, type StoragePreferences } from '@/lib/storagePreferences';

const modes: { id: StorageMode; label: string; description: string; icon: typeof Cloud }[] = [
  { id: 'cloud', label: 'Cloud', description: 'Collaboration et accès partout', icon: Cloud },
  { id: 'local', label: 'Dossier local', description: 'Archivage sur le PC de l’utilisateur', icon: FolderOpen },
  { id: 'server', label: 'Serveur local', description: 'Archivage central de l’entreprise', icon: Server },
  { id: 'hybrid', label: 'Hybride', description: 'Cloud + copie locale ou serveur', icon: HardDrive },
];

export function SettingsView() {
  const company = getActiveCompanyContext();
  const [preferences, setPreferences] = useState<StoragePreferences>(() => readStoragePreferences(company?.id));
  const [saved, setSaved] = useState(false);
  const [directoryError, setDirectoryError] = useState('');
  const [settingsId, setSettingsId] = useState<string | null>(null);

  useEffect(() => {
    setPreferences(readStoragePreferences(company?.id));
    void (async () => {
      if (!company) return;
      const result = await firestore.from<{ id: string }>('company_settings').select().single();
      if (result.data) setSettingsId((result.data as { id: string }).id);
    })();
  }, [company?.id]);

  const update = (patch: Partial<StoragePreferences>) => setPreferences((current) => ({ ...current, ...patch }));

  const save = async () => {
    writeStoragePreferences(company?.id, preferences);
    if (company) {
      if (settingsId) await firestore.from('company_settings').update(preferences).eq('id', settingsId);
      else {
        const result = await firestore.from('company_settings').insert({ ...preferences, company_id: company.id }).single();
        if (result.data) setSettingsId((result.data as { id: string }).id);
      }
    }
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  };

  const chooseDirectory = async () => {
    setDirectoryError('');
    try {
      const handle = await chooseArchiveDirectory();
      update({ localDirectoryName: handle?.name || '' });
    } catch (error) {
      setDirectoryError(error instanceof Error ? error.message : 'Impossible de choisir ce dossier.');
    }
  };

  return (
    <div className="p-6 space-y-5 max-w-4xl mx-auto animate-fade-in">
      <section className="bg-white rounded-2xl border border-ink-200/60 shadow-card p-6">
        <div className="flex items-start gap-3 mb-6"><ShieldCheck className="h-6 w-6 text-primary-600 mt-0.5" /><div><h2 className="text-lg font-bold text-ink-900">Archivage des documents</h2><p className="text-sm text-ink-500 mt-1">Choisissez où les documents importés et analysés doivent être conservés.</p></div></div>
        <div className="grid sm:grid-cols-2 gap-3">
          {modes.map((mode) => { const Icon = mode.icon; const selected = preferences.mode === mode.id; return <button key={mode.id} type="button" onClick={() => update({ mode: mode.id })} className={`text-left p-4 rounded-xl border-2 transition-colors ${selected ? 'border-primary-500 bg-primary-50' : 'border-ink-100 hover:border-ink-300'}`}><div className="flex items-center justify-between"><span className="flex items-center gap-2 text-sm font-bold text-ink-800"><Icon className="h-4 w-4 text-primary-600" />{mode.label}</span>{selected && <Check className="h-4 w-4 text-primary-600" />}</div><p className="text-xs text-ink-500 mt-2">{mode.description}</p></button>; })}
        </div>
      </section>

      {(preferences.mode === 'local' || preferences.mode === 'hybrid') && (
        <section className="bg-white rounded-2xl border border-ink-200/60 shadow-card p-6"><h3 className="font-bold text-ink-900">Dossier local</h3><p className="text-sm text-ink-500 mt-1 mb-4">Le navigateur demandera une autorisation d’écriture la première fois.</p><button type="button" onClick={chooseDirectory} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700"><FolderOpen className="h-4 w-4" /> Choisir mon dossier d’archivage</button>{preferences.localDirectoryName && <p className="text-xs text-accent-700 mt-3">Dossier sélectionné : {preferences.localDirectoryName}</p>}{directoryError && <p className="text-xs text-danger-600 mt-3">{directoryError}</p>}</section>
      )}

      {(preferences.mode === 'server' || preferences.mode === 'hybrid') && <section className="bg-white rounded-2xl border border-ink-200/60 shadow-card p-6"><h3 className="font-bold text-ink-900">Serveur local</h3><p className="text-sm text-ink-500 mt-1 mb-3">URL du connecteur d’archivage de votre entreprise.</p><input value={preferences.serverUrl} onChange={(e) => update({ serverUrl: e.target.value })} placeholder="https://serveur-interne.exemple/api" className="w-full px-3 py-2.5 rounded-xl border border-ink-200 text-sm outline-none focus:border-primary-400" /></section>}

      <section className="bg-white rounded-2xl border border-ink-200/60 shadow-card p-6"><div className="flex items-center justify-between gap-4"><div><h3 className="font-bold text-ink-900">Autoriser le dossier local</h3><p className="text-sm text-ink-500 mt-1">Les utilisateurs pourront choisir un dossier local lors de l’analyse.</p></div><button type="button" role="switch" aria-checked={preferences.allowLocal} onClick={() => update({ allowLocal: !preferences.allowLocal })} className={`relative w-11 h-6 rounded-full transition-colors ${preferences.allowLocal ? 'bg-primary-600' : 'bg-ink-300'}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${preferences.allowLocal ? 'translate-x-6' : 'translate-x-1'}`} /></button></div></section>

      <div className="flex justify-end"><button onClick={save} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700"><Save className="h-4 w-4" /> {saved ? 'Enregistré' : 'Enregistrer les paramètres'}</button></div>
    </div>
  );
}
