#!/usr/bin/env python3
"""
Parse the Manus AI "Comprehensive Global Scholarship Guide" markdown
into a SQL migration that loads ~221 rows into scholarships_research_intake.

The markdown uses three different formats across categories — this parser
is deliberately lenient about labels, separators, and ordering.

Usage:
    python3 scripts/parse_manus_report.py \
      --input  /tmp/scholarship-research/Global_Scholarship_Guide_Final.md \
      --output supabase/migrations/<TS>_load_manus_research_intake.sql \
      --source manus_ai_2026_05_03
"""

import argparse
import json
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Optional

# ───── Field label canonicalisation ──────────────────────────────────
LABEL_PATTERNS = {
    "name":        re.compile(r"^scholarship\s*name$", re.I),
    "org":         re.compile(r"^offering\s*country\s*[/\-\\]?\s*organi[sz]ation$", re.I),
    "levels":      re.compile(r"^eligible\s*education\s*levels?$", re.I),
    "regions":     re.compile(r"^eligible\s*nationalit(?:y|ies)\s*(?:or|/)\s*regions?$", re.I),
    "coverage":    re.compile(r"^coverage$", re.I),
    "awards":      re.compile(r"^annual\s*number\s*of\s*awards$", re.I),
    "criteria":    re.compile(r"^(?:key\s+)?eligibility\s*criteria$", re.I),
    "deadline":    re.compile(r"^application\s*deadline$", re.I),
    "url":         re.compile(r"^official\s*website\s*url$", re.I),
}

# Lines that mark a new scholarship entry inside a category section
LINE_SCHOLARSHIP_HEADER_NUMBERED_H3 = re.compile(r"^###\s+\d+\.\s+(.+?)\s*$")
LINE_LABELED_NAME = re.compile(
    # Strip `* `, `- `, `1. `, `**`, then match `Scholarship Name:` (with the colon
    # possibly inside the closing `**`), then capture the value.
    r"^[\s\*\-•]*(?:\d+[.)]\s*)?\**\s*scholarship\s*name\s*[:\-—]?\s*\**\s*[:\-—]?\s*(.+?)\s*\**\s*$",
    re.I,
)

def _norm_name(s: str) -> str:
    """Lowercase, strip punctuation/markdown, used for de-dup matching."""
    return re.sub(r"[^a-z0-9 ]+", "", (s or "").lower()).strip()

# ───── Field-line splitter ────────────────────────────────────────────
# Strips list markers, bullets, leading numbers, bold/italic, and trailing
# footnote refs like "[6]". Returns (label_lower, value) or None.
LIST_PREFIX_RE   = re.compile(r"^[\s\*\-•]*(?:\d+[.)]\s+)?")
BOLD_WRAP_RE     = re.compile(r"^\*\*(.+?)\*\*\s*$")
LABEL_VALUE_RE   = re.compile(r"^([A-Za-z][A-Za-z /\-\\]{2,80}?)\s*[:\-—]\s*(.*)$")
FOOTNOTE_RE      = re.compile(r"\s*\[\d+\]\s*$")
URL_MARKDOWN_RE  = re.compile(r"\[[^\]]+\]\(\s*(https?://[^)\s]+)\s*\)")

def parse_field_line(line: str) -> Optional[tuple[str, str]]:
    raw = line.rstrip()
    if not raw.strip():
        return None
    # Strip list / bullet prefix
    raw = LIST_PREFIX_RE.sub("", raw).strip()
    # Strip leading **bold** wrapping that contains the WHOLE line (not the label)
    # Actually we want to preserve "**Label:**" structure for the regex below.
    if not raw or raw.startswith("#"):
        return None
    m = LABEL_VALUE_RE.match(raw.replace("**", ""))
    if not m:
        return None
    label_raw = m.group(1).strip()
    val = m.group(2).strip()
    val = FOOTNOTE_RE.sub("", val).strip()
    label_lower = label_raw.lower()
    for canon, pat in LABEL_PATTERNS.items():
        if pat.match(label_lower):
            return canon, val
    return None

