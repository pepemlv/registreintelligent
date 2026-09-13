import { useState, type FormEvent } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, firestore, setActiveCompanyContext } from '@/lib/firebase';
import { firebaseAuthErrorMessage } from '@/lib/invitations';
import { COUNTRIES, DRC_PROVINCES, usesProvinces } from '@/lib/geo';
import { BUSINESS_CATEGORIES, type SupplierOfferType } from '@/lib/businessCategories';

interface SignInProps {
  onBack: () => void;
  initialMode?: 'signin' | 'signup';
  initialMessage?: string | null;
}

const ORGANIZATION_TYPES = ['Entreprise', 'ONG', 'Administration publique', 'PME', 'Association', 'Autre'];
const INSTITUTION_TYPES = ['Ministère', 'Gouvernorat', 'Entité territoriale', 'Administration publique', 'Entreprise publique', 'Établissement public', 'Service de contrôle', 'Autre institution'];

export default function SignIn({ onBack, initialMode = 'signin', initialMessage = null }: SignInProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [companyName, setCompanyName] = useState('');
  const [accountKind, setAccountKind] = useState<'business' | 'institution'>('business');
  const [companyType, setCompanyType] = useState('Entreprise');
  const [companyRegistration, setCompanyRegistration] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [country, setCountry] = useState<string>(COUNTRIES[0]);
  const [city, setCity] = useState('');
  const [isSupplier, setIsSupplier] = useState<boolean | null>(null);
  const [supplierOfferType, setSupplierOfferType] = useState<SupplierOfferType>('products');
  const [supplierCategories, setSupplierCategories] = useState<string[]>([]);
  const [adminName, setAdminName] = useState('');
  const [adminTitle, setAdminTitle] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [secondaryAdminEmail, setSecondaryAdminEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(initialMessage);
  const [submitting, setSubmitting] = useState(false);

  const email = mode === 'signup' ? adminEmail : adminEmail;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (mode === 'signup') {
      if (!companyName.trim()) {
        setError("Indiquez le nom de l'entreprise ou de l'organisation.");
        return;
      }
      if (!city.trim()) {
        setError(usesProvinces(country) ? "Sélectionnez la province de l'entreprise." : "Indiquez la ville de l'entreprise.");
        return;
      }
      if (!adminName.trim()) {
        setError("Indiquez le nom complet de l'administrateur principal.");
        return;
      }
      if (!adminEmail.trim()) {
        setError("Indiquez l'email de l'administrateur principal.");
        return;
      }
      if (password !== confirmPassword) {
        setError('Les mots de passe ne correspondent pas.');
        return;
      }
    }

    setSubmitting(true);
    try {
      if (mode === 'signin') {
        await signInWithEmailAndPassword(auth, adminEmail, password);
      } else {
        const credential = await createUserWithEmailAndPassword(auth, adminEmail.trim().toLowerCase(), password);
        await updateProfile(credential.user, { displayName: adminName.trim() });

        const { data: company } = await firestore.from<Record<string, unknown>>('companies').insert({
          name: companyName.trim(),
          organization_type: accountKind === 'institution' ? companyType : companyType,
          account_type: accountKind,
          account_status: accountKind === 'institution' ? 'review' : 'active',
          institution_status: accountKind === 'institution' ? 'review' : undefined,
          directory_status: accountKind === 'institution' ? 'review' : 'active',
          registration_number: companyRegistration.trim(),
          address: companyAddress.trim(),
          phone: companyPhone.trim(),
          country,
          city: city.trim(),
          is_supplier: accountKind === 'business' && isSupplier === true,
          supplier_offer_type: accountKind === 'business' && isSupplier ? supplierOfferType : null,
          supplier_categories: accountKind === 'business' && isSupplier ? supplierCategories : [],
          primary_admin_uid: credential.user.uid,
          primary_admin_name: adminName.trim(),
          primary_admin_email: adminEmail.trim().toLowerCase(),
          primary_admin_title: adminTitle.trim(),
          secondary_admin_email: secondaryAdminEmail.trim().toLowerCase(),
        }).select().single();

        const companyId = String((company as { id?: string } | null)?.id ?? '');
        if (!companyId) throw new Error('company-create-failed');
        setActiveCompanyContext({ id: companyId, name: companyName.trim() });

        await firestore.from('profiles').insert({
          owner_id: credential.user.uid,
          full_name: adminName.trim(),
          email: adminEmail.trim().toLowerCase(),
          function_title: adminTitle.trim(),
          phone: companyPhone.trim(),
          role: 'ORGANIZATION_ADMIN',
          role_label: 'Administrateur organisationnel',
          unit: 'Administration centrale',
          company_id: companyId,
          company_name: companyName.trim(),
          secondary_admin_email: secondaryAdminEmail.trim().toLowerCase(),
        });
      }
    } catch (err) {
      setError(firebaseAuthErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = 'w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-usps-blue';
  const labelClass = 'text-xs text-gray-400 font-medium uppercase mb-1 block';

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-2xl bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
        <button type="button" onClick={onBack} className="text-sm text-gray-500 hover:text-gray-900 mb-6">
          Retour à l'accueil
        </button>
        <div className="mb-4 flex items-center justify-between gap-4">
          <span className="flex items-center gap-2 font-extrabold text-sm italic uppercase tracking-wide">
            <img src="/logo-registre.png" alt="" className="h-9 w-9 rounded-lg border border-gray-100 object-contain" />
            <span className="text-usps-blue">Registre </span>
            <span className="text-usps-red">Intelligent</span>
          </span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">{mode === 'signin' ? 'Connexion business' : 'Créer un compte business'}</h1>
        <p className="text-sm text-gray-500 mb-6">
          {mode === 'signin'
            ? "Connectez-vous à l'espace de votre entreprise."
            : "Les documents, dossiers, tâches et invitations seront rattachés à cette entreprise."}
        </p>

        {mode === 'signup' && (
          <>
            <div className="mb-5 grid grid-cols-2 gap-2 rounded-xl bg-gray-100 p-1">
              <button type="button" onClick={() => { setAccountKind('business'); setCompanyType('Entreprise'); }} className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${accountKind === 'business' ? 'bg-white text-usps-blue shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>Compte entreprise</button>
              <button type="button" onClick={() => { setAccountKind('institution'); setCompanyType('Ministère'); setIsSupplier(false); }} className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${accountKind === 'institution' ? 'bg-white text-usps-blue shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>Compte institution</button>
            </div>
            {accountKind === 'institution' && <div className="mb-4 rounded-lg border border-warning-200 bg-warning-50 p-3 text-xs leading-relaxed text-warning-800">Les comptes institutionnels sont vérifiés avant activation. L’accès à l’espace sera ouvert après validation de l’institution et de ses représentants.</div>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
              <div>
                <label className={labelClass}>Nom de l'entreprise / organisation</label>
                <input value={companyName} onChange={(event) => setCompanyName(event.target.value)} className={inputClass} placeholder="TechTrack Suite SARL" required />
              </div>
              <div>
                <label className={labelClass}>{accountKind === 'institution' ? 'Type d’institution' : 'Type d’organisation'}</label>
                <select value={companyType} onChange={(event) => setCompanyType(event.target.value)} className={inputClass} required>
                  {(accountKind === 'institution' ? INSTITUTION_TYPES : ORGANIZATION_TYPES).map((type) => <option key={type}>{type}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
              <div>
                <label className={labelClass}>N° RCCM / Identification</label>
                <input value={companyRegistration} onChange={(event) => setCompanyRegistration(event.target.value)} className={inputClass} placeholder="CD/KIN/RCCM/..." />
              </div>
              <div>
                <label className={labelClass}>Téléphone entreprise</label>
                <input value={companyPhone} onChange={(event) => setCompanyPhone(event.target.value)} className={inputClass} placeholder="+243..." required />
              </div>
            </div>

            <label className={labelClass}>Adresse de l'entreprise</label>
            <input value={companyAddress} onChange={(event) => setCompanyAddress(event.target.value)} className={inputClass} placeholder="Numéro, rue, commune" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
              <div>
                <label className={labelClass}>Pays</label>
                <select
                  value={country}
                  onChange={(event) => { setCountry(event.target.value); setCity(''); }}
                  className={inputClass}
                  required
                >
                  {COUNTRIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>{usesProvinces(country) ? 'Province' : 'Ville'}</label>
                {usesProvinces(country) ? (
                  <select value={city} onChange={(event) => setCity(event.target.value)} className={inputClass} required>
                    <option value="">Sélectionner une province</option>
                    {DRC_PROVINCES.map((p) => <option key={p}>{p}</option>)}
                  </select>
                ) : (
                  <input value={city} onChange={(event) => setCity(event.target.value)} className={inputClass} placeholder="Ex: Brazzaville" required />
                )}
              </div>
            </div>
            <p className="text-[11px] text-gray-400 -mt-2 mb-4">
              Utilisée pour montrer vos appels d'offre aux fournisseurs de la même localité lorsqu'une entreprise limite sa demande au marché local.
            </p>

            <div className="h-px bg-gray-100 my-2" />

            {accountKind === 'business' && <>
            <label className={labelClass}>Fournissez-vous des produits ou services à d'autres entreprises ou partenaires ?</label>
            <div className="flex gap-3 mb-4">
              <button
                type="button"
                onClick={() => setIsSupplier(true)}
                className={`flex-1 px-3 py-2.5 rounded-lg text-sm font-semibold border transition-colors ${
                  isSupplier === true ? 'bg-usps-blue text-white border-usps-blue' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-usps-blue/50'
                }`}
              >
                Oui
              </button>
              <button
                type="button"
                onClick={() => setIsSupplier(false)}
                className={`flex-1 px-3 py-2.5 rounded-lg text-sm font-semibold border transition-colors ${
                  isSupplier === false ? 'bg-usps-blue text-white border-usps-blue' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-usps-blue/50'
                }`}
              >
                Non
              </button>
            </div>

            {isSupplier && (
              <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl mb-4 space-y-4">
                <div>
                  <label className={labelClass}>Type d'offre</label>
                  <select value={supplierOfferType} onChange={(event) => setSupplierOfferType(event.target.value as SupplierOfferType)} className={`${inputClass} mb-0`}>
                    <option value="products">Produits</option>
                    <option value="services">Services</option>
                    <option value="both">Les deux</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Catégories fournies</label>
                  <p className="text-[11px] text-gray-400 mb-2">
                    Permet à d'autres entreprises de vous inclure automatiquement lorsqu'elles publient un appel d'offre dans ces catégories.
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {BUSINESS_CATEGORIES.map((cat) => {
                      const checked = supplierCategories.includes(cat);
                      return (
                        <label key={cat} className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-xs cursor-pointer ${checked ? 'bg-usps-blue/10 border-usps-blue text-usps-blue font-medium' : 'bg-white border-gray-200 text-gray-600'}`}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => setSupplierCategories((current) => checked ? current.filter((c) => c !== cat) : [...current, cat])}
                            className="accent-usps-blue"
                          />
                          <span className="truncate">{cat}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
            </>}

            <div className="h-px bg-gray-100 my-2" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
              <div>
                <label className={labelClass}>Administrateur principal</label>
                <input value={adminName} onChange={(event) => setAdminName(event.target.value)} className={inputClass} placeholder="Papy Mulongo" required />
              </div>
              <div>
                <label className={labelClass}>Fonction administrateur</label>
                <input value={adminTitle} onChange={(event) => setAdminTitle(event.target.value)} className={inputClass} placeholder="Responsable administratif" />
              </div>
            </div>
          </>
        )}

        <label className={labelClass}>{mode === 'signin' ? 'Email administrateur' : 'Email administrateur principal'}</label>
        <input
          type="email"
          value={email}
          onChange={(event) => setAdminEmail(event.target.value)}
          className={inputClass}
          required
        />

        {mode === 'signup' && (
          <>
            <label className={labelClass}>Email administrateur secondaire</label>
            <input
              type="email"
              value={secondaryAdminEmail}
              onChange={(event) => setSecondaryAdminEmail(event.target.value)}
              className={inputClass}
              placeholder="backup@entreprise.cd"
            />
          </>
        )}

        <label className={labelClass}>Mot de passe</label>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={inputClass}
          minLength={6}
          required
        />

        {mode === 'signup' && (
          <>
            <label className={labelClass}>Confirmer le mot de passe</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className={inputClass}
              minLength={6}
              required
            />
          </>
        )}

        {error && <div className="text-sm text-usps-red mb-4">{error}</div>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full px-4 py-2.5 bg-usps-blue text-white rounded-xl text-sm font-semibold hover:bg-usps-blue-dark disabled:opacity-40 transition-colors"
        >
          {submitting ? 'Veuillez patienter...' : mode === 'signin' ? 'Connexion' : accountKind === 'institution' ? 'Soumettre la demande institutionnelle' : "Créer l'entreprise et le compte admin"}
        </button>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setMode(mode === 'signin' ? 'signup' : 'signin');
          }}
          className="w-full mt-3 text-sm text-gray-500 hover:text-gray-900"
        >
          {mode === 'signin' ? 'Créer un compte business' : 'Déjà une entreprise ? Connectez-vous'}
        </button>
      </form>
    </div>
  );
}
