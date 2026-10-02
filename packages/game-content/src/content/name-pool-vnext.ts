import { programContent } from './programs.js';

/**
 * M12 suggested-name pool (playtest report: "Adrian Adeyemi, Amari Ford, Anton Mitchell" every
 * time). Suggestions draw from the roster names plus these, so rooms (which use the roster pool
 * only) are unchanged. Names follow the app language (copy: locales/m12-identity.ts); a typed name is
 * never changed, and no name implies a nationality, an appearance or a rating.
 */
const GIVEN = [
  'tyrese',
  'xavier',
  'andre',
  'kendrick',
  'darnell',
  'mateo',
  'diego',
  'javier',
  'rafael',
  'kenji',
  'jun',
  'arjun',
  'rohan',
  'sione',
  'malakai',
  'keoni',
  'tevita',
  'dmitri',
  'nikolai',
  'connor',
  'owen',
  'wyatt',
  'brody',
  'tucker',
  'colton',
  'grayson',
  'ezekiel',
  'jeremiah',
  'josiah',
  'kwame',
  'chidi',
  'omari',
  'idris',
  'yusuf',
  'samir',
  'elijah',
  'luca',
  'santiago',
] as const;

const FAMILY = [
  'thompson',
  'jefferson',
  'okonkwo',
  'mensah',
  'asante',
  'hernandez',
  'ramirez',
  'morales',
  'castillo',
  'vega',
  'fonoti',
  'mauga',
  'fifita',
  'kahananui',
  'tanaka',
  'nakamura',
  'park',
  'choi',
  'singh',
  'sharma',
  'petrov',
  'novak',
  'kowalski',
  'sullivan',
  'murphy',
  'fischer',
  'becker',
  'lindqvist',
  'abernathy',
  'whitfield',
  'holloway',
  'prescott',
  'sterling',
  'delgado',
  'navarro',
  'oyelaran',
  'amankwah',
  'bautista',
  'mahoe',
  'iyer',
] as const;

export const suggestedGivenNamesVNext = GIVEN.map((token) => ({
  id: `roster_given_name_${token}`,
  nameKey: `programWorld.roster.given.${token}`,
}));
export const suggestedFamilyNamesVNext = FAMILY.map((token) => ({
  id: `roster_family_name_${token}`,
  nameKey: `programWorld.roster.family.${token}`,
}));

/** Every name a suggestion can use: the roster pool plus the M12 additions. */
export const suggestionNamePoolVNext = {
  given: [...programContent.rosterGivenNames, ...suggestedGivenNamesVNext],
  family: [...programContent.rosterFamilyNames, ...suggestedFamilyNamesVNext],
};
