// Normalize nationality strings to a canonical English form.
//
// The wizard accepts free-text + autocomplete, so users can type
// "Казахстан" (Cyrillic), "kazakhstan" (lowercase), or "Kazakhstan"
// (canonical). The brief generator's cultural-context lens needs a
// single form to key on. Without normalization, "Казахстан" would
// fall through to the "first_global_step" default instead of
// "first_to_leave_home" for the CIS framing.
//
// Audience-focused: only the ~30 nationalities we actually see in
// production are mapped explicitly. Anything else passes through
// unchanged.

const MAP: Record<string, string> = {
  // CIS
  "kazakhstan": "Kazakhstan", "казахстан": "Kazakhstan",
  "kyrgyzstan": "Kyrgyzstan", "кыргызстан": "Kyrgyzstan", "киргизия": "Kyrgyzstan",
  "uzbekistan": "Uzbekistan", "узбекистан": "Uzbekistan",
  "tajikistan": "Tajikistan", "таджикистан": "Tajikistan",
  "turkmenistan": "Turkmenistan", "туркменистан": "Turkmenistan",
  "russia": "Russia", "россия": "Russia",
  "belarus": "Belarus", "беларусь": "Belarus", "белоруссия": "Belarus",
  "ukraine": "Ukraine", "украина": "Ukraine",
  "moldova": "Moldova", "молдова": "Moldova", "молдавия": "Moldova",
  "georgia": "Georgia", "грузия": "Georgia",
  "armenia": "Armenia", "армения": "Armenia",
  "azerbaijan": "Azerbaijan", "азербайджан": "Azerbaijan",
  // MENA
  "türkiye": "Türkiye", "turkey": "Türkiye", "турция": "Türkiye",
  "iran": "Iran", "иран": "Iran",
  "egypt": "Egypt", "египет": "Egypt",
  "morocco": "Morocco", "марокко": "Morocco",
  "jordan": "Jordan", "иордания": "Jordan",
  "uae": "UAE", "оаэ": "UAE",
  // English-canonicals that show up via the autocomplete.
  "usa": "USA", "united states": "USA", "united states of america": "USA", "сша": "USA",
  "uk": "UK", "united kingdom": "UK", "великобритания": "UK",
  "canada": "Canada", "канада": "Canada",
  "germany": "Germany", "германия": "Germany",
  "china": "China", "китай": "China",
  "india": "India", "индия": "India",
  "nigeria": "Nigeria", "нигерия": "Nigeria",
  "kenya": "Kenya", "кения": "Kenya",
  "ghana": "Ghana", "гана": "Ghana",
  "vietnam": "Vietnam", "вьетнам": "Vietnam",
  "indonesia": "Indonesia", "индонезия": "Indonesia",
  "philippines": "Philippines", "филиппины": "Philippines",
  "mexico": "Mexico", "мексика": "Mexico",
  "brazil": "Brazil", "бразилия": "Brazil",
  "colombia": "Colombia", "колумбия": "Colombia",
  "peru": "Peru", "перу": "Peru",
  "argentina": "Argentina", "аргентина": "Argentina",
};

/** Normalize a free-text nationality string to its canonical English
 *  form. Unknown inputs pass through unchanged so downstream lookups
 *  can still try them. Null/empty returns null. */
export function normalizeNationality(input: string | null | undefined): string | null {
  if (!input) return null;
  const key = input.trim().toLowerCase();
  if (!key) return null;
  return MAP[key] ?? input.trim();
}