# ───── Normalisers ────────────────────────────────────────────────────
DEGREE_KEYWORDS = [
    ("phd",          ["phd", "doctorate", "doctoral", "ph.d", "research doctorate"]),
    ("master",       ["master", "msc", "mphil", "ma ", "ma,", "graduate", "postgraduate"]),
    ("bachelor",     ["bachelor", "undergraduate", "ba ", "bsc"]),
    ("non_degree",   ["short course", "internship", "non-degree", "professional"]),
]

def parse_degree_levels(text: str) -> list[str]:
    if not text: return []
    t = text.lower()
    out = []
    for canon, kws in DEGREE_KEYWORDS:
        if any(kw in t for kw in kws):
            out.append(canon)
    return out

def is_developed_country_only(text: str) -> bool:
    """True if regions text suggests LMIC-only / dev-country-only."""
    if not text: return False
    t = text.lower()
    return bool(re.search(r"\bdeveloping\b|\blow.income\b|\blmic\b|\blow.\s*and\s*middle.income\b", t))

COUNTRY_LIST_RE = re.compile(
    r"\b(Afghanistan|Algeria|Angola|Argentina|Armenia|Australia|Azerbaijan|Bangladesh|Belize|Benin|Bhutan|Bolivia|Botswana|Brazil|Brunei|Burkina Faso|Burundi|Cambodia|Cameroon|Cape Verde|Chad|Chile|China|Colombia|Comoros|Costa Rica|Cuba|Djibouti|Dominica|Dominican Republic|DR Congo|Ecuador|Egypt|El Salvador|Eritrea|Ethiopia|Fiji|Gambia|Georgia|Ghana|Guatemala|Guinea|Guyana|Haiti|Honduras|India|Indonesia|Iran|Iraq|Jamaica|Jordan|Kazakhstan|Kenya|Kiribati|Kosovo|Kyrgyz(?:stan)?|Laos|Lebanon|Lesotho|Liberia|Libya|Madagascar|Malawi|Malaysia|Maldives|Mali|Marshall Islands|Mauritania|Mauritius|Mexico|Micronesia|Moldova|Mongolia|Montenegro|Morocco|Mozambique|Myanmar|Namibia|Nauru|Nepal|Nicaragua|Niger|Nigeria|North Macedonia|Pakistan|Palau|Palestine|Panama|Papua New Guinea|Paraguay|Peru|Philippines|Rwanda|Samoa|Senegal|Serbia|Sierra Leone|Solomon Islands|Somalia|South Africa|South Sudan|Sri Lanka|St\.? Lucia|Sudan|Suriname|Syria|Tajikistan|Tanzania|Thailand|Timor.Leste|Togo|Tonga|Tunisia|Turkey|Türkiye|Turkmenistan|Tuvalu|Uganda|Ukraine|Uruguay|Uzbekistan|Vanuatu|Venezuela|Vietnam|Yemen|Zambia|Zimbabwe)\b"
)

def parse_eligible_countries(text: str) -> list[str]:
    if not text: return []
    seen = []
    for m in COUNTRY_LIST_RE.finditer(text):
        c = m.group(1)
        # canonicalise a few
        c = c.replace("Türkiye", "Turkey").replace("Timor.Leste", "Timor-Leste")
        if c.lower().startswith("kyrgyz"): c = "Kyrgyzstan"
        if c not in seen:
            seen.append(c)
    return seen

