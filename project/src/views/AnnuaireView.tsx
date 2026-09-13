import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Building2, ChevronRight, ChevronDown, ChevronLeft, ChevronRight as ChevronNext, MapPin, Phone, Mail, Search, ShieldCheck, Upload, X, CheckCircle2, Images } from 'lucide-react';
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';
import { auth, firestore, storage } from '@/lib/firebase';
import { DIRECTORY_SECTORS } from '@/lib/directoryCategories';
import { DRC_PROVINCES } from '@/lib/geo';

type DirectoryCompany = {
  id: string;
  name: string;
  city?: string;
  country?: string;
  address?: string;
  phone?: string;
  primary_admin_email?: string;
  description?: string;
  organization_type?: string;
  supplier_categories?: string[];
  categories?: string[];
  is_supplier?: boolean;
  directory_status?: 'active' | 'suspended' | 'review';
  logo_url?: string;
  primary_image_url?: string;
  gallery_urls?: string[];
};

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export function AnnuaireView() {
  const [companies, setCompanies] = useState<DirectoryCompany[]>([]);
  const [selectedCategoryCode, setSelectedCategoryCode] = useState(DIRECTORY_SECTORS[0].code);
  const [expandedCategoryCode, setExpandedCategoryCode] = useState<string | null>(DIRECTORY_SECTORS[0].code);
  const [selectedSubcategory, setSelectedSubcategory] = useState('Toutes');
  const [selectedCity, setSelectedCity] = useState('Toutes');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showRegistration, setShowRegistration] = useState(false);
  const [savingRegistration, setSavingRegistration] = useState(false);
  const [registrationMessage, setRegistrationMessage] = useState('');
  const [registration, setRegistration] = useState({ name: '', organizationType: 'Entreprise', city: '', country: 'RDC', address: '', phone: '', email: '', description: '', category: DIRECTORY_SECTORS[0].name, subcategory: '' });
  const [logoPhoto, setLogoPhoto] = useState<File | null>(null);
  const [primaryPhoto, setPrimaryPhoto] = useState<File | null>(null);
  const [galleryPhotos, setGalleryPhotos] = useState<File[]>([]);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [activeImages, setActiveImages] = useState<Record<string, number>>({});

  useEffect(() => {
    firestore.from<DirectoryCompany>('companies').select().then(({ data }) => {
      setCompanies(((data as DirectoryCompany[] | null) ?? []).filter((company) => !company.directory_status || company.directory_status === 'active'));
      setLoading(false);
    });
  }, []);

  const submitRegistration = async (event: FormEvent) => {
    event.preventDefault();
    if (!registration.name.trim() || !registration.city.trim() || !registration.subcategory || !logoPhoto || !primaryPhoto) return;
    setSavingRegistration(true);
    setRegistrationMessage('');
    try {
      const owner = auth.currentUser?.uid ?? 'directory-public';
      const files = [logoPhoto, primaryPhoto, ...galleryPhotos];
      const urls = await Promise.all(files.map(async (file, index) => {
        const target = storageRef(storage, `directory-submissions/${owner}/${Date.now()}-${index}-${file.name}`);
        await uploadBytes(target, file);
        return getDownloadURL(target);
      }));
      await firestore.from('companies').insert({
        ...registration,
        name: registration.name.trim(),
        city: registration.city.trim(),
        address: registration.address.trim(),
        phone: registration.phone.trim(),
        primary_admin_email: registration.email.trim().toLowerCase(),
        categories: [registration.category, registration.subcategory].filter(Boolean),
        directory_subcategory: registration.subcategory,
        logo_url: urls[0],
        primary_image_url: urls[1],
        gallery_urls: urls.slice(1),
        directory_status: 'review',
        directory_submitted_at: new Date().toISOString(),
        primary_admin_uid: auth.currentUser?.uid ?? null,
      });
      setRegistrationMessage('Votre information est en attente d’être vérifiée.');
      setLogoPhoto(null);
      setPrimaryPhoto(null);
      setGalleryPhotos([]);
    } catch {
      setRegistrationMessage('Impossible d’enregistrer votre entreprise pour le moment.');
    } finally {
      setSavingRegistration(false);
    }
  };

  const selectedSector = DIRECTORY_SECTORS.find((sector) => sector.code === selectedCategoryCode) ?? DIRECTORY_SECTORS[0];
  const registrationSector = DIRECTORY_SECTORS.find((sector) => sector.name === registration.category) ?? DIRECTORY_SECTORS[0];
  const categoryCompanies = useMemo(() => companies.filter((company) => {
    const values = [...(company.supplier_categories ?? []), ...(company.categories ?? [])].map(normalize);
    const accepted = [selectedSector.name, ...selectedSector.subcategories].map(normalize);
    return values.some((value) => accepted.some((category) => value.includes(category) || category.includes(value)));
  }), [companies, selectedSector]);

  const cities = useMemo(() => ['Toutes', ...Array.from(new Set(companies.map((company) => company.city?.trim()).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b, 'fr'))], [companies]);

  const visibleCompanies = categoryCompanies.filter((company) => {
    if (selectedSubcategory !== 'Toutes' && ![...(company.supplier_categories ?? []), ...(company.categories ?? [])].some((value) => normalize(value) === normalize(selectedSubcategory))) return false;
    if (selectedCity !== 'Toutes' && company.city !== selectedCity) return false;
    const query = normalize(search.trim());
    return !query || normalize(`${company.name} ${company.city ?? ''} ${company.organization_type ?? ''}`).includes(query);
  });

  return (
    <div className="flex min-h-[calc(100vh-76px)] flex-col bg-white animate-fade-in lg:flex-row">
      <aside className="max-h-[42dvh] w-full shrink-0 overflow-y-auto border-b border-yellow-500 bg-yellow-300 p-3 lg:max-h-none lg:w-72 lg:border-b-0 lg:border-r lg:p-4">
        <div className="-mx-3 -mt-3 mb-3 border-b border-yellow-500 bg-yellow-400 px-5 py-4 lg:-mx-4 lg:-mt-4">
          <h1 className="text-base font-bold text-ink-900">Annuaire B2B</h1>
          <p className="pt-1 text-xs text-ink-700">Entreprises et prestataires enregistrés</p>
          <button onClick={() => setShowRegistration(true)} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md bg-ink-900 px-3 py-2.5 text-xs font-semibold text-yellow-300 hover:bg-ink-800"><Building2 className="h-4 w-4" /> Enregistrer votre entreprise</button>
        </div>
        <div className="space-y-1">{DIRECTORY_SECTORS.map((sector) => {
          const active = selectedSector.code === sector.code;
          const expanded = expandedCategoryCode === sector.code;
          return (
            <div key={sector.code}>
              <button aria-expanded={expanded} onClick={() => {
                if (expanded) {
                  setExpandedCategoryCode(null);
                } else {
                  setExpandedCategoryCode(sector.code);
                  if (!active) {
                    setSelectedCategoryCode(sector.code);
                    setSelectedSubcategory('Toutes');
                  }
                }
              }} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs font-semibold ${active ? 'bg-yellow-500 text-ink-900' : 'text-ink-800 hover:bg-yellow-200'}`}>
                {expanded ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-ink-800" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-ink-500" />}
                <span>{sector.name}</span>
              </button>
              {expanded && <div className="ml-4 space-y-0.5 border-l border-yellow-600/50 py-1 pl-3">
                <button onClick={() => setSelectedSubcategory('Toutes')} className={`block w-full rounded-md px-2.5 py-2 text-left text-[11px] ${selectedSubcategory === 'Toutes' ? 'bg-ink-900 font-semibold text-white' : 'text-ink-700 hover:bg-yellow-200'}`}>Toutes les sous-catégories</button>
                {sector.subcategories.map((subcategory) => <button key={subcategory} onClick={() => setSelectedSubcategory(subcategory)} className={`block w-full rounded-md px-2.5 py-2 text-left text-[11px] ${selectedSubcategory === subcategory ? 'bg-ink-900 font-semibold text-white' : 'text-ink-700 hover:bg-yellow-200'}`}>{subcategory}</button>)}
              </div>}
            </div>
          );
        })}</div>
      </aside>
      <main className="min-w-0 flex-1 overflow-y-auto bg-ink-50/40 p-5 md:p-8">
        <div className="mx-auto w-full max-w-none">
          {showRegistration && <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 p-4"><form onSubmit={submitRegistration} className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"><div className="mb-5 flex items-center justify-between"><div><h2 className="text-lg font-bold text-ink-900">Enregistrer votre entreprise</h2><p className="mt-1 text-xs text-ink-500">Votre fiche sera vérifiée avant publication dans l’annuaire.</p></div><button type="button" onClick={() => setShowRegistration(false)} className="rounded-lg p-2 text-ink-400 hover:bg-ink-100"><X className="h-5 w-5" /></button></div><div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-semibold text-ink-600">Nom de l’entreprise<input required value={registration.name} onChange={(e) => setRegistration({ ...registration, name: e.target.value })} className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm" /></label><label className="text-xs font-semibold text-ink-600">Ville / province<select required value={registration.city} onChange={(e) => setRegistration({ ...registration, city: e.target.value })} className="mt-1 w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm"><option value="">Sélectionner une province</option>{DRC_PROVINCES.map((province) => <option key={province}>{province}</option>)}</select></label><label className="text-xs font-semibold text-ink-600">Type<select value={registration.organizationType} onChange={(e) => setRegistration({ ...registration, organizationType: e.target.value })} className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm"><option>Entreprise</option><option>PME</option><option>ONG</option><option>Administration publique</option></select></label><label className="text-xs font-semibold text-ink-600">Catégorie<select required value={registration.category} onChange={(e) => setRegistration({ ...registration, category: e.target.value, subcategory: '' })} className="mt-1 w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm">{DIRECTORY_SECTORS.map((sector) => <option key={sector.code}>{sector.name}</option>)}</select></label><label className="text-xs font-semibold text-ink-600">Sous-catégorie<select required value={registration.subcategory} onChange={(e) => setRegistration({ ...registration, subcategory: e.target.value })} className="mt-1 w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm"><option value="">Sélectionner une sous-catégorie</option>{registrationSector.subcategories.map((subcategory) => <option key={subcategory}>{subcategory}</option>)}</select></label><label className="text-xs font-semibold text-ink-600">Adresse<input value={registration.address} onChange={(e) => setRegistration({ ...registration, address: e.target.value })} className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm" /></label><label className="text-xs font-semibold text-ink-600">Téléphone<input value={registration.phone} onChange={(e) => setRegistration({ ...registration, phone: e.target.value })} placeholder="+243..." className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm" /></label><label className="text-xs font-semibold text-ink-600">E-mail<input type="email" value={registration.email} onChange={(e) => setRegistration({ ...registration, email: e.target.value })} placeholder="contact@..." className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm" /></label></div><label className="mt-4 block text-xs font-semibold text-ink-600">Présentation<textarea value={registration.description} onChange={(e) => setRegistration({ ...registration, description: e.target.value })} rows={3} placeholder="Décrivez votre activité, vos produits ou services..." className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm" /></label><div className="mt-4 space-y-4 rounded-xl border border-dashed border-ink-300 p-4">  <div><h3 className="text-sm font-bold text-ink-800">Images de votre fiche</h3><p className="mt-1 text-xs text-ink-500">Sélectionnez séparément le logo, l’image principale et jusqu’à cinq autres photos.</p></div>  <div className="grid gap-4 sm:grid-cols-2">    <label className="cursor-pointer rounded-lg border border-ink-200 bg-white p-3 text-xs font-semibold text-ink-700">Logo de l’entreprise · 1 fichier      <input required type="file" accept="image/*" onChange={(e) => setLogoPhoto(e.target.files?.[0]?.type.startsWith("image/") ? e.target.files[0] : null)} className="mt-2 block w-full text-xs file:mr-2 file:rounded-md file:border-0 file:bg-yellow-300 file:px-3 file:py-2 file:text-xs file:font-semibold" />      {logoPhoto && <img src={URL.createObjectURL(logoPhoto)} alt="Aperçu du logo" className="mt-3 h-24 w-24 rounded-md border border-ink-200 object-cover" />}    </label>    <label className="cursor-pointer rounded-lg border border-ink-200 bg-white p-3 text-xs font-semibold text-ink-700">Image principale · 1 fichier      <input required type="file" accept="image/*" onChange={(e) => setPrimaryPhoto(e.target.files?.[0]?.type.startsWith("image/") ? e.target.files[0] : null)} className="mt-2 block w-full text-xs file:mr-2 file:rounded-md file:border-0 file:bg-yellow-300 file:px-3 file:py-2 file:text-xs file:font-semibold" />      {primaryPhoto && <img src={URL.createObjectURL(primaryPhoto)} alt="Aperçu de l’image principale" className="mt-3 h-24 w-full rounded-md border border-ink-200 object-cover" />}    </label>  </div>  <label className="block cursor-pointer rounded-lg border border-ink-200 bg-white p-3 text-xs font-semibold text-ink-700">Autres photos · maximum 5 fichiers    <input type="file" accept="image/*" multiple onChange={(e) => setGalleryPhotos(Array.from(e.target.files ?? []).filter((file) => file.type.startsWith("image/")).slice(0, 5))} className="mt-2 block w-full text-xs file:mr-2 file:rounded-md file:border-0 file:bg-yellow-300 file:px-3 file:py-2 file:text-xs file:font-semibold" />  </label>  {galleryPhotos.length > 0 && <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">{galleryPhotos.map((photo, index) => <div key={`${photo.name}-${index}`} className="min-w-0"><img src={URL.createObjectURL(photo)} alt={`Photo secondaire ${index + 1}`} className="h-20 w-full rounded-md border border-ink-200 object-cover" /><p className="mt-1 truncate text-[10px] text-ink-500">Photo secondaire {index + 1}</p></div>)}</div>}</div>{registrationMessage && <p className="mt-4 rounded-lg bg-accent-50 px-3 py-2 text-xs font-semibold text-accent-700">{registrationMessage}</p>}<div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setShowRegistration(false)} className="rounded-lg px-4 py-2 text-sm font-semibold text-ink-600 hover:bg-ink-100">Annuler</button><button type="submit" disabled={savingRegistration || !registration.subcategory || !logoPhoto || !primaryPhoto} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{savingRegistration ? 'Enregistrement...' : 'Soumettre pour vérification'}</button></div></form></div>}
          <div className="flex flex-wrap items-end justify-between gap-3 rounded-lg border border-yellow-400 bg-yellow-300 p-4"><div><p className="text-xs font-semibold uppercase tracking-wider text-ink-700">Annuaire · {selectedSector.code}</p><h2 className="mt-1 text-xl font-bold text-ink-900">{selectedSector.name}</h2><p className="mt-1 text-xs text-ink-700">{visibleCompanies.length} entreprise{visibleCompanies.length === 1 ? '' : 's'} trouvée{visibleCompanies.length === 1 ? '' : 's'}</p></div><div className="flex w-full flex-wrap gap-2 sm:w-auto"><select value={selectedCity} onChange={(event) => setSelectedCity(event.target.value)} className="rounded-lg border border-ink-300 bg-white px-3 py-2 text-xs font-semibold text-ink-700 outline-none focus:border-ink-500"><option value="Toutes">Toutes les villes</option>{cities.slice(1).map((city) => <option key={city} value={city}>{city}</option>)}</select><label className="flex min-w-[220px] flex-1 items-center gap-2 rounded-lg border border-ink-300 bg-white px-3 py-2 text-xs text-ink-500"><Search className="h-4 w-4" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher une entreprise" className="w-full bg-transparent outline-none" /></label></div></div>
          {selectedSubcategory !== 'Toutes' && <p className="mt-3 text-xs text-ink-500">Sous-catégorie : <span className="font-semibold text-ink-700">{selectedSubcategory}</span></p>}
          {loading ? <div className="py-20 text-center text-sm text-ink-500">Chargement de l’annuaire...</div> : visibleCompanies.length === 0 ? <div className="mt-6 rounded-xl border border-ink-200 bg-white px-6 py-16 text-center"><Building2 className="mx-auto h-10 w-10 text-ink-300" /><p className="mt-3 text-sm font-semibold text-ink-700">Aucune entreprise dans cette catégorie</p><p className="mt-1 text-xs text-ink-500">Les entreprises enregistrées dans Firebase apparaîtront ici.</p></div> : <div className="mt-6 grid grid-cols-1 gap-6">{visibleCompanies.map((company) => (
            <div key={company.id} className="w-full overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-card">
              {/* Header: logo, name, address, phone, email */}
              <div className="flex items-start gap-3 p-5 border-b border-ink-100">
                {company.logo_url ? (
                  <img src={company.logo_url} alt={company.name} className="h-11 w-11 shrink-0 rounded-lg object-cover ring-1 ring-ink-200" />
                ) : (
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary-600 text-sm font-bold text-white">{company.name.slice(0, 2).toUpperCase()}</div>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="text-2xl font-extrabold leading-tight text-ink-900 md:text-3xl">{company.name}</h3>
                  <p className="text-xs text-ink-500">{company.organization_type || 'Entreprise'}</p>
                  <div className="mt-1.5 space-y-1 text-[11px] text-ink-600">
                    <p className="flex items-center gap-1.5 truncate"><MapPin className="h-3 w-3 text-ink-400 shrink-0" />{[company.address, company.city, company.country].filter(Boolean).join(', ') || 'Localisation non renseignée'}</p>
                    {company.phone && <p className="flex items-center gap-1.5 truncate"><Phone className="h-3 w-3 text-ink-400 shrink-0" />{company.phone}</p>}
                    {company.primary_admin_email && <p className="flex items-center gap-1.5 truncate"><Mail className="h-3 w-3 text-ink-400 shrink-0" />{company.primary_admin_email}</p>}
                  </div>
                </div>
              </div>
              {/* Body: description ("pub") + image gallery thumbnails */}
              <div className="p-5 pt-4 flex-1 flex flex-col">
                {(() => { const gallery = company.gallery_urls?.length ? company.gallery_urls : company.logo_url ? [company.logo_url] : []; const active = activeImages[company.id] ?? 0; const image = gallery[active] || gallery[0]; return image ? <div className="relative mb-5 overflow-hidden rounded-xl bg-ink-100"><img src={image} alt={`${company.name} - photo ${active + 1}`} className="h-72 w-full object-cover md:h-96" />{gallery.length > 1 && <><button type="button" aria-label="Photo précédente" onClick={() => setActiveImages((current) => ({ ...current, [company.id]: (active - 1 + gallery.length) % gallery.length }))} className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-ink-700 shadow hover:bg-white"><ChevronLeft className="h-5 w-5" /></button><button type="button" aria-label="Photo suivante" onClick={() => setActiveImages((current) => ({ ...current, [company.id]: (active + 1) % gallery.length }))} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-ink-700 shadow hover:bg-white"><ChevronNext className="h-5 w-5" /></button><span className="absolute bottom-3 right-3 rounded-full bg-ink-950/70 px-2.5 py-1 text-[10px] font-semibold text-white">{active + 1} / {gallery.length}</span></>}</div> : null; })()}
                {company.is_supplier && <p className="mb-2 flex items-center gap-2 text-[11px] font-semibold text-accent-700"><ShieldCheck className="h-3.5 w-3.5" /> Fournisseur enregistré</p>}
                <p className="text-xs text-ink-600 leading-relaxed flex-1">{company.description || 'Aucune présentation renseignée.'}</p>
                {company.gallery_urls && company.gallery_urls.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-ink-100">
                    <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase text-ink-400"><Images className="h-3 w-3" /> Photos</p>
                    <div className="flex flex-wrap gap-1.5">
                      {company.gallery_urls.map((url, index) => (
                        <button key={`${url}-${index}`} type="button" onClick={() => setActiveImages((current) => ({ ...current, [company.id]: index }))} className={`h-14 w-14 rounded-lg overflow-hidden ring-2 transition-all shrink-0 ${activeImages[company.id] === index ? 'ring-primary-600' : 'ring-ink-200 hover:ring-primary-400'}`}>
                          <img src={url} alt={`${company.name} ${index + 1}`} className="h-full w-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}</div>}
          {lightboxUrl && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink-950/80 p-6 animate-fade-in" onClick={() => setLightboxUrl(null)}>
              <button type="button" onClick={() => setLightboxUrl(null)} className="absolute right-5 top-5 rounded-lg bg-white/10 p-2 text-white hover:bg-white/20"><X className="h-5 w-5" /></button>
              <img src={lightboxUrl} alt="Aperçu" className="max-h-[85vh] max-w-[90vw] rounded-xl object-contain shadow-2xl" onClick={(event) => event.stopPropagation()} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
