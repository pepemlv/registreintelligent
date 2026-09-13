import {
  ReceiptText, Landmark, Calculator, ShieldCheck, HeartPulse,
  Building2, Scale, Briefcase, User, GraduationCap, FileText,
  Wifi, Home,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface CategoryMeta {
  label: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
}

export const CATEGORIES: Record<string, CategoryMeta> = {
  Bills: { label: 'Factures', icon: ReceiptText, color: 'text-usps-red', bgColor: 'bg-red-50' },
  Government: { label: 'Administration', icon: Landmark, color: 'text-usps-blue', bgColor: 'bg-usps-gray' },
  Taxes: { label: 'Impôts', icon: Calculator, color: 'text-emerald-700', bgColor: 'bg-emerald-50' },
  Insurance: { label: 'Assurance', icon: ShieldCheck, color: 'text-red-700', bgColor: 'bg-red-50' },
  Medical: { label: 'Médical', icon: HeartPulse, color: 'text-rose-700', bgColor: 'bg-rose-50' },
  Banking: { label: 'Banque', icon: Building2, color: 'text-violet-700', bgColor: 'bg-violet-50' },
  Legal: { label: 'Juridique', icon: Scale, color: 'text-slate-600', bgColor: 'bg-slate-50' },
  Business: { label: 'Entreprise', icon: Briefcase, color: 'text-teal-700', bgColor: 'bg-teal-50' },
  Personal: { label: 'Personnel', icon: User, color: 'text-gray-600', bgColor: 'bg-gray-50' },
  School: { label: 'École', icon: GraduationCap, color: 'text-amber-700', bgColor: 'bg-amber-50' },
  Employment: { label: 'Emploi', icon: Briefcase, color: 'text-indigo-700', bgColor: 'bg-indigo-50' },
  Other: { label: 'Autre', icon: FileText, color: 'text-gray-500', bgColor: 'bg-gray-50' },
};

export const FOLDER_ICONS: Record<string, LucideIcon> = {
  ReceiptText, Landmark, Calculator, ShieldCheck, HeartPulse,
  Building2, Scale, Briefcase, User, Wifi, Home,
  FileText, GraduationCap,
};

export function getCategoryMeta(category: string): CategoryMeta {
  return CATEGORIES[category] || CATEGORIES.Other;
}