# Map "Offering Country/Organization" string → host_country (best effort).
HOST_COUNTRY_HINTS = {
    # Multilateral / supranational FIRST so "World Bank (funded by Japan)"
    # doesn't get tagged as Japan.
    "world bank":    "Global",
    "imf":           "Global",
    "united nations":"Global",
    "unesco":        "Global",
    "unicef":        "Global",
    "wto":           "Global",
    "oecd":          "Global",
    "european union":"European Union",
    "european commission":"European Union",
    "erasmus mundus":"European Union",
    "african union": "Multiple (Africa)",
    "aga khan":      "Multiple",
    # Then country hints
    "us government": "United States",
    "u.s. government": "United States",
    "united states": "United States",
    "us department": "United States",
    "uk government": "United Kingdom",
    "uk-":           "United Kingdom",
    "british":       "United Kingdom",
    "canadian":      "Canada",
    "canada":        "Canada",
    "australia":     "Australia",
    "new zealand":   "New Zealand",
    "german":        "Germany",
    "germany":       "Germany",
    "france":        "France",
    "french":        "France",
    "swedish":       "Sweden",
    "sweden":        "Sweden",
    "norway":        "Norway",
    "norwegian":     "Norway",
    "danish":        "Denmark",
    "denmark":       "Denmark",
    "finland":       "Finland",
    "finnish":       "Finland",
    "japan":         "Japan",
    "japanese":      "Japan",
    "china":         "China",
    "chinese":       "China",
    "south korea":   "South Korea",
    "korean":        "South Korea",
    "singapore":     "Singapore",
    "switzerland": "Switzerland",
    "swiss": "Switzerland",
    "netherlands": "Netherlands",
    "dutch": "Netherlands",
    "spain": "Spain",
    "spanish": "Spain",
    "italy": "Italy",
    "italian": "Italy",
    "ireland": "Ireland",
    "irish": "Ireland",
    "belgium": "Belgium",
    "belgian": "Belgium",
    "india": "India",
    "indian": "India",
    "indonesia": "Indonesia",
    "iran": "Iran",
    "uae": "United Arab Emirates",
    "saudi": "Saudi Arabia",
    "qatar": "Qatar",
    "kuwait": "Kuwait",
    "south africa": "South Africa",
    "africa": "Multiple (Africa)",
    "czech": "Czech Republic",
    "hungar": "Hungary",
    "poland": "Poland",
    "polish": "Poland",
    "russia": "Russia",
    "turkey": "Turkey",
    "türkiye": "Turkey",
    "israel": "Israel",
    "israeli": "Israel",
    "brazil": "Brazil",
    "mexic": "Mexico",
    "egypt": "Egypt",
    "estonia": "Estonia",
    "lithuania": "Lithuania",
    "latvia": "Latvia",
    "iceland": "Iceland",
    "hong kong": "Hong Kong",
    "taiwan": "Taiwan",
    "thailand": "Thailand",
    "malaysia": "Malaysia",
}

def guess_host_country(org_text: str) -> Optional[str]:
    if not org_text: return None
    t = org_text.lower()
    for hint, country in HOST_COUNTRY_HINTS.items():
        if hint in t:
            return country
    return None

# Coverage type heuristic
COVERAGE_FULL = re.compile(r"\bfull(?:ly)?\b.*\b(?:fund|cover|tuition.*living|tuition.*stipend|scholarship|ride)\b|\bfull tuition\b.*\bliving\b|\bfull tuition\b.*\bstipend\b", re.I)
COVERAGE_TUITION = re.compile(r"\btuition\b", re.I)

def parse_coverage_type(text: str) -> str:
    if not text: return "stipend"
    if COVERAGE_FULL.search(text): return "full_ride"
    if COVERAGE_TUITION.search(text): return "tuition_only"
    return "stipend"

# Estimate total USD value (very rough — only when explicit USD/EUR/GBP given)
USD_RE  = re.compile(r"\$\s*([\d,]+)\s*(k|m|million|thousand|usd|us\$)?", re.I)
EUR_RE  = re.compile(r"(?:€|eur)\s*([\d,]+)", re.I)
GBP_RE  = re.compile(r"(?:£|gbp)\s*([\d,]+)", re.I)
SEK_RE  = re.compile(r"sek\s*([\d,]+)", re.I)

def parse_value_usd(text: str) -> Optional[float]:
    if not text: return None
    # Try USD first
    m = USD_RE.search(text)
    if m:
        n = float(m.group(1).replace(",", ""))
        suf = (m.group(2) or "").lower()
        if suf in ("k", "thousand"): n *= 1000
        elif suf in ("m", "million"): n *= 1_000_000
        return n
    m = EUR_RE.search(text)
    if m:
        return float(m.group(1).replace(",", "")) * 1.07  # rough EUR→USD
    m = GBP_RE.search(text)
    if m:
        return float(m.group(1).replace(",", "")) * 1.27
    return None

