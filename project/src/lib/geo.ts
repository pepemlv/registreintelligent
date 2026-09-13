export const COUNTRIES = [
  'République démocratique du Congo',
  'Congo-Brazzaville',
  'Rwanda',
  'Burundi',
  'Ouganda',
  'Angola',
  'Zambie',
  'République centrafricaine',
  'Cameroun',
  "Côte d'Ivoire",
  'Sénégal',
  'Gabon',
  'Bénin',
  'Togo',
  'Mali',
  'Burkina Faso',
  'Niger',
  'Guinée',
  'Tchad',
  'Maroc',
  'Tunisie',
  'Algérie',
  'France',
  'Belgique',
  'Canada',
  'Autre',
] as const;

/** The 26 provinces of the Democratic Republic of the Congo. */
export const DRC_PROVINCES = [
  'Bas-Uele',
  'Équateur',
  'Haut-Katanga',
  'Haut-Lomami',
  'Haut-Uele',
  'Ituri',
  'Kasaï',
  'Kasaï-Central',
  'Kasaï-Oriental',
  'Kinshasa',
  'Kongo Central',
  'Kwango',
  'Kwilu',
  'Lomami',
  'Lualaba',
  'Mai-Ndombe',
  'Maniema',
  'Mongala',
  'Nord-Kivu',
  'Nord-Ubangi',
  'Sankuru',
  'Sud-Kivu',
  'Sud-Ubangi',
  'Tanganyika',
  'Tshopo',
  'Tshuapa',
] as const;

export function isDrc(country: string): boolean {
  return country === 'République démocratique du Congo';
}

/** RDC is organized by province; every other country in the list uses a free-text city. */
export function usesProvinces(country: string): boolean {
  return isDrc(country);
}
