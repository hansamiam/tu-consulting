/* Comprehensive country list (UN members + commonly recognised territories).
 *
 * Single source of truth — used by:
 *   · Discover wizard step 1 (where-are-you-from typeahead)
 *   · TopUni AI intake step 2 (target-countries multi-select)
 *   · Future surfaces that need a country picker
 *
 * `flag` is a Unicode emoji rendering of the regional indicator pair —
 * works everywhere except some older Windows fonts (where it falls back
 * to letters, which still reads fine). */
export interface Country { v: string; f: string }

export const POPULAR_COUNTRIES: Country[] = [
  { v: "Kazakhstan", f: "🇰🇿" }, { v: "Russia", f: "🇷🇺" },
  { v: "Uzbekistan", f: "🇺🇿" }, { v: "China", f: "🇨🇳" },
  { v: "India", f: "🇮🇳" }, { v: "Nigeria", f: "🇳🇬" },
  { v: "Indonesia", f: "🇮🇩" }, { v: "Vietnam", f: "🇻🇳" },
];

/* Common scholarship-destination countries — used as the default chip list
 * in the TopUni AI intake's "target countries" multi-select. Search input
 * filters across the full ALL_COUNTRIES list when the user types. */
export const POPULAR_DESTINATIONS: Country[] = [
  { v: "United States", f: "🇺🇸" }, { v: "United Kingdom", f: "🇬🇧" },
  { v: "Canada", f: "🇨🇦" }, { v: "Australia", f: "🇦🇺" },
  { v: "Germany", f: "🇩🇪" }, { v: "France", f: "🇫🇷" },
  { v: "Netherlands", f: "🇳🇱" }, { v: "Switzerland", f: "🇨🇭" },
  { v: "Sweden", f: "🇸🇪" }, { v: "Norway", f: "🇳🇴" },
  { v: "Singapore", f: "🇸🇬" }, { v: "South Korea", f: "🇰🇷" },
  { v: "Japan", f: "🇯🇵" }, { v: "Hong Kong", f: "🇭🇰" },
  { v: "China", f: "🇨🇳" }, { v: "Ireland", f: "🇮🇪" },
];