# Parse first deadline date out of a free-text deadline string.
# Returns ISO YYYY-MM-DD or None.
DATE_PATTERNS = [
    re.compile(r"\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})\b", re.I),
    re.compile(r"\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})\b", re.I),
    re.compile(r"\b(\d{4})-(\d{2})-(\d{2})\b"),
]
MONTHS = {m.lower(): i+1 for i, m in enumerate([
    "January","February","March","April","May","June","July","August","September","October","November","December"
])}

def parse_deadline_date(text: str) -> Optional[str]:
    if not text: return None
    for pat in DATE_PATTERNS:
        m = pat.search(text)
        if not m: continue
        try:
            if pat.pattern.startswith(r"\b(\d{4})"):
                y, mo, d = int(m.group(1)), int(m.group(2)), int(m.group(3))
            elif "January" in pat.pattern.split(")")[1] or pat.pattern.startswith(r"\b(\d{1,2})"):
                d, mon, y = int(m.group(1)), MONTHS[m.group(2).lower()], int(m.group(3))
                mo = mon
            else:
                mon, d, y = MONTHS[m.group(1).lower()], int(m.group(2)), int(m.group(3))
                mo = mon
            return f"{y:04d}-{mo:02d}-{d:02d}"
        except Exception:
            continue
    return None

def parse_deadline_type(text: str) -> Optional[str]:
    if not text: return None
    t = text.lower()
    if "rolling" in t: return "rolling"
    if "varies" in t or "various" in t or "multiple" in t: return "varies"
    if "annual" in t: return "annual"
    if "not specified" in t or "not provided" in t: return None
    return "fixed"

# Normalize URL out of either a bare URL string or a markdown link.
def parse_url(text: str) -> Optional[str]:
    if not text: return None
    m = URL_MARKDOWN_RE.search(text)
    if m: return m.group(1)
    m = re.search(r"https?://\S+", text)
    if m: return m.group(0).rstrip(").,;]")
    if "not specified" in text.lower(): return None
    return text.strip() or None

# ───── Main parser ────────────────────────────────────────────────────
def parse_markdown(md: str) -> list[dict]:
    """Yield one dict per scholarship found."""
    lines = md.split("\n")
    out = []
    current_category: Optional[str] = None
    cur: dict = {}

    def flush():
        if cur and cur.get("name"):
            cur["category"] = current_category
            out.append(cur.copy())
        cur.clear()

    for raw_line in lines:
        line = raw_line.rstrip()

        # Major section header — `## Detailed Scholarship Listings...` etc. Skip.
        if re.match(r"^##\s+", line) and not line.startswith("###"):
            flush()
            continue

        # Category header like `### USA-based scholarships`
        if line.startswith("### ") and not LINE_SCHOLARSHIP_HEADER_NUMBERED_H3.match(line):
            flush()
            current_category = line[4:].strip()
            # Skip 3+ word category line. Keep last ### scholarship name even if duplicate
            # (handled by "### N. Name" branch below).
            # Heuristic: if header CONTAINS "scholarship" early but is the category,
            # we still treat as category. Format-B sections also have a ## sub-heading
            # before the ### N. ... lines.
            continue

        # Format B: ### N. Scholarship Name (the H3 IS the entry name)
        m = LINE_SCHOLARSHIP_HEADER_NUMBERED_H3.match(line)
        if m:
            flush()
            cur["name"] = m.group(1).strip().rstrip(":").strip()
            continue

        # Format A & C: a labeled "Scholarship name: X" line begins a new entry.
        m = LINE_LABELED_NAME.match(line)
        if m:
            new_name = m.group(1).strip().rstrip(".").strip().lstrip("*").strip()
            new_norm = _norm_name(new_name)
            cur_norm = _norm_name(cur.get("name") or "")
            # Format B duplicate suppression: when the H3 just set a name, the
            # `Scholarship Name:` line is often a (longer or shorter) restating
            # of the same name. Treat as the same entry if either is a
            # substring of the other.
            if cur.get("name"):
                if new_norm == cur_norm or (new_norm and cur_norm and (new_norm in cur_norm or cur_norm in new_norm)):
                    # Prefer the longer / more contextual name (usually the H3
                    # since it includes the org prefix like "DAAD ..." )
                    if len(new_name) > len(cur["name"]):
                        cur["name"] = new_name
                    continue
                # Different name → genuinely a new entry. Flush previous.
                flush()
            cur["name"] = new_name
            continue

        # Field lines
        kv = parse_field_line(line)
        if kv:
            field, val = kv
            # If we get a scholarship_name field but no current entry yet,
            # start a new entry.
            if field == "name" and cur.get("name"):
                flush()
                cur["name"] = val
                continue
            if field == "name":
                cur["name"] = val
            else:
                cur[field] = val
            continue

        # Non-field continuation lines: append to last field if it exists.
        # Skip section separators like "---" / "***" — they shouldn't get
        # absorbed into the previous field.
        if cur and cur.get("name") and line.strip() and not line.startswith("#"):
            stripped = line.strip()
            if re.match(r"^[\-\*_]{3,}$", stripped):
                # Section break — flush the current entry
                flush()
                continue
            for f in reversed(["criteria", "coverage", "regions", "deadline", "awards", "levels", "url", "org"]):
                if f in cur and cur[f]:
                    cur[f] += " " + stripped
                    break

    flush()
    return out

