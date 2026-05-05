-- =============================================================================
-- host_country backfill v2 — broader provider-to-country pattern matching
-- =============================================================================
-- The first backfill (20260505090000) covered ~80 well-known anchors. The user
-- pointed out Brandeis University (USA) still showed no country, and several
-- other rows with US/UK universities slipped through. This pass expands the
-- match list significantly. All UPDATEs are guarded by host_country IS NULL/''
-- so already-set values aren't overwritten.
-- =============================================================================

-- ─── United States — broad university list ───────────────────────────────────
UPDATE public.scholarships SET host_country = 'United States'
  WHERE COALESCE(host_country, '') = '' AND (
    provider_name ILIKE '%Brandeis%'
    OR provider_name ILIKE '%Boston University%' OR provider_name ILIKE '%Boston College%'
    OR provider_name ILIKE '%Tufts%' OR provider_name ILIKE '%Northeastern%'
    OR provider_name ILIKE '%NYU%' OR provider_name ILIKE '%New York University%'
    OR provider_name ILIKE '%University of Pennsylvania%' OR provider_name ILIKE '%UPenn%'
    OR provider_name ILIKE '%Wharton%' OR provider_name ILIKE '%Caltech%'
    OR provider_name ILIKE '%Dartmouth%' OR provider_name ILIKE '%University of Michigan%'
    OR provider_name ILIKE '%University of Virginia%' OR provider_name ILIKE '%UVA%'
    OR provider_name ILIKE '%University of Washington%' OR provider_name ILIKE '%UW Seattle%'
    OR provider_name ILIKE '%University of Texas%' OR provider_name ILIKE '%UT Austin%'
    OR provider_name ILIKE '%Georgia Tech%' OR provider_name ILIKE '%Georgia Institute%'
    OR provider_name ILIKE '%University of Wisconsin%' OR provider_name ILIKE '%Madison%'
    OR provider_name ILIKE '%University of Illinois%' OR provider_name ILIKE '%UIUC%'
    OR provider_name ILIKE '%Purdue%' OR provider_name ILIKE '%Rice University%'
    OR provider_name ILIKE '%Vanderbilt%' OR provider_name ILIKE '%Emory%'
    OR provider_name ILIKE '%Georgetown%' OR provider_name ILIKE '%Notre Dame%'
    OR provider_name ILIKE '%Minnesota%' OR provider_name ILIKE '%Iowa State%'
    OR provider_name ILIKE '%Penn State%' OR provider_name ILIKE '%Pennsylvania State%'
    OR provider_name ILIKE '%Ohio State%' OR provider_name ILIKE '%Florida State%'
    OR provider_name ILIKE '%Texas A&M%' OR provider_name ILIKE '%Rutgers%'
    OR provider_name ILIKE '%University of Maryland%' OR provider_name ILIKE '%Maryland%'
    OR provider_name ILIKE '%Washington University%' OR provider_name ILIKE '%WUSTL%'
    OR provider_name ILIKE '%University of Southern California%' OR provider_name ILIKE '%USC%'
    OR provider_name ILIKE '%Boston University%' OR provider_name ILIKE '%Tufts University%'
    OR provider_name ILIKE '%University of Rochester%' OR provider_name ILIKE '%Pittsburgh%'
    OR provider_name ILIKE '%Cornell University%' OR provider_name ILIKE '%Williams College%'
    OR provider_name ILIKE '%Amherst College%' OR provider_name ILIKE '%Wellesley%'
    OR provider_name ILIKE '%Smith College%' OR provider_name ILIKE '%Mount Holyoke%'
    OR provider_name ILIKE '%Bryn Mawr%' OR provider_name ILIKE '%Swarthmore%'
    OR provider_name ILIKE '%Pomona%' OR provider_name ILIKE '%Claremont%'
    OR provider_name ILIKE '%Davidson%' OR provider_name ILIKE '%Middlebury%'
    OR provider_name ILIKE '%Bowdoin%' OR provider_name ILIKE '%Colby%'
    OR provider_name ILIKE '%Bates%' OR provider_name ILIKE '%Hamilton College%'
    OR provider_name ILIKE '%Vassar%' OR provider_name ILIKE '%Reed College%'
    OR provider_name ILIKE '%Grinnell%' OR provider_name ILIKE '%Carleton%'
    OR provider_name ILIKE '%Macalester%' OR provider_name ILIKE '%Wesleyan%'
    OR provider_name ILIKE '%Haverford%' OR provider_name ILIKE '%Oberlin%'
    OR provider_name ILIKE '%Whitman College%' OR provider_name ILIKE '%Colgate%'
    OR provider_name ILIKE '%Bucknell%' OR provider_name ILIKE '%Lehigh%'
    OR provider_name ILIKE '%University of Florida%' OR provider_name ILIKE '%Miami%'
    OR provider_name ILIKE '%Tulane%' OR provider_name ILIKE '%Boston%'
    OR provider_name ILIKE '%University of Iowa%' OR provider_name ILIKE '%Indiana University%'
    OR provider_name ILIKE '%Michigan State%' OR provider_name ILIKE '%Brigham Young%'
    OR provider_name ILIKE '%University of Notre Dame%'
    OR provider_name ILIKE '%Wien International%'
    OR provider_name ILIKE '%William & Mary%' OR provider_name ILIKE '%William and Mary%'
    OR provider_name ILIKE '%Hopkins%'
    OR provider_name ILIKE '%University of California%' OR provider_name ILIKE '%UC Berkeley%'
    OR provider_name ILIKE '%UC Davis%' OR provider_name ILIKE '%UC Irvine%'
    OR provider_name ILIKE '%UC San Diego%' OR provider_name ILIKE '%UCSD%'
    OR provider_name ILIKE '%UCSB%' OR provider_name ILIKE '%UC Santa%'
    OR provider_name ILIKE '%UCSF%' OR provider_name ILIKE '%University of Notre%'
    OR scholarship_name ILIKE '%Wien International%'
  );

