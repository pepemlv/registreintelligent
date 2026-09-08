import { useState, type FormEvent } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, firestore } from '@/lib/firebase';

interface SignInProps {
  onBack: () => void;
  initialMode?: 'signin' | 'signup';
}

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA',
  'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT',
  'VA', 'WA', 'WV', 'WI', 'WY', 'DC',
];

export default function SignIn({ onBack, initialMode = 'signin' }: SignInProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (mode === 'signup') {
      if (!fullName.trim()) {
        setError('Indiquez votre nom complet.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Les mots de passe ne correspondent pas.');
        return;
      }
      const ageNum = Number(age);
      if (!age || Number.isNaN(ageNum) || ageNum < 13) {
        setError('Indiquez un âge valide (13 ans ou plus).');
        return;
      }
    }

    setSubmitting(true);
    try {
      if (mode === 'signin') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(credential.user, { displayName: fullName.trim() });
        await firestore.from('profiles').insert({
          full_name: fullName.trim(),
          email,
          phone,
          age: Number(age),
          city,
          state,
          zip_code: zipCode,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Échec de l\'authentification.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = 'w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-usps-blue';
  const labelClass = 'text-xs text-gray-400 font-medium uppercase mb-1 block';

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-md bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
        <button type="button" onClick={onBack} className="text-sm text-gray-500 hover:text-gray-900 mb-6">
          Retour à l'accueil
        </button>
        <div className="flex items-center gap-2.5 mb-4">
          <span className="font-extrabold text-sm italic uppercase tracking-wide">
            <span className="text-usps-blue">Registre </span>
            <span className="text-usps-red">Intelligent</span>
          </span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">{mode === 'signin' ? 'Connexion' : 'Créer un compte'}</h1>
        <p className="text-sm text-gray-500 mb-6">Utilisez le même compte sur le web et sur mobile.</p>

        {mode === 'signup' && (
          <>
            <label className={labelClass}>Nom complet</label>
            <input
              type="text"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Jean Dupont"
              className={inputClass}
              required
            />
          </>
        )}

        <label className={labelClass}>E-mail</label>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={inputClass}
          required
        />

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

            <label className={labelClass}>Numéro de téléphone</label>
            <input
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="06 12 34 56 78"
              className={inputClass}
              required
            />

            <label className={labelClass}>Âge</label>
            <input
              type="number"
              value={age}
              onChange={(event) => setAge(event.target.value)}
              min={13}
              className={inputClass}
              required
            />

            <label className={labelClass}>Ville</label>
            <input
              type="text"
              value={city}
              onChange={(event) => setCity(event.target.value)}
              className={inputClass}
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Département / État</label>
                <select
                  value={state}
                  onChange={(event) => setState(event.target.value)}
                  className={inputClass}
                  required
                >
                  <option value="" disabled>Sélectionner</option>
                  {US_STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Code postal</label>
                <input
                  type="text"
                  value={zipCode}
                  onChange={(event) => setZipCode(event.target.value)}
                  pattern="\d{5}"
                  maxLength={5}
                  className={inputClass}
                  required
                />
              </div>
            </div>
          </>
        )}

        {error && <div className="text-sm text-usps-red mb-4">{error}</div>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full px-4 py-2.5 bg-usps-blue text-white rounded-xl text-sm font-semibold hover:bg-usps-blue-dark disabled:opacity-40 transition-colors"
        >
          {submitting ? 'Veuillez patienter...' : mode === 'signin' ? 'Connexion' : 'Créer un compte'}
        </button>
        <button
          type="button"
          onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
          className="w-full mt-3 text-sm text-gray-500 hover:text-gray-900"
        >
          {mode === 'signin' ? 'Pas encore de compte ? Créez-en un' : 'Déjà un compte ? Connectez-vous'}
        </button>
      </form>
    </div>
  );
}