# ───── SQL generation ─────────────────────────────────────────────────
def sql_escape(s: Optional[str]) -> str:
    if s is None: return "NULL"
    return "'" + str(s).replace("\\", "\\\\").replace("'", "''") + "'"

def sql_array(arr: list[str]) -> str:
    if not arr: return "NULL"
    return "ARRAY[" + ",".join(sql_escape(x) for x in arr) + "]::text[]"

def sql_num(n) -> str:
    if n is None: return "NULL"
    return str(n)

def sql_bool(b) -> str:
    return "TRUE" if b else "FALSE"

def sql_date(d: Optional[str]) -> str:
    if not d: return "NULL"
    return f"'{d}'::date"

def to_intake_row(rec: dict, source: str) -> dict:
    org = rec.get("org") or ""
    coverage_text = rec.get("coverage") or ""
    deadline_text = rec.get("deadline") or ""
    regions_text = rec.get("regions") or ""

    return {
        "source": source,
        "source_category": rec.get("category"),
        "scholarship_name": rec.get("name"),
        "provider_name": org or None,
        "host_country": guess_host_country(org) or guess_host_country(rec.get("name") or ""),
        "official_url": parse_url(rec.get("url") or ""),
        "coverage_type": parse_coverage_type(coverage_text),
        "award_amount_text": coverage_text or None,
        "estimated_total_value_usd": parse_value_usd(coverage_text),
        "target_degree_level": parse_degree_levels(rec.get("levels") or ""),
        "target_fields": [],
        "eligible_countries": parse_eligible_countries(regions_text),
        "citizenship_requirements": regions_text or None,
        "eligibility_requirements": rec.get("criteria") or None,
        "application_deadline": parse_deadline_date(deadline_text),
        "deadline_type": parse_deadline_type(deadline_text),
        "age_limit": None,
        "selectivity_level": None,
        # raw preservation
        "raw_offering_org":     org or None,
        "raw_education_levels": rec.get("levels") or None,
        "raw_eligibility":      regions_text or None,
        "raw_coverage":         coverage_text or None,
        "raw_annual_awards":    rec.get("awards") or None,
        "raw_criteria":         rec.get("criteria") or None,
        "raw_deadline":         deadline_text or None,
        "raw_url":              rec.get("url") or None,
        # Loadable iff we have name + (URL or deadline or coverage detail)
        "is_loadable": bool(rec.get("name")) and (
            bool(parse_url(rec.get("url") or "")) or
            bool(parse_deadline_date(deadline_text)) or
            len(coverage_text) > 30
        ),
    }