-- ─── United Kingdom — broader ────────────────────────────────────────────────
UPDATE public.scholarships SET host_country = 'United Kingdom'
  WHERE COALESCE(host_country, '') = '' AND (
    provider_name ILIKE '%University of Leeds%' OR provider_name ILIKE '%Glasgow%'
    OR provider_name ILIKE '%University of Birmingham%' OR provider_name ILIKE '%Sheffield%'
    OR provider_name ILIKE '%University of Nottingham%' OR provider_name ILIKE '%Southampton%'
    OR provider_name ILIKE '%University of Exeter%' OR provider_name ILIKE '%University of Bath%'
    OR provider_name ILIKE '%Royal Holloway%' OR provider_name ILIKE '%Queen Mary%'
    OR provider_name ILIKE '%University of York%' OR provider_name ILIKE '%University of Liverpool%'
    OR provider_name ILIKE '%University of St Andrews%' OR provider_name ILIKE '%Durham%'
    OR provider_name ILIKE '%University of Lancaster%' OR provider_name ILIKE '%Newcastle%'
    OR provider_name ILIKE '%Cardiff University%' OR provider_name ILIKE '%University of Surrey%'
    OR provider_name ILIKE '%University of Reading%' OR provider_name ILIKE '%Sussex%'
    OR provider_name ILIKE '%University of East Anglia%' OR provider_name ILIKE '%UEA%'
    OR provider_name ILIKE '%SOAS%' OR provider_name ILIKE '%School of Oriental%'
    OR provider_name ILIKE '%Rhodes Trust%' OR provider_name ILIKE '%Marshall%'
    OR provider_name ILIKE '%Clarendon Fund%'
    OR scholarship_name ILIKE '%Chevening%' OR scholarship_name ILIKE '%Rhodes Schol%'
  );