export const ALL_COUNTRIES: Country[] = [
  { v: "Afghanistan", f: "🇦🇫" }, { v: "Albania", f: "🇦🇱" }, { v: "Algeria", f: "🇩🇿" },
  { v: "Andorra", f: "🇦🇩" }, { v: "Angola", f: "🇦🇴" }, { v: "Argentina", f: "🇦🇷" },
  { v: "Armenia", f: "🇦🇲" }, { v: "Australia", f: "🇦🇺" }, { v: "Austria", f: "🇦🇹" },
  { v: "Azerbaijan", f: "🇦🇿" }, { v: "Bahamas", f: "🇧🇸" }, { v: "Bahrain", f: "🇧🇭" },
  { v: "Bangladesh", f: "🇧🇩" }, { v: "Barbados", f: "🇧🇧" }, { v: "Belarus", f: "🇧🇾" },
  { v: "Belgium", f: "🇧🇪" }, { v: "Belize", f: "🇧🇿" }, { v: "Benin", f: "🇧🇯" },
  { v: "Bhutan", f: "🇧🇹" }, { v: "Bolivia", f: "🇧🇴" }, { v: "Bosnia and Herzegovina", f: "🇧🇦" },
  { v: "Botswana", f: "🇧🇼" }, { v: "Brazil", f: "🇧🇷" }, { v: "Brunei", f: "🇧🇳" },
  { v: "Bulgaria", f: "🇧🇬" }, { v: "Burkina Faso", f: "🇧🇫" }, { v: "Burundi", f: "🇧🇮" },
  { v: "Cambodia", f: "🇰🇭" }, { v: "Cameroon", f: "🇨🇲" }, { v: "Canada", f: "🇨🇦" },
  { v: "Cape Verde", f: "🇨🇻" }, { v: "Chad", f: "🇹🇩" }, { v: "Chile", f: "🇨🇱" },
  { v: "China", f: "🇨🇳" }, { v: "Colombia", f: "🇨🇴" }, { v: "Comoros", f: "🇰🇲" },
  { v: "Costa Rica", f: "🇨🇷" }, { v: "Croatia", f: "🇭🇷" }, { v: "Cuba", f: "🇨🇺" },
  { v: "Cyprus", f: "🇨🇾" }, { v: "Czech Republic", f: "🇨🇿" }, { v: "Denmark", f: "🇩🇰" },
  { v: "Djibouti", f: "🇩🇯" }, { v: "Dominican Republic", f: "🇩🇴" }, { v: "Ecuador", f: "🇪🇨" },
  { v: "Egypt", f: "🇪🇬" }, { v: "El Salvador", f: "🇸🇻" }, { v: "Equatorial Guinea", f: "🇬🇶" },
  { v: "Eritrea", f: "🇪🇷" }, { v: "Estonia", f: "🇪🇪" }, { v: "Eswatini", f: "🇸🇿" },
  { v: "Ethiopia", f: "🇪🇹" }, { v: "Fiji", f: "🇫🇯" }, { v: "Finland", f: "🇫🇮" },
  { v: "France", f: "🇫🇷" }, { v: "Gabon", f: "🇬🇦" }, { v: "Gambia", f: "🇬🇲" },
  { v: "Georgia", f: "🇬🇪" }, { v: "Germany", f: "🇩🇪" }, { v: "Ghana", f: "🇬🇭" },
  { v: "Greece", f: "🇬🇷" }, { v: "Guatemala", f: "🇬🇹" }, { v: "Guinea", f: "🇬🇳" },
  { v: "Guyana", f: "🇬🇾" }, { v: "Haiti", f: "🇭🇹" }, { v: "Honduras", f: "🇭🇳" },
  { v: "Hong Kong", f: "🇭🇰" }, { v: "Hungary", f: "🇭🇺" }, { v: "Iceland", f: "🇮🇸" },
  { v: "India", f: "🇮🇳" }, { v: "Indonesia", f: "🇮🇩" }, { v: "Iran", f: "🇮🇷" },
  { v: "Iraq", f: "🇮🇶" }, { v: "Ireland", f: "🇮🇪" }, { v: "Israel", f: "🇮🇱" },
  { v: "Italy", f: "🇮🇹" }, { v: "Ivory Coast", f: "🇨🇮" }, { v: "Jamaica", f: "🇯🇲" },
  { v: "Japan", f: "🇯🇵" }, { v: "Jordan", f: "🇯🇴" }, { v: "Kazakhstan", f: "🇰🇿" },
  { v: "Kenya", f: "🇰🇪" }, { v: "Kuwait", f: "🇰🇼" }, { v: "Kyrgyzstan", f: "🇰🇬" },
  { v: "Laos", f: "🇱🇦" }, { v: "Latvia", f: "🇱🇻" }, { v: "Lebanon", f: "🇱🇧" },
  { v: "Lesotho", f: "🇱🇸" }, { v: "Liberia", f: "🇱🇷" }, { v: "Libya", f: "🇱🇾" },
  { v: "Liechtenstein", f: "🇱🇮" }, { v: "Lithuania", f: "🇱🇹" }, { v: "Luxembourg", f: "🇱🇺" },
  { v: "Madagascar", f: "🇲🇬" }, { v: "Malawi", f: "🇲🇼" }, { v: "Malaysia", f: "🇲🇾" },
  { v: "Maldives", f: "🇲🇻" }, { v: "Mali", f: "🇲🇱" }, { v: "Malta", f: "🇲🇹" },
  { v: "Mauritania", f: "🇲🇷" }, { v: "Mauritius", f: "🇲🇺" }, { v: "Mexico", f: "🇲🇽" },
  { v: "Moldova", f: "🇲🇩" }, { v: "Monaco", f: "🇲🇨" }, { v: "Mongolia", f: "🇲🇳" },
  { v: "Montenegro", f: "🇲🇪" }, { v: "Morocco", f: "🇲🇦" }, { v: "Mozambique", f: "🇲🇿" },
  { v: "Myanmar", f: "🇲🇲" }, { v: "Namibia", f: "🇳🇦" }, { v: "Nepal", f: "🇳🇵" },
  { v: "Netherlands", f: "🇳🇱" }, { v: "New Zealand", f: "🇳🇿" }, { v: "Nicaragua", f: "🇳🇮" },
  { v: "Niger", f: "🇳🇪" }, { v: "Nigeria", f: "🇳🇬" }, { v: "North Korea", f: "🇰🇵" },
  { v: "North Macedonia", f: "🇲🇰" }, { v: "Norway", f: "🇳🇴" }, { v: "Oman", f: "🇴🇲" },
  { v: "Pakistan", f: "🇵🇰" }, { v: "Palestine", f: "🇵🇸" }, { v: "Panama", f: "🇵🇦" },
  { v: "Papua New Guinea", f: "🇵🇬" }, { v: "Paraguay", f: "🇵🇾" }, { v: "Peru", f: "🇵🇪" },
  { v: "Philippines", f: "🇵🇭" }, { v: "Poland", f: "🇵🇱" }, { v: "Portugal", f: "🇵🇹" },
  { v: "Qatar", f: "🇶🇦" }, { v: "Romania", f: "🇷🇴" }, { v: "Russia", f: "🇷🇺" },
  { v: "Rwanda", f: "🇷🇼" }, { v: "Saudi Arabia", f: "🇸🇦" }, { v: "Senegal", f: "🇸🇳" },
  { v: "Serbia", f: "🇷🇸" }, { v: "Sierra Leone", f: "🇸🇱" }, { v: "Singapore", f: "🇸🇬" },
  { v: "Slovakia", f: "🇸🇰" }, { v: "Slovenia", f: "🇸🇮" }, { v: "Somalia", f: "🇸🇴" },
  { v: "South Africa", f: "🇿🇦" }, { v: "South Korea", f: "🇰🇷" }, { v: "South Sudan", f: "🇸🇸" },
  { v: "Spain", f: "🇪🇸" }, { v: "Sri Lanka", f: "🇱🇰" }, { v: "Sudan", f: "🇸🇩" },
  { v: "Sweden", f: "🇸🇪" }, { v: "Switzerland", f: "🇨🇭" }, { v: "Syria", f: "🇸🇾" },
  { v: "Taiwan", f: "🇹🇼" }, { v: "Tajikistan", f: "🇹🇯" }, { v: "Tanzania", f: "🇹🇿" },
  { v: "Thailand", f: "🇹🇭" }, { v: "Togo", f: "🇹🇬" }, { v: "Tunisia", f: "🇹🇳" },
  { v: "Turkey", f: "🇹🇷" }, { v: "Turkmenistan", f: "🇹🇲" }, { v: "Uganda", f: "🇺🇬" },
  { v: "Ukraine", f: "🇺🇦" }, { v: "United Arab Emirates", f: "🇦🇪" }, { v: "United Kingdom", f: "🇬🇧" },
  { v: "United States", f: "🇺🇸" }, { v: "Uruguay", f: "🇺🇾" }, { v: "Uzbekistan", f: "🇺🇿" },
  { v: "Venezuela", f: "🇻🇪" }, { v: "Vietnam", f: "🇻🇳" }, { v: "Yemen", f: "🇾🇪" },
  { v: "Zambia", f: "🇿🇲" }, { v: "Zimbabwe", f: "🇿🇼" },
];