def render_insert(rows: list[dict]) -> str:
    cols = [
        "source","source_category","scholarship_name","provider_name","host_country","official_url",
        "coverage_type","award_amount_text","estimated_total_value_usd",
        "target_degree_level","target_fields","eligible_countries",
        "citizenship_requirements","eligibility_requirements",
        "application_deadline","deadline_type","age_limit","selectivity_level",
        "raw_offering_org","raw_education_levels","raw_eligibility","raw_coverage",
        "raw_annual_awards","raw_criteria","raw_deadline","raw_url",
        "is_loadable",
    ]
    out = []
    out.append("-- ─── Step 2 — Load Manus AI research into intake ───────────")
    out.append("-- Auto-generated by scripts/parse_manus_report.py from")
    out.append("-- /tmp/scholarship-research/Global_Scholarship_Guide_Final.md")
    out.append("-- DO NOT hand-edit; regenerate the migration if the parse changes.")
    out.append("")
    out.append(f"INSERT INTO public.scholarships_research_intake ({', '.join(cols)}) VALUES")

    value_lines = []
    for r in rows:
        vals = [
            sql_escape(r["source"]),
            sql_escape(r["source_category"]),
            sql_escape(r["scholarship_name"]),
            sql_escape(r["provider_name"]),
            sql_escape(r["host_country"]),
            sql_escape(r["official_url"]),
            sql_escape(r["coverage_type"]),
            sql_escape(r["award_amount_text"]),
            sql_num(r["estimated_total_value_usd"]),
            sql_array(r["target_degree_level"]),
            sql_array(r["target_fields"]),
            sql_array(r["eligible_countries"]),
            sql_escape(r["citizenship_requirements"]),
            sql_escape(r["eligibility_requirements"]),
            sql_date(r["application_deadline"]),
            sql_escape(r["deadline_type"]),
            sql_escape(r["age_limit"]),
            sql_escape(r["selectivity_level"]),
            sql_escape(r["raw_offering_org"]),
            sql_escape(r["raw_education_levels"]),
            sql_escape(r["raw_eligibility"]),
            sql_escape(r["raw_coverage"]),
            sql_escape(r["raw_annual_awards"]),
            sql_escape(r["raw_criteria"]),
            sql_escape(r["raw_deadline"]),
            sql_escape(r["raw_url"]),
            sql_bool(r["is_loadable"]),
        ]
        value_lines.append("  (" + ", ".join(vals) + ")")

    out.append(",\n".join(value_lines) + ";")
    return "\n".join(out) + "\n"

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", required=True)
    ap.add_argument("--output", required=True)
    ap.add_argument("--source", required=True, help="provenance tag, e.g. manus_ai_2026_05_03")
    ap.add_argument("--debug-json", help="Optional: also write parsed records as JSON")
    args = ap.parse_args()

    md = Path(args.input).read_text(encoding="utf-8")
    records = parse_markdown(md)

    rows = [to_intake_row(r, args.source) for r in records if r.get("name")]
    # Drop name-only rows where the name is a junk prefix
    JUNK = {"this research", "summary", "the research", "scholarship name"}
    rows = [r for r in rows if r["scholarship_name"].strip().lower() not in JUNK]

    # De-duplicate by normalized name. Manus AI lists the same scholarship
    # in multiple categories (e.g. JJ/WBGSP appears in 4 categories). Keep
    # the version with the most populated fields. Tie-broken by first-seen.
    def completeness_score(r: dict) -> int:
        score = 0
        for f in ("provider_name","host_country","official_url","award_amount_text",
                  "estimated_total_value_usd","application_deadline","deadline_type",
                  "target_degree_level","eligible_countries","eligibility_requirements",
                  "citizenship_requirements"):
            v = r.get(f)
            if v not in (None, "", []): score += 1
        if r.get("is_loadable"): score += 2
        return score

    best: dict[str, dict] = {}
    for r in rows:
        key = _norm_name(r["scholarship_name"])
        prev = best.get(key)
        if prev is None or completeness_score(r) > completeness_score(prev):
            best[key] = r
    rows = list(best.values())

    if args.debug_json:
        Path(args.debug_json).write_text(json.dumps(rows, indent=2, ensure_ascii=False))

    Path(args.output).write_text(render_insert(rows))
    print(f"Parsed {len(records)} records, wrote {len(rows)} intake rows to {args.output}", file=sys.stderr)
    print(f"  loadable: {sum(1 for r in rows if r['is_loadable'])}", file=sys.stderr)
    print(f"  with URL: {sum(1 for r in rows if r['official_url'])}", file=sys.stderr)
    print(f"  with date: {sum(1 for r in rows if r['application_deadline'])}", file=sys.stderr)

if __name__ == "__main__":
    main()