-- ─── Germany — broader ──────────────────────────────────────────────────────
UPDATE public.scholarships SET host_country = 'Germany'
  WHERE COALESCE(host_country, '') = '' AND (
    provider_name ILIKE '%Goethe-Institut%' OR provider_name ILIKE '%Bayer Foundation%'
    OR provider_name ILIKE '%Bosch%' OR provider_name ILIKE '%Volkswagen%'
    OR provider_name ILIKE '%Studienstiftung%' OR provider_name ILIKE '%Deutschland%'
    OR provider_name ILIKE '%Goethe%' OR provider_name ILIKE '%Friedrich Naumann%'
    OR provider_name ILIKE '%Rosa Luxemburg%' OR provider_name ILIKE '%Hans Böckler%'
    OR provider_name ILIKE '%Hans Boeckler%' OR provider_name ILIKE '%Avicenna-Studienwerk%'
    OR provider_name ILIKE '%Ernst Ludwig Ehrlich%' OR provider_name ILIKE '%Cusanuswerk%'
    OR provider_name ILIKE '%Bonn%' OR provider_name ILIKE '%Munich%'
    OR provider_name ILIKE '%TU Berlin%' OR provider_name ILIKE '%Free University%'
    OR provider_name ILIKE '%FU Berlin%' OR provider_name ILIKE '%LMU%'
  );

-- ─── France — broader ────────────────────────────────────────────────────────
UPDATE public.scholarships SET host_country = 'France'
  WHERE COALESCE(host_country, '') = '' AND (
    provider_name ILIKE '%PSL%' OR provider_name ILIKE '%Paris-Saclay%'
    OR provider_name ILIKE '%Sorbonne University%' OR provider_name ILIKE '%Eiffel Excellence%'
    OR provider_name ILIKE '%CIVIS%' OR provider_name ILIKE '%Campus France%'
    OR provider_name ILIKE '%Sciences%' OR provider_name ILIKE '%Université%'
    OR provider_name ILIKE '%Universite de Paris%' OR provider_name ILIKE '%Lyon%'
  );

-- ─── Italy / Spain / Portugal — Mediterranean ───────────────────────────────
UPDATE public.scholarships SET host_country = 'Italy'
  WHERE COALESCE(host_country, '') = '' AND (
    provider_name ILIKE '%Bocconi%' OR provider_name ILIKE '%Politecnico di Milano%'
    OR provider_name ILIKE '%Università%' OR provider_name ILIKE '%Sapienza%'
    OR provider_name ILIKE '%Roma Tre%' OR provider_name ILIKE '%Padova%'
    OR provider_name ILIKE '%Bologna%' OR provider_name ILIKE '%Italian Government%'
  );
UPDATE public.scholarships SET host_country = 'Spain'
  WHERE COALESCE(host_country, '') = '' AND (
    provider_name ILIKE '%IE Business%' OR provider_name ILIKE '%IESE%'
    OR provider_name ILIKE '%Pompeu Fabra%' OR provider_name ILIKE '%ESADE%'
    OR provider_name ILIKE '%Universidad%' OR provider_name ILIKE '%MAEC-AECID%'
    OR provider_name ILIKE '%Carlos III%' OR provider_name ILIKE '%Autónoma%'
  );
UPDATE public.scholarships SET host_country = 'Portugal'
  WHERE COALESCE(host_country, '') = '' AND (
    provider_name ILIKE '%Catolica%' OR provider_name ILIKE '%University of Lisbon%'
    OR provider_name ILIKE '%Universidade de Lisboa%' OR provider_name ILIKE '%Porto%'
    OR provider_name ILIKE '%Coimbra%' OR provider_name ILIKE '%Nova SBE%'
    OR provider_name ILIKE '%Calouste Gulbenkian%'
  );

-- ─── Belgium / Netherlands — broader ────────────────────────────────────────
UPDATE public.scholarships SET host_country = 'Belgium'
  WHERE COALESCE(host_country, '') = '' AND (
    provider_name ILIKE '%KU Leuven%' OR provider_name ILIKE '%VLIR-UOS%'
    OR provider_name ILIKE '%VLIR UOS%' OR provider_name ILIKE '%Ghent University%'
    OR provider_name ILIKE '%Université Libre de Bruxelles%' OR provider_name ILIKE '%ULB%'
    OR provider_name ILIKE '%Vrije Universiteit Brussel%' OR provider_name ILIKE '%VUB%'
    OR provider_name ILIKE '%University of Antwerp%' OR provider_name ILIKE '%UCL Belgium%'
  );
