import { addDoc, collection, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, db } from './firebase';
import type { UserRole } from '@/types';

export interface InvitationRecord {
  id: string;
  full_name: string;
  email: string;
  function_title: string;
  role: UserRole;
  role_label: string;
  unit: string;
  phone: string;
  message: string;
  invitation_text: string;
  token: string;
  company_id?: string;
  company_name?: string;
  status: 'pending' | 'accepted' | 'revoked';
  expires_at: string;
  created_at?: string;
  accepted_at?: string;
}

/**
 * Public, unauthenticated lookup by token — used by the invite-acceptance screen before the
 * recipient has an account. Goes through the raw Firestore SDK directly because `firestore`
 * (lib/firebase.ts) always scopes reads to the current authenticated owner_id.
 */
export async function findInvitationByToken(token: string): Promise<InvitationRecord | null> {
  const snapshot = await getDocs(query(collection(db, 'invitations'), where('token', '==', token)));
  if (snapshot.empty) return null;
  const docSnap = snapshot.docs[0];
  return { id: docSnap.id, ...(docSnap.data() as Omit<InvitationRecord, 'id'>) };
}

export function invitationStatus(invitation: InvitationRecord): 'valid' | 'expired' | 'used' {
  if (invitation.status !== 'pending') return 'used';
  if (new Date(invitation.expires_at).getTime() < Date.now()) return 'expired';
  return 'valid';
}

/** Display status for the "invitations sent" admin list — distinguishes accepted from revoked. */
export type InvitationDisplayStatus = 'accepted' | 'pending' | 'expired' | 'revoked';

export function invitationDisplayStatus(invitation: InvitationRecord): InvitationDisplayStatus {
  if (invitation.status === 'accepted') return 'accepted';
  if (invitation.status === 'revoked') return 'revoked';
  if (new Date(invitation.expires_at).getTime() < Date.now()) return 'expired';
  return 'pending';
}

export async function acceptInvitation(invitation: InvitationRecord, password: string): Promise<void> {
  const credential = await createUserWithEmailAndPassword(auth, invitation.email, password);
  await updateProfile(credential.user, { displayName: invitation.full_name });
  await addDoc(collection(db, 'profiles'), {
    owner_id: credential.user.uid,
    full_name: invitation.full_name,
    email: invitation.email,
    function_title: invitation.function_title,
    role: invitation.role,
    role_label: invitation.role_label,
    unit: invitation.unit,
    phone: invitation.phone,
    company_id: invitation.company_id ?? null,
    company_name: invitation.company_name ?? 'Organisation',
    created_at: new Date().toISOString(),
  });
  await updateDoc(doc(db, 'invitations', invitation.id), {
    status: 'accepted',
    accepted_at: new Date().toISOString(),
  });
}

export function firebaseAuthErrorMessage(error: unknown): string {
  const code = typeof error === 'object' && error && 'code' in error
    ? String((error as { code?: unknown }).code)
    : '';
  const message = error instanceof Error ? error.message : '';
  const source = `${code} ${message}`;

  if (source.includes('auth/email-already-in-use')) {
    return 'Cette adresse email est déjà utilisée. Connectez-vous avec ce compte ou demandez à votre administrateur de vous envoyer une invitation avec une autre adresse.';
  }
  if (source.includes('auth/invalid-email')) return 'Adresse email invalide. Vérifiez l’adresse saisie.';
  if (source.includes('auth/weak-password')) return 'Le mot de passe est trop faible. Utilisez au moins 6 caractères.';
  if (source.includes('auth/wrong-password') || source.includes('auth/invalid-credential')) {
    return 'Email ou mot de passe incorrect.';
  }
  if (source.includes('auth/user-not-found')) return 'Aucun compte ne correspond à cette adresse email.';
  if (source.includes('auth/user-disabled')) return 'Votre compte est suspendu par l’administrateur de la société qui a créé votre compte.';
  if (source.includes('auth/too-many-requests')) return 'Trop de tentatives. Patientez quelques minutes puis réessayez.';
  if (source.includes('auth/network-request-failed')) return 'Connexion réseau indisponible. Vérifiez votre connexion puis réessayez.';
  if (source.includes('company-create-failed')) return "Le compte utilisateur a été créé, mais l'entreprise n'a pas pu être enregistrée. Réessayez ou contactez l'assistance.";

  return "Impossible de finaliser l'authentification. Réessayez dans quelques instants.";
}

export function buildInvitationLink(token: string): string {
  return `${window.location.origin}${window.location.pathname}?invite=${token}`;
}
