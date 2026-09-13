import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';
import { Building2, Check, ChevronRight, Clock3, FileText, Globe2, MapPin, Paperclip, Phone, Search, Send, ShieldCheck, X } from 'lucide-react';
import { auth, firestore, getActiveCompanyContext, storage } from '@/lib/firebase';

type Institution = {
  id: string;
  name: string;
  organization_type?: string;
  country?: string;
  city?: string;
  address?: string;
  phone?: string;
  primary_admin_name?: string;
  primary_admin_email?: string;
  primary_admin_title?: string;
  description?: string;
  logo_url?: string;
  gallery_urls?: string[];
  account_type?: string;
  account_status?: string;
};

type CollaborationRequest = {
  id: string;
  requester_company_id: string;
  requester_company_name: string;
  requester_country: string;
  requester_uid: string;
  requester_name: string;
  requester_function: string;
  requester_phone: string;
  target_company_id: string;
  target_company_name: string;
  subject: string;
  project: string;
  purpose: string;
  message: string;
  attachments: { name: string; url: string }[];
  consent_confirmed?: boolean;
  status: 'pending' | 'review' | 'accepted' | 'rejected';
  created_at: string;
};

type Tab = 'directory' | 'sent' | 'received';

function isInstitution(company: Institution) {
  const type = company.organization_type?.trim().toLocaleLowerCase('fr');
  return company.account_type === 'institution' || ['ministère', 'gouvernorat', 'entité territoriale', 'administration publique', 'entreprise publique', 'établissement public', 'service de contrôle', 'autre institution'].includes(type ?? '');
}

const inputClass = 'mt-1 w-full rounded-lg border border-ink-200 bg-white px-3 py-2.5 text-sm text-ink-800 outline-none focus:border-primary-400';
const statusText: Record<CollaborationRequest['status'], string> = { pending: 'En attente', review: 'En revue', accepted: 'Acceptée', rejected: 'Rejetée' };

