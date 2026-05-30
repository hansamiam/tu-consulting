// Discover RU localization helpers.
//
// Discover's profile preview + filter chips show user-facing strings
// (country, degree, field) that originate from EN-only data sources
// (countries.ts, FIELDS, scholarshipFields.ts). On the /discover/ru
// page these leak through untranslated. This module is the canonical
// EN→RU lookup for those strings; callers pass the active language
// and get a localized label back.
//
// Falls back to the English value when no RU translation is
// configured — better than rendering an empty cell or a fallback
// like "—" that obscures the data.

export type Language = "en" | "ru";

const COUNTRY_NAME_RU: Record<string, string> = {
  "Kazakhstan": "Казахстан",
  "Russia": "Россия",
  "Uzbekistan": "Узбекистан",
  "Kyrgyzstan": "Кыргызстан",
  "Tajikistan": "Таджикистан",
  "Turkmenistan": "Туркменистан",
  "Azerbaijan": "Азербайджан",
  "Armenia": "Армения",
  "Georgia": "Грузия",
  "Belarus": "Беларусь",
  "Ukraine": "Украина",
  "Moldova": "Молдова",
  "United States": "США",
  "United Kingdom": "Великобритания",
  "Canada": "Канада",
  "Australia": "Австралия",
  "New Zealand": "Новая Зеландия",
  "Germany": "Германия",
  "France": "Франция",
  "Netherlands": "Нидерланды",
  "Belgium": "Бельгия",
  "Switzerland": "Швейцария",
  "Sweden": "Швеция",
  "Norway": "Норвегия",
  "Denmark": "Дания",
  "Finland": "Финляндия",
  "Italy": "Италия",
  "Spain": "Испания",
  "Portugal": "Португалия",
  "Ireland": "Ирландия",
  "Austria": "Австрия",
  "Poland": "Польша",
  "Czech Republic": "Чехия",
  "Czechia": "Чехия",
  "Hungary": "Венгрия",
  "Greece": "Греция",
  "Türkiye": "Турция",
  "Turkey": "Турция",
  "Singapore": "Сингапур",
  "South Korea": "Южная Корея",
  "Korea, Republic of": "Южная Корея",
  "Japan": "Япония",
  "Hong Kong": "Гонконг",
  "China": "Китай",
  "India": "Индия",
  "Vietnam": "Вьетнам",
  "Indonesia": "Индонезия",
  "Malaysia": "Малайзия",
  "Thailand": "Таиланд",
  "Philippines": "Филиппины",
  "Nigeria": "Нигерия",
  "South Africa": "ЮАР",
  "Egypt": "Египет",
  "Saudi Arabia": "Саудовская Аравия",
  "United Arab Emirates": "ОАЭ",
  "Israel": "Израиль",
  "Brazil": "Бразилия",
  "Mexico": "Мексика",
  "Argentina": "Аргентина",
  "Chile": "Чили",
  "Colombia": "Колумбия",
};

const DEGREE_LABEL_RU: Record<string, string> = {
  "bachelor": "Бакалавриат",
  "bachelors": "Бакалавриат",
  "bachelor's": "Бакалавриат",
  "undergrad": "Бакалавриат",
  "undergraduate": "Бакалавриат",
  "master": "Магистратура",
  "masters": "Магистратура",
  "master's": "Магистратура",
  "graduate": "Магистратура",
  "phd": "PhD",
  "doctorate": "PhD",
  "doctoral": "PhD",
  "mba": "MBA",
  "diploma": "Диплом",
  "certificate": "Сертификат",
  "non_degree": "Без степени",
  "non-degree": "Без степени",
};

const FIELD_LABEL_RU: Record<string, string> = {
  "Computer Science & IT": "Информатика и ИТ",
  "Business & Management": "Бизнес и менеджмент",
  "Engineering": "Инженерия",
  "Medicine & Health": "Медицина и здоровье",
  "Natural Sciences": "Естественные науки",
  "Social Sciences": "Социальные науки",
  "Arts & Humanities": "Искусство и гуманитарные",
  "Law": "Право",
  "Undecided": "Ещё не выбрал(а)",
  "Architecture": "Архитектура",
  "Economics": "Экономика",
  "Education": "Образование",
  "Environmental Studies": "Экология",
  "Psychology": "Психология",
  "Public Policy": "Государственная политика",
};

export function localizeCountry(raw: string | null | undefined, lang: Language): string {
  if (!raw) return "";
  if (lang === "en") return raw;
  return COUNTRY_NAME_RU[raw] ?? raw;
}

export function localizeDegree(raw: string | null | undefined, lang: Language): string {
  if (!raw) return "";
  if (lang === "en") return raw;
  return DEGREE_LABEL_RU[raw.toLowerCase().trim()] ?? raw;
}

export function localizeField(raw: string | null | undefined, lang: Language): string {
  if (!raw) return "";
  if (lang === "en") return raw;
  return FIELD_LABEL_RU[raw.trim()] ?? raw;
}