UPDATE public.scholarships SET host_country = 'Netherlands'
  WHERE COALESCE(host_country, '') = '' AND (
    provider_name ILIKE '%Eindhoven%' OR provider_name ILIKE '%University of Amsterdam%'
    OR provider_name ILIKE '%Vrije Universiteit Amsterdam%' OR provider_name ILIKE '%VU Amsterdam%'
    OR provider_name ILIKE '%Maastricht%' OR provider_name ILIKE '%Tilburg%'
    OR provider_name ILIKE '%International Institute of Social Studies%'
    OR provider_name ILIKE '%ISS%' OR provider_name ILIKE '%Erasmus University%'
    OR provider_name ILIKE '%Twente%' OR provider_name ILIKE '%Groningen%'
  );

-- ─── Nordics — broader ──────────────────────────────────────────────────────
UPDATE public.scholarships SET host_country = 'Sweden'
  WHERE COALESCE(host_country, '') = '' AND (
    provider_name ILIKE '%University of Gothenburg%' OR provider_name ILIKE '%Linköping%'
    OR provider_name ILIKE '%Linkoping%' OR provider_name ILIKE '%Umeå%'
    OR provider_name ILIKE '%Umea University%' OR provider_name ILIKE '%SLU%'
    OR provider_name ILIKE '%Swedish University%'
  );
UPDATE public.scholarships SET host_country = 'Norway'
  WHERE COALESCE(host_country, '') = '' AND (
    provider_name ILIKE '%University of Oslo%' OR provider_name ILIKE '%NTNU%'
    OR provider_name ILIKE '%Norwegian University%' OR provider_name ILIKE '%Bergen%'
    OR provider_name ILIKE '%BI Norwegian%' OR provider_name ILIKE '%Quota Scheme%'
  );
UPDATE public.scholarships SET host_country = 'Denmark'
  WHERE COALESCE(host_country, '') = '' AND (
    provider_name ILIKE '%University of Copenhagen%' OR provider_name ILIKE '%Aarhus%'
    OR provider_name ILIKE '%DTU%' OR provider_name ILIKE '%Danish Government%'
    OR provider_name ILIKE '%CBS Denmark%' OR provider_name ILIKE '%Copenhagen Business%'
    OR provider_name ILIKE '%Aalborg%'
  );
UPDATE public.scholarships SET host_country = 'Finland'
  WHERE COALESCE(host_country, '') = '' AND (
    provider_name ILIKE '%University of Helsinki%' OR provider_name ILIKE '%Aalto%'
    OR provider_name ILIKE '%Tampere%' OR provider_name ILIKE '%Turku%'
    OR provider_name ILIKE '%Finnish Government%'
  );

-- ─── Switzerland / Austria ──────────────────────────────────────────────────
UPDATE public.scholarships SET host_country = 'Switzerland'
  WHERE COALESCE(host_country, '') = '' AND (
    provider_name ILIKE '%University of Geneva%' OR provider_name ILIKE '%University of Basel%'
    OR provider_name ILIKE '%University of Bern%' OR provider_name ILIKE '%University of Lausanne%'
    OR provider_name ILIKE '%IMD%' OR provider_name ILIKE '%Graduate Institute Geneva%'
    OR provider_name ILIKE '%University of St. Gallen%' OR provider_name ILIKE '%St Gallen%'
  );
UPDATE public.scholarships SET host_country = 'Austria'
  WHERE COALESCE(host_country, '') = '' AND (
    provider_name ILIKE '%University of Vienna%' OR provider_name ILIKE '%TU Wien%'
    OR provider_name ILIKE '%WU Vienna%' OR provider_name ILIKE '%Innsbruck%'
    OR provider_name ILIKE '%Graz%' OR provider_name ILIKE '%OeAD%'
    OR provider_name ILIKE '%Austrian%'
  );

-- ─── Touch updated_at on backfilled rows so deep-dive cache invalidates. ────
UPDATE public.scholarships
SET updated_at = now()
WHERE updated_at < now() - interval '1 minute';