export function InstitutionsView() {
  const companyContext = getActiveCompanyContext();
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [requests, setRequests] = useState<CollaborationRequest[]>([]);
  const [myInstitution, setMyInstitution] = useState<Institution | null>(null);
  const [tab, setTab] = useState<Tab>('directory');
  const [selectedInstitution, setSelectedInstitution] = useState<Institution | null>(null);
  const [requestTarget, setRequestTarget] = useState<Institution | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<CollaborationRequest | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ subject: '', project: '', purpose: '', requesterName: auth.currentUser?.displayName || '', requesterFunction: '', phone: '', message: '' });
  const [files, setFiles] = useState<File[]>([]);
  const [consent, setConsent] = useState(false);

  const load = async () => {
    if (!companyContext?.id) { setLoading(false); return; }
    setLoading(true);
    const [companiesResult, requestsResult] = await Promise.all([
      firestore.from<Institution>('companies').select(),
      firestore.from<CollaborationRequest>('institution_collaborations').select(),
    ]);
    const rows = (companiesResult.data as Institution[] | null) ?? [];
    setInstitutions(rows.filter((item) => item.id !== companyContext.id && isInstitution(item) && item.account_status !== 'review' && item.account_status !== 'suspended'));
    setMyInstitution(rows.find((item) => item.id === companyContext.id) ?? null);
    setRequests(((requestsResult.data as CollaborationRequest[] | null) ?? []).sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '')));
    setLoading(false);
  };

  useEffect(() => { void load(); }, [companyContext?.id]);

  const countryInstitutions = useMemo(() => {
    const country = myInstitution?.country?.trim().toLocaleLowerCase();
    return institutions.filter((item) => (!country || item.country?.trim().toLocaleLowerCase() === country)
      && `${item.name} ${item.organization_type ?? ''} ${item.city ?? ''}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  }, [institutions, myInstitution, search]);
  const sentRequests = requests.filter((request) => request.requester_company_id === companyContext?.id);
  const receivedRequests = requests.filter((request) => request.target_company_id === companyContext?.id);

  const submitRequest = async (event: FormEvent) => {
    event.preventDefault();
    if (!requestTarget || !myInstitution || !companyContext || !auth.currentUser || !consent) return;
    setSaving(true);
    setError('');
    try {
      const attachments = await Promise.all(files.map(async (file) => {
        const path = `institution-collaborations/${companyContext.id}/${Date.now()}-${file.name}`;
        const fileRef = storageRef(storage, path);
        await uploadBytes(fileRef, file);
        return { name: file.name, url: await getDownloadURL(fileRef) };
      }));
      const result = await firestore.from<CollaborationRequest>('institution_collaborations').insert({
        requester_company_id: companyContext.id,
        requester_company_name: myInstitution.name,
        requester_country: myInstitution.country ?? '',
        requester_uid: auth.currentUser.uid,
        requester_name: form.requesterName.trim(),
        requester_function: form.requesterFunction.trim(),
        requester_phone: form.phone.trim(),
        target_company_id: requestTarget.id,
        target_company_name: requestTarget.name,
        subject: form.subject.trim(),
        project: form.project.trim(),
        purpose: form.purpose.trim(),
        message: form.message.trim(),
        attachments,
        consent_confirmed: true,
        status: 'pending',
      });
      if (result.error) throw new Error(result.error.message);
      setRequestTarget(null);
      setFiles([]);
      setConsent(false);
      setForm({ subject: '', project: '', purpose: '', requesterName: auth.currentUser.displayName || '', requesterFunction: '', phone: myInstitution.phone ?? '', message: '' });
      setTab('sent');
      await load();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'La demande n’a pas pu être envoyée.');
    } finally {
      setSaving(false);
    }
  };

  const setRequestStatus = async (request: CollaborationRequest, status: CollaborationRequest['status']) => {
    const result = await firestore.from('institution_collaborations').update({ status, reviewed_by: auth.currentUser?.uid, reviewed_at: new Date().toISOString() }).eq('id', request.id);
    if (result.error) { setError(result.error.message); return; }
    setSelectedRequest({ ...request, status });
    await load();
  };

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'directory', label: 'Institutions' },
    { id: 'sent', label: 'Demandes envoyées', count: sentRequests.length },
    { id: 'received', label: 'Demandes reçues', count: receivedRequests.length },
  ];

  return (
    <div className="min-h-full bg-ink-50/60 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4 rounded-lg border border-yellow-400 bg-yellow-300 p-4">
          <div><p className="text-xs font-bold uppercase tracking-wider text-ink-700">Réseau institutionnel</p><h1 className="mt-1 text-2xl font-bold text-ink-900">Institutions</h1><p className="mt-1 text-sm text-ink-700">Découvrez les institutions vérifiées et gérez vos demandes de collaboration.</p></div>
          <div className="flex items-center gap-2 text-xs text-ink-700"><Globe2 className="h-4 w-4 text-ink-800" />{myInstitution?.country || 'Pays non renseigné'}</div>
        </header>

        <div className="mb-5 flex flex-wrap gap-2 border-b border-ink-200">{tabs.map((item) => <button key={item.id} onClick={() => setTab(item.id)} className={`flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-semibold ${tab === item.id ? 'border-primary-600 text-primary-700' : 'border-transparent text-ink-500 hover:text-ink-800'}`}>{item.label}{item.count !== undefined && <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[10px]">{item.count}</span>}</button>)}</div>

        {tab === 'directory' && <>
          <label className="mb-5 flex max-w-md items-center gap-2 rounded-lg border border-ink-200 bg-white px-3 py-2.5 text-sm text-ink-500"><Search className="h-4 w-4" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher une institution" className="w-full bg-transparent outline-none" /></label>
          {loading ? <p className="py-14 text-center text-sm text-ink-500">Chargement des institutions…</p> : countryInstitutions.length === 0 ? <div className="rounded-xl border border-ink-200 bg-white px-6 py-14 text-center"><Building2 className="mx-auto h-9 w-9 text-ink-300" /><p className="mt-3 text-sm font-semibold text-ink-700">Aucune institution active trouvée dans votre pays.</p><p className="mt-1 text-xs text-ink-500">Seules les institutions vérifiées sont affichées.</p></div> : <div className="space-y-4">{countryInstitutions.map((institution) => <article key={institution.id} className="overflow-hidden rounded-xl border border-ink-200 bg-white"><div className="grid md:grid-cols-[220px_1fr_auto]"><div className="flex min-h-40 items-center justify-center bg-ink-100">{institution.logo_url ? <img src={institution.logo_url} alt={institution.name} className="h-full max-h-56 w-full object-cover" /> : <Building2 className="h-12 w-12 text-ink-300" />}</div><div className="min-w-0 p-5"><div className="flex items-center gap-2"><h2 className="text-lg font-bold text-ink-900">{institution.name}</h2><ShieldCheck className="h-4 w-4 shrink-0 text-accent-600" aria-label="Institution vérifiée" /></div><p className="mt-1 text-xs font-semibold text-primary-700">{institution.organization_type || 'Institution publique'}</p>{institution.description && <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-ink-600">{institution.description}</p>}<p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-500"><span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{[institution.city, institution.country].filter(Boolean).join(', ')}</span>{institution.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{institution.phone}</span>}</p></div><div className="flex items-center gap-2 border-t border-ink-100 p-4 md:flex-col md:justify-center md:border-l md:border-t-0"><button onClick={() => setSelectedInstitution(institution)} className="inline-flex items-center gap-1 rounded-lg border border-ink-200 px-3 py-2 text-xs font-semibold text-ink-700 hover:bg-ink-50">Détails <ChevronRight className="h-3.5 w-3.5" /></button><button onClick={() => { setRequestTarget(institution); setError(''); setForm((current) => ({ ...current, phone: myInstitution?.phone ?? current.phone })); }} className="inline-flex items-center gap-1 rounded-lg bg-primary-600 px-3 py-2 text-xs font-semibold text-white hover:bg-primary-700"><Send className="h-3.5 w-3.5" /> Demander une collaboration</button></div></div></article>)}</div>}
        </>}

        {tab !== 'directory' && <div className="space-y-3">{(tab === 'sent' ? sentRequests : receivedRequests).length === 0 ? <div className="rounded-xl border border-ink-200 bg-white px-6 py-14 text-center"><FileText className="mx-auto h-9 w-9 text-ink-300" /><p className="mt-3 text-sm font-semibold text-ink-700">Aucune demande {tab === 'sent' ? 'envoyée' : 'reçue'}.</p></div> : (tab === 'sent' ? sentRequests : receivedRequests).map((request) => <button key={request.id} onClick={() => setSelectedRequest(request)} className="flex w-full flex-wrap items-center gap-3 rounded-xl border border-ink-200 bg-white p-4 text-left hover:border-primary-300"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary-700"><Building2 className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-ink-900">{request.subject}</span><span className="mt-0.5 block text-xs text-ink-500">{tab === 'sent' ? `À ${request.target_company_name}` : `De ${request.requester_company_name}`} · {request.project || request.purpose}</span></span><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${request.status === 'accepted' ? 'bg-accent-100 text-accent-700' : request.status === 'rejected' ? 'bg-danger-100 text-danger-700' : request.status === 'review' ? 'bg-warning-100 text-warning-700' : 'bg-primary-50 text-primary-700'}`}>{statusText[request.status]}</span></button>)}</div>}
      </div>

      {selectedInstitution && <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 p-4" onClick={() => setSelectedInstitution(null)}><section className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="flex items-center justify-between border-b border-ink-100 p-5"><div><p className="text-[10px] font-bold uppercase text-accent-700">Institution vérifiée</p><h2 className="mt-1 text-xl font-bold text-ink-900">{selectedInstitution.name}</h2></div><button onClick={() => setSelectedInstitution(null)} className="rounded-lg p-2 text-ink-500 hover:bg-ink-100"><X className="h-5 w-5" /></button></div><div className="space-y-4 p-5">{selectedInstitution.logo_url && <img src={selectedInstitution.logo_url} alt={selectedInstitution.name} className="max-h-72 w-full rounded-lg bg-ink-50 object-cover" />}<p className="text-sm text-ink-600">{selectedInstitution.description || 'Aucune présentation communiquée.'}</p><div className="grid gap-3 text-xs sm:grid-cols-2">{[['Type', selectedInstitution.organization_type], ['Pays', selectedInstitution.country], ['Ville', selectedInstitution.city], ['Adresse', selectedInstitution.address], ['Téléphone', selectedInstitution.phone], ['Représentant', selectedInstitution.primary_admin_name], ['Fonction', selectedInstitution.primary_admin_title], ['E-mail', selectedInstitution.primary_admin_email]].map(([label, value]) => <div key={label} className="rounded-lg bg-ink-50 p-3"><p className="font-semibold text-ink-400">{label}</p><p className="mt-1 break-words text-ink-800">{value || '—'}</p></div>)}</div>{selectedInstitution.gallery_urls && <div className="flex flex-wrap gap-2">{selectedInstitution.gallery_urls.map((url) => <img key={url} src={url} alt="Illustration institution" className="h-20 w-24 rounded-lg object-cover" />)}</div>}<button onClick={() => { setRequestTarget(selectedInstitution); setSelectedInstitution(null); setError(''); }} className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white"><Send className="h-4 w-4" /> Demander une collaboration</button></div></section></div>}

      {requestTarget && <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 p-4"><form onSubmit={submitRequest} className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-5 shadow-2xl md:p-6"><div className="mb-5 flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase text-primary-600">Demande adressée à</p><h2 className="mt-1 text-lg font-bold text-ink-900">{requestTarget.name}</h2></div><button type="button" onClick={() => setRequestTarget(null)} aria-label="Fermer" className="rounded-lg p-2 text-ink-500 hover:bg-ink-100"><X className="h-5 w-5" /></button></div><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold text-ink-600">Objet de la demande *<input required className={inputClass} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Ex. Collaboration sur le projet X" /></label><label className="text-xs font-semibold text-ink-600">Projet concerné *<input required className={inputClass} value={form.project} onChange={(e) => setForm({ ...form, project: e.target.value })} placeholder="Nom ou référence du projet" /></label><label className="text-xs font-semibold text-ink-600 sm:col-span-2">Type de collaboration *<input required className={inputClass} value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} placeholder="Transmission de rapport, coordination, partage d’expertise…" /></label><label className="text-xs font-semibold text-ink-600">Demandeur *<input required className={inputClass} value={form.requesterName} onChange={(e) => setForm({ ...form, requesterName: e.target.value })} /></label><label className="text-xs font-semibold text-ink-600">Fonction *<input required className={inputClass} value={form.requesterFunction} onChange={(e) => setForm({ ...form, requesterFunction: e.target.value })} placeholder="Fonction dans l’institution" /></label><label className="text-xs font-semibold text-ink-600 sm:col-span-2">Numéro de contact *<input required className={inputClass} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+243…" /></label></div><label className="mt-3 block text-xs font-semibold text-ink-600">Message<textarea required rows={4} className={inputClass} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Expliquez le contexte et la collaboration souhaitée." /></label><label className="mt-4 flex cursor-pointer items-center gap-2 text-xs font-semibold text-primary-700"><Paperclip className="h-4 w-4" /> Joindre des pièces justificatives<input type="file" multiple onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 5))} className="hidden" /></label>{files.length > 0 && <p className="mt-2 text-xs text-ink-500">{files.map((file) => file.name).join(' · ')}</p>}<div className="mt-4 rounded-lg border border-warning-200 bg-warning-50 p-3"><p className="flex items-start gap-2 text-xs leading-relaxed text-warning-800"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />Une demande de collaboration ne vaut pas autorisation. Aucune activité ni aucun partage de document ne peut commencer sans l’accord explicite de l’institution destinataire.</p><label className="mt-3 flex items-start gap-2 text-xs font-semibold text-warning-900"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} required className="mt-0.5 accent-primary-600" />Je confirme que cette demande est soumise à l’accord préalable de l’institution destinataire.</label></div>{error && <p className="mt-3 rounded-lg bg-danger-50 p-3 text-xs text-danger-700">{error}</p>}<div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setRequestTarget(null)} className="rounded-lg px-4 py-2 text-sm font-semibold text-ink-600 hover:bg-ink-100">Annuler</button><button disabled={saving || !consent} className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? <Clock3 className="h-4 w-4 animate-pulse" /> : <Send className="h-4 w-4" />}{saving ? 'Envoi…' : 'Envoyer la demande'}</button></div></form></div>}

      {selectedRequest && <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 p-4"><section className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-2xl"><div className="flex items-start justify-between border-b border-ink-100 p-5"><div><p className="text-xs font-semibold uppercase text-primary-600">Détails de la demande · {statusText[selectedRequest.status]}</p><h2 className="mt-1 text-lg font-bold text-ink-900">{selectedRequest.subject}</h2></div><button onClick={() => setSelectedRequest(null)} className="rounded-lg p-2 text-ink-500 hover:bg-ink-100"><X className="h-5 w-5" /></button></div><div className="space-y-4 p-5"><div className="grid gap-3 sm:grid-cols-2">{[['Institution demandeuse', selectedRequest.requester_company_name], ['Institution destinataire', selectedRequest.target_company_name], ['Projet', selectedRequest.project], ['Collaboration', selectedRequest.purpose], ['Demandeur', selectedRequest.requester_name], ['Fonction', selectedRequest.requester_function], ['Contact', selectedRequest.requester_phone], ['Date', new Date(selectedRequest.created_at).toLocaleString('fr-FR')]].map(([label, value]) => <div key={label} className="rounded-lg bg-ink-50 p-3"><p className="text-[10px] font-semibold text-ink-400">{label}</p><p className="mt-1 text-sm text-ink-800">{value || '—'}</p></div>)}</div><div><p className="text-xs font-bold text-ink-500">Message</p><p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-ink-700">{selectedRequest.message}</p></div>{selectedRequest.attachments?.length > 0 && <div><p className="mb-2 text-xs font-bold text-ink-500">Pièces jointes</p><div className="space-y-1">{selectedRequest.attachments.map((attachment) => <a key={attachment.url} href={attachment.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-primary-700 underline"><Paperclip className="h-3.5 w-3.5" />{attachment.name}</a>)}</div></div>}<p className="rounded-lg border border-warning-200 bg-warning-50 p-3 text-xs text-warning-800">La collaboration ne commence qu’après l’accord formel des deux institutions.</p>{selectedRequest.target_company_id === companyContext?.id && selectedRequest.status !== 'accepted' && selectedRequest.status !== 'rejected' && <div className="flex flex-wrap justify-end gap-2"><button onClick={() => void setRequestStatus(selectedRequest, 'review')} className="inline-flex items-center gap-1 rounded-lg bg-warning-500 px-3 py-2 text-xs font-semibold text-white"><EyeIcon /> En revue</button><button onClick={() => void setRequestStatus(selectedRequest, 'rejected')} className="inline-flex items-center gap-1 rounded-lg bg-danger-600 px-3 py-2 text-xs font-semibold text-white"><X className="h-4 w-4" /> Rejeter</button><button onClick={() => void setRequestStatus(selectedRequest, 'accepted')} className="inline-flex items-center gap-1 rounded-lg bg-accent-600 px-3 py-2 text-xs font-semibold text-white"><Check className="h-4 w-4" /> Accepter</button></div>}</div></section></div>}
    </div>
  );
}

function EyeIcon() { return <ShieldCheck className="h-4 w-4" />; }
