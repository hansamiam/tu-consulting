// Country Guides — deep, factual reference content for Central Asian students.
// Data sources: official government immigration portals, university admission offices,
// QS/THE rankings, OECD education statistics. All figures are conservative ranges, not absolutes.
// Every guide is reviewed before publication. No fabricated statistics.

export interface CostBreakdown {
  label: string;
  labelRu: string;
  rangeUsd: string; // e.g. "8,000–22,000"
  notes?: string;
  notesRu?: string;
}

export interface VisaStep {
  step: string;
  stepRu: string;
  detail: string;
  detailRu: string;
}

export interface CountryGuide {
  slug: string;
  country: string;
  countryRu: string;
  flag: string; // emoji
  tagline: string;
  taglineRu: string;
  intro: string;
  introRu: string;

  // Quick facts
  popularCities: string[];
  languageOfInstruction: string[];
  intakes: string[];
  intakesRu: string[];

  // Application
  applicationOverview: string;
  applicationOverviewRu: string;
  typicalDeadlines: { undergrad: string; postgrad: string };
  testRequirements: { name: string; minScore: string; notes?: string }[];

  // Cost
  tuitionRangeUsd: string; // per year
  livingRangeUsd: string; // per year
  costs: CostBreakdown[];

  // Visa
  visaName: string;
  visaProcessingWeeks: string;
  visaSteps: VisaStep[];
  proofOfFundsUsd: string;
  workRights: string;
  workRightsRu: string;
  postStudyWork: string;
  postStudyWorkRu: string;

  // Scholarships (named, real, public)
  scholarships: { name: string; coverage: string; eligibility: string; deadline?: string }[];

  // Honest assessment
  prosForCentralAsians: string[];
  prosForCentralAsiansRu: string[];
  challenges: string[];
  challengesRu: string[];

  // Sources for transparency
  sources: { label: string; url: string }[];
}

export const countryGuides: CountryGuide[] = [
  {
    slug: "united-states",
    country: "United States",
    countryRu: "США",
    flag: "🇺🇸",
    tagline: "Largest higher education system in the world. High cost, highest scholarship variance.",
    taglineRu: "Крупнейшая система высшего образования в мире. Высокая стоимость, самый широкий разброс стипендий.",
    intro:
      "The US hosts roughly 4,000 accredited institutions, from Ivy League research universities to liberal arts colleges and community colleges. For Central Asian students, the US offers the deepest scholarship pool of any country — but only if you apply strategically. Sticker tuition can exceed $80,000/year at private schools, yet many students from Kazakhstan, Kyrgyzstan, and Uzbekistan attend on full need-based or merit aid. The application process is also the most demanding: standardized tests, multiple essays, recommendation letters, and a holistic review.",
    introRu:
      "В США около 4000 аккредитованных учебных заведений — от университетов Лиги Плюща до колледжей свободных искусств и общественных колледжей. Для студентов из Центральной Азии США предлагают самый большой пул стипендий среди всех стран — но только при стратегическом подходе. Заявленная стоимость обучения в частных вузах может превышать $80,000 в год, однако многие студенты из Казахстана, Кыргызстана и Узбекистана учатся на полной финансовой помощи. Процесс поступления — самый требовательный: стандартизированные тесты, несколько эссе, рекомендательные письма, холистическое рассмотрение.",
    popularCities: ["Boston", "New York", "Los Angeles", "Chicago", "San Francisco Bay Area"],
    languageOfInstruction: ["English"],
    intakes: ["Fall (August/September) — primary", "Spring (January) — limited"],
    intakesRu: ["Осень (август/сентябрь) — основной", "Весна (январь) — ограниченный"],
    applicationOverview:
      "Most undergraduate applications go through the Common App or Coalition App. Required components typically include: high school transcripts (translated and evaluated), personal statement (~650 words), supplemental essays per university, 2–3 letters of recommendation, standardized test scores (SAT/ACT — many schools are now test-optional, but submitting strong scores helps international applicants), and proof of English (TOEFL/IELTS/Duolingo).",
    applicationOverviewRu:
      "Большинство заявок на бакалавриат подаётся через Common App или Coalition App. Обычно требуются: школьный аттестат (перевод и оценка), личное эссе (~650 слов), дополнительные эссе для каждого университета, 2–3 рекомендательных письма, результаты SAT/ACT (многие вузы перешли на test-optional, но сильные баллы помогают международным абитуриентам), подтверждение английского (TOEFL/IELTS/Duolingo).",
    typicalDeadlines: {
      undergrad: "Early Decision/Action: Nov 1–15 · Regular Decision: Jan 1–15",
      postgrad: "Dec 1 – Feb 1 (varies by program)",
    },
    testRequirements: [
      { name: "TOEFL iBT", minScore: "80–100+", notes: "100+ for top-30 schools" },
      { name: "IELTS", minScore: "6.5–7.5" },
      { name: "Duolingo English Test", minScore: "115–130", notes: "Accepted by most schools" },
      { name: "SAT", minScore: "1300–1550", notes: "Optional at many schools but recommended for scholarships" },
    ],
    tuitionRangeUsd: "$10,000–$85,000/year",
    livingRangeUsd: "$12,000–$25,000/year",
    costs: [
      { label: "Tuition (public)", labelRu: "Обучение (государственный)", rangeUsd: "10,000–40,000" },
      { label: "Tuition (private)", labelRu: "Обучение (частный)", rangeUsd: "45,000–85,000" },
      { label: "On-campus housing + meals", labelRu: "Общежитие + питание", rangeUsd: "12,000–18,000" },
      { label: "Health insurance", labelRu: "Медицинская страховка", rangeUsd: "1,500–3,500" },
      { label: "Books & supplies", labelRu: "Учебники и материалы", rangeUsd: "800–1,500" },
      { label: "Personal/transport", labelRu: "Личные расходы/транспорт", rangeUsd: "2,000–4,000" },
    ],
    visaName: "F-1 Student Visa",
    visaProcessingWeeks: "2–8 weeks (varies by consulate)",
    proofOfFundsUsd: "Total cost of attendance for year 1 (typically $40,000–$90,000)",
    visaSteps: [
      {
        step: "Receive I-20 from your university",
        stepRu: "Получите форму I-20 от университета",
        detail: "After accepting your admission offer and submitting financial documents, the university issues your I-20.",
        detailRu: "После принятия предложения и подачи финансовых документов университет выдаёт I-20.",
      },
      {
        step: "Pay SEVIS I-901 fee",
        stepRu: "Оплатите сбор SEVIS I-901",
        detail: "Currently $350. Pay online at fmjfee.com.",
        detailRu: "В настоящее время $350. Оплачивается онлайн на fmjfee.com.",
      },
      {
        step: "Complete DS-160 form",
        stepRu: "Заполните форму DS-160",
        detail: "Online nonimmigrant visa application. Save your confirmation page.",
        detailRu: "Онлайн-заявка на неиммиграционную визу. Сохраните страницу подтверждения.",
      },
      {
        step: "Schedule visa interview",
        stepRu: "Запишитесь на визовое интервью",
        detail: "At the US embassy/consulate. Wait times vary — book early.",
        detailRu: "В посольстве/консульстве США. Время ожидания может быть значительным — записывайтесь заранее.",
      },
      {
        step: "Attend interview with documents",
        stepRu: "Пройдите интервью с документами",
        detail: "Bring I-20, DS-160 confirmation, SEVIS receipt, passport, financial proof, ties to home country.",
        detailRu: "Возьмите I-20, подтверждение DS-160, чек SEVIS, паспорт, финансовые документы, доказательства связей с родиной.",
      },
    ],
    workRights: "On-campus only during studies (max 20 hrs/week during term). Off-campus work requires CPT or OPT authorization.",
    workRightsRu: "Только на территории кампуса во время учёбы (макс. 20 ч/нед в семестре). Работа вне кампуса требует CPT или OPT.",
    postStudyWork: "OPT: 12 months post-graduation. STEM degrees qualify for a 24-month extension (36 months total).",
    postStudyWorkRu: "OPT: 12 месяцев после выпуска. STEM-специальности дают право на продление ещё на 24 месяца (всего 36).",
    scholarships: [
      { name: "Need-based aid (Harvard, Yale, MIT, Princeton, Stanford, Amherst, Williams, Bowdoin)", coverage: "Up to 100% of demonstrated need", eligibility: "Need-blind for internationals at a small group of schools" },
      { name: "Davis United World College Scholars Program", coverage: "Variable, typically $10,000–$50,000/year", eligibility: "UWC graduates only" },
      { name: "MasterCard Foundation Scholars Program", coverage: "Fully funded", eligibility: "Specific partner universities; African students prioritized but some open to others" },
      { name: "Merit scholarships at smaller liberal arts colleges", coverage: "$15,000–$40,000/year", eligibility: "Strong academics + test scores" },
    ],
    prosForCentralAsians: [
      "Largest scholarship pool globally — fully funded awards genuinely possible",
      "Holistic admissions reward unique stories — your background is an asset, not a liability",
      "Strong post-study work options for STEM fields",
      "Diverse academic offerings: liberal arts, research, professional programs",
    ],
    prosForCentralAsiansRu: [
      "Крупнейший пул стипендий — полные стипендии действительно возможны",
      "Холистическое рассмотрение ценит уникальные истории — ваше происхождение работает в плюс",
      "Сильные возможности работы после учёбы для STEM-специальностей",
      "Разнообразие программ: свободные искусства, исследования, профессиональные программы",
    ],
    challenges: [
      "Application is complex and time-intensive (start 12–15 months before deadlines)",
      "Test-optional ≠ test-blind — strong SAT helps internationals significantly",
      "F-1 visa interview can be unpredictable; strong ties to home country matter",
      "Healthcare and incidentals add real cost beyond tuition",
    ],
    challengesRu: [
      "Подача — сложный и трудоёмкий процесс (начинайте за 12–15 месяцев до дедлайнов)",
      "Test-optional ≠ test-blind — сильный SAT существенно помогает иностранцам",
      "Интервью на F-1 непредсказуемо; важны связи с родиной",
      "Медицина и побочные расходы значительно увеличивают бюджет",
    ],
    sources: [
      { label: "US Department of State — Student Visas", url: "https://travel.state.gov/content/travel/en/us-visas/study/student-visa.html" },
      { label: "EducationUSA", url: "https://educationusa.state.gov/" },
      { label: "Common App", url: "https://www.commonapp.org/" },
    ],
  },
  {
    slug: "united-kingdom",
    country: "United Kingdom",
    countryRu: "Великобритания",
    flag: "🇬🇧",
    tagline: "Three-year bachelor's, structured admissions, transparent costs.",
    taglineRu: "Трёхлетний бакалавриат, структурированное поступление, прозрачные расходы.",
    intro:
      "The UK runs one of the most efficient admissions systems in the world: one application (UCAS) for up to five universities, clear academic requirements, and a three-year undergraduate degree (four in Scotland) that saves a year of tuition compared to the US. UK universities are particularly strong in business, law, engineering, and humanities. Costs are predictable but scholarships for internationals are scarcer than in the US.",
    introRu:
      "В Великобритании одна из самых эффективных систем поступления: одна заявка (UCAS) на до пяти университетов, чёткие академические требования, трёхлетний бакалавриат (четыре в Шотландии), что экономит год обучения по сравнению с США. Британские вузы особенно сильны в бизнесе, праве, инженерии и гуманитарных науках. Расходы предсказуемы, но стипендий для иностранцев меньше, чем в США.",
    popularCities: ["London", "Edinburgh", "Manchester", "Oxford", "Cambridge", "Glasgow"],
    languageOfInstruction: ["English"],
    intakes: ["September (primary)", "January (limited)"],
    intakesRu: ["Сентябрь (основной)", "Январь (ограниченный)"],
    applicationOverview:
      "All UK undergraduate applications go through UCAS. You choose up to 5 universities and submit one personal statement (~4,000 characters) for all of them. Most programs require predicted A-Level grades or equivalent (IB, foundation year). Conditional offers are common — your place is held pending final exam results.",
    applicationOverviewRu:
      "Все заявки на бакалавриат в Великобритании подаются через UCAS. Вы выбираете до 5 университетов и подаёте одно личное эссе (~4000 знаков) для всех. Большинство программ требуют предсказанные оценки A-Level или эквивалент (IB, foundation year). Условные предложения распространены — место сохраняется до итоговых экзаменов.",
    typicalDeadlines: {
      undergrad: "Oct 15 (Oxford/Cambridge/Medicine) · Jan 31 (most others)",
      postgrad: "Rolling, Nov–July depending on program",
    },
    testRequirements: [
      { name: "IELTS Academic", minScore: "6.0–7.5", notes: "7.0+ for top universities and humanities" },
      { name: "TOEFL iBT", minScore: "80–110", notes: "Accepted at most but not all universities" },
      { name: "A-Levels / IB / Foundation Year", minScore: "AAA / 36–42 / Pass with Merit", notes: "Most internationals from CIS need a foundation year" },
    ],
    tuitionRangeUsd: "$15,000–$45,000/year",
    livingRangeUsd: "$13,000–$22,000/year (London highest)",
    costs: [
      { label: "Tuition (most undergrad)", labelRu: "Обучение (бакалавриат)", rangeUsd: "15,000–35,000" },
      { label: "Tuition (medicine/MBA)", labelRu: "Обучение (медицина/MBA)", rangeUsd: "40,000–65,000" },
      { label: "Foundation year", labelRu: "Foundation Year", rangeUsd: "12,000–25,000" },
      { label: "Accommodation (outside London)", labelRu: "Жильё (вне Лондона)", rangeUsd: "7,000–11,000" },
      { label: "Accommodation (London)", labelRu: "Жильё (Лондон)", rangeUsd: "12,000–18,000" },
      { label: "Food, transport, personal", labelRu: "Еда, транспорт, личные", rangeUsd: "5,000–8,000" },
    ],
    visaName: "Student Route Visa (formerly Tier 4)",
    visaProcessingWeeks: "3 weeks standard; priority service available",
    proofOfFundsUsd: "Tuition for year 1 + £1,334/month London or £1,023/month outside London for up to 9 months",
    visaSteps: [
      {
        step: "Receive CAS from your university",
        stepRu: "Получите CAS от университета",
        detail: "Confirmation of Acceptance for Studies — issued after you accept your unconditional offer.",
        detailRu: "Confirmation of Acceptance for Studies — выдаётся после принятия безусловного предложения.",
      },
      {
        step: "Take TB test (required for Central Asian countries)",
        stepRu: "Сдайте тест на туберкулёз (обязательно для стран ЦА)",
        detail: "At an approved clinic. Valid for 6 months.",
        detailRu: "В аккредитованной клинике. Действителен 6 месяцев.",
      },
      {
        step: "Apply online via gov.uk",
        stepRu: "Подайте заявку онлайн на gov.uk",
        detail: "Pay visa fee (~£490) and Immigration Health Surcharge (£776/year of study).",
        detailRu: "Оплатите визовый сбор (~£490) и Immigration Health Surcharge (£776 за год обучения).",
      },
      {
        step: "Submit biometrics at VFS center",
        stepRu: "Сдайте биометрию в центре VFS",
        detail: "Photos, fingerprints, document submission.",
        detailRu: "Фото, отпечатки пальцев, подача документов.",
      },
      {
        step: "Receive decision",
        stepRu: "Получите решение",
        detail: "Standard processing: 3 weeks. You'll get a 90-day vignette to enter the UK; collect your BRP within 10 days of arrival.",
        detailRu: "Стандартная обработка: 3 недели. Вы получите визу на 90 дней для въезда; BRP нужно забрать в течение 10 дней после прибытия.",
      },
    ],
    workRights: "Up to 20 hrs/week during term, full-time during holidays.",
    workRightsRu: "До 20 ч/нед в семестре, полная занятость на каникулах.",
    postStudyWork: "Graduate Route: 2 years (3 for PhD) post-graduation work without sponsorship.",
    postStudyWorkRu: "Graduate Route: 2 года (3 для PhD) работы без визового спонсорства.",
    scholarships: [
      { name: "Chevening Scholarships (postgrad)", coverage: "Full tuition + stipend + flights", eligibility: "Min 2 years work experience, leadership potential", deadline: "Early November" },
      { name: "GREAT Scholarships", coverage: "£10,000 toward tuition", eligibility: "Specific countries and universities; check annually" },
      { name: "Commonwealth Scholarships", coverage: "Full funding", eligibility: "Limited countries; primarily LDCs" },
      { name: "University-specific scholarships (Edinburgh Global, Warwick Chancellor's, Bristol Think Big)", coverage: "£5,000–full tuition", eligibility: "Varies; apply alongside or after admission" },
    ],
    prosForCentralAsians: [
      "Three-year bachelor's saves time and money vs US",
      "UCAS is simpler than Common App — one personal statement",
      "Graduate Route gives 2 post-study years to find work",
      "Strong programs in business, law, engineering",
    ],
    prosForCentralAsiansRu: [
      "Трёхлетний бакалавриат экономит время и деньги по сравнению с США",
      "UCAS проще, чем Common App — одно личное эссе",
      "Graduate Route даёт 2 года после выпуска для поиска работы",
      "Сильные программы в бизнесе, праве, инженерии",
    ],
    challenges: [
      "Few full scholarships at undergraduate level for internationals",
      "Most CIS students need a foundation year first (extra year + tuition)",
      "London cost of living is among the highest in Europe",
      "Less holistic admissions — your grades and English score matter most",
    ],
    challengesRu: [
      "Мало полных стипендий на бакалавриат для иностранцев",
      "Большинству студентов из СНГ нужен foundation year (дополнительный год + плата)",
      "Стоимость жизни в Лондоне — одна из самых высоких в Европе",
      "Менее холистическое рассмотрение — оценки и английский важнее всего",
    ],
    sources: [
      { label: "UCAS — UK undergraduate applications", url: "https://www.ucas.com/" },
      { label: "UK Government — Student visa", url: "https://www.gov.uk/student-visa" },
      { label: "British Council — Study UK", url: "https://study-uk.britishcouncil.org/" },
    ],
  },
  {
    slug: "canada",
    country: "Canada",
    countryRu: "Канада",
    flag: "🇨🇦",
    tagline: "Clear immigration pathway, moderate cost, English + French options.",
    taglineRu: "Чёткий иммиграционный путь, умеренная стоимость, опции на английском и французском.",
    intro:
      "Canada has become one of the most popular destinations for Central Asian students because of its transparent post-graduation work permit (PGWP) and pathway to permanent residency. Tuition is lower than the US and UK, and many provinces offer in-province work rights from day one of studies. Quality varies by institution — research U15 universities (Toronto, McGill, UBC, Waterloo) compete globally; many smaller universities and colleges focus on practical training.",
    introRu:
      "Канада стала одним из самых популярных направлений для студентов Центральной Азии благодаря прозрачному разрешению на работу после выпуска (PGWP) и пути к постоянному резидентству. Обучение дешевле, чем в США и Великобритании, и многие провинции дают право на работу с первого дня обучения. Качество варьируется — исследовательские U15 (Торонто, McGill, UBC, Waterloo) конкурируют глобально; многие небольшие университеты и колледжи фокусируются на практической подготовке.",
    popularCities: ["Toronto", "Vancouver", "Montreal", "Waterloo", "Ottawa", "Calgary"],
    languageOfInstruction: ["English", "French (Quebec & New Brunswick)"],
    intakes: ["Fall (September) — primary", "Winter (January)", "Summer (May) — limited"],
    intakesRu: ["Осень (сентябрь) — основной", "Зима (январь)", "Лето (май) — ограниченный"],
    applicationOverview:
      "Each university has its own application portal — there is no central system like UCAS. Ontario universities use OUAC. Required: high school transcript with translation, English test, personal statement (varies), and sometimes letters of recommendation. Many programs are competitive admission within the university (e.g. Waterloo CS, Toronto Engineering).",
    applicationOverviewRu:
      "У каждого университета своя система подачи — централизованной как UCAS нет. Университеты Онтарио используют OUAC. Требуется: аттестат с переводом, тест по английскому, эссе (варьируется), иногда рекомендательные письма. Многие программы конкурсные внутри университета (например, CS в Waterloo, Engineering в Toronto).",
    typicalDeadlines: {
      undergrad: "Jan 15 – Mar 1 for fall (varies by school/program)",
      postgrad: "Dec 1 – Feb 1 typical",
    },
    testRequirements: [
      { name: "IELTS Academic", minScore: "6.5–7.0" },
      { name: "TOEFL iBT", minScore: "86–100" },
      { name: "Duolingo English Test", minScore: "115–125", notes: "Accepted at most universities" },
      { name: "TEF/TCF", minScore: "B2", notes: "For French-language programs in Quebec" },
    ],
    tuitionRangeUsd: "$15,000–$45,000/year (CAD 20k–60k)",
    livingRangeUsd: "$10,000–$18,000/year",
    costs: [
      { label: "Tuition (undergrad)", labelRu: "Обучение (бакалавриат)", rangeUsd: "15,000–35,000" },
      { label: "Tuition (engineering/business)", labelRu: "Обучение (инженерия/бизнес)", rangeUsd: "30,000–50,000" },
      { label: "Accommodation", labelRu: "Жильё", rangeUsd: "6,000–12,000" },
      { label: "Health insurance (provincial or private)", labelRu: "Медицинская страховка", rangeUsd: "600–900" },
      { label: "Food + transport", labelRu: "Еда + транспорт", rangeUsd: "3,500–5,000" },
    ],
    visaName: "Study Permit",
    visaProcessingWeeks: "4–12 weeks (varies by country); SDS for some Asian countries is faster",
    proofOfFundsUsd: "Tuition + CAD 20,635/year living costs (~$15,000 USD), updated annually",
    visaSteps: [
      {
        step: "Receive Letter of Acceptance (LOA) and Provincial Attestation Letter (PAL)",
        stepRu: "Получите LOA и Provincial Attestation Letter (PAL)",
        detail: "Since 2024, most provinces require a PAL in addition to your LOA.",
        detailRu: "С 2024 большинство провинций требуют PAL в дополнение к LOA.",
      },
      {
        step: "Apply online via IRCC portal",
        stepRu: "Подайте заявку онлайн через портал IRCC",
        detail: "Upload LOA, PAL, proof of funds, passport, photos, statement of purpose.",
        detailRu: "Загрузите LOA, PAL, доказательство средств, паспорт, фото, мотивационное письмо.",
      },
      {
        step: "Pay fees",
        stepRu: "Оплатите сборы",
        detail: "Study permit: CAD 150. Biometrics: CAD 85.",
        detailRu: "Study permit: 150 CAD. Биометрия: 85 CAD.",
      },
      {
        step: "Submit biometrics",
        stepRu: "Сдайте биометрию",
        detail: "At a VAC. Required for most applicants from Central Asia.",
        detailRu: "В VAC. Требуется для большинства заявителей из ЦА.",
      },
      {
        step: "Medical exam (if required)",
        stepRu: "Медицинский осмотр (если требуется)",
        detail: "If staying 6+ months. Must be done by a panel physician.",
        detailRu: "При пребывании от 6 месяцев. Только у panel physician.",
      },
    ],
    workRights: "Up to 24 hrs/week off-campus during term (rule changed in 2024 from 20 hrs); full-time during scheduled breaks.",
    workRightsRu: "До 24 ч/нед вне кампуса в семестре (изменено в 2024 с 20 ч); полная занятость в каникулы.",
    postStudyWork: "PGWP: up to 3 years depending on program length. Strong pathway to PR via Express Entry or PNP.",
    postStudyWorkRu: "PGWP: до 3 лет в зависимости от длительности программы. Сильный путь к PR через Express Entry или PNP.",
    scholarships: [
      { name: "Vanier Canada Graduate Scholarships", coverage: "CAD 50,000/year × 3 years", eligibility: "PhD only, exceptional research promise" },
      { name: "Lester B. Pearson International Scholarship (UofT)", coverage: "Fully funded: tuition, books, residence", eligibility: "Highly selective; school nomination required" },
      { name: "UBC International Major Entrance Scholarship (IMES)", coverage: "Variable, partial to substantial", eligibility: "Top international applicants, automatic consideration" },
      { name: "York University International Student Scholarship", coverage: "CAD 35,000–180,000 over 4 years", eligibility: "Renewable; merit-based" },
    ],
    prosForCentralAsians: [
      "Clearest immigration pathway of any major destination",
      "PGWP gives 1–3 years to work after graduation, no sponsor needed",
      "More affordable than US/UK for similar quality",
      "Multicultural society; strong CIS/Russian-speaking communities in Toronto and Vancouver",
    ],
    prosForCentralAsiansRu: [
      "Самый чёткий иммиграционный путь среди основных направлений",
      "PGWP даёт 1–3 года работы после выпуска без необходимости спонсора",
      "Доступнее, чем США/Великобритания, при сопоставимом качестве",
      "Многонациональное общество; сильные русскоязычные общины в Торонто и Ванкувере",
    ],
    challenges: [
      "PAL requirement (2024+) added complexity and capped intake numbers",
      "Winter is genuinely harsh in most of the country",
      "Quebec has separate immigration rules and French requirements",
      "Quality varies — research universities vs. private colleges differ enormously",
    ],
    challengesRu: [
      "Требование PAL (с 2024) усложнило процесс и ограничило приём",
      "Зимы действительно суровые в большей части страны",
      "У Квебека отдельные иммиграционные правила и требования по французскому",
      "Качество варьируется — исследовательские университеты и частные колледжи сильно различаются",
    ],
    sources: [
      { label: "IRCC — Study in Canada", url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada.html" },
      { label: "EduCanada", url: "https://www.educanada.ca/" },
      { label: "OUAC (Ontario applications)", url: "https://www.ouac.on.ca/" },
    ],
  },
  {
    slug: "germany",
    country: "Germany",
    countryRu: "Германия",
    flag: "🇩🇪",
    tagline: "Tuition-free public universities. Strong engineering. German often required.",
    taglineRu: "Бесплатные государственные университеты. Сильная инженерия. Часто нужен немецкий.",
    intro:
      "Germany is the only major Western country where public universities are essentially free for international students at the bachelor's level (a small semester fee of €100–€350 covers admin and a public transit pass). Most undergraduate programs are taught in German, requiring a C1 certificate (TestDaF or DSH). Engineering, automotive, and applied sciences are world-leading. Master's programs in English are increasingly common.",
    introRu:
      "Германия — единственная крупная западная страна, где государственные университеты бесплатны для иностранцев на уровне бакалавриата (небольшой семестровый сбор €100–€350 покрывает административные расходы и проездной). Большинство программ бакалавриата на немецком, требуется C1 (TestDaF или DSH). Инженерия, автомобилестроение и прикладные науки — мирового уровня. Магистерские программы на английском всё чаще доступны.",
    popularCities: ["Berlin", "Munich", "Heidelberg", "Aachen", "Stuttgart", "Hamburg"],
    languageOfInstruction: ["German (most undergrad)", "English (many master's programs)"],
    intakes: ["Winter semester (October) — primary", "Summer semester (April) — limited"],
    intakesRu: ["Зимний семестр (октябрь) — основной", "Летний семестр (апрель) — ограниченный"],
    applicationOverview:
      "Most CIS students cannot enter directly into a German bachelor's — Kazakh, Kyrgyz, and Uzbek high school diplomas typically don't meet the Hochschulzugangsberechtigung (HZB) requirement. You'll usually need either: (a) one year at a home-country university with strong grades, OR (b) a Studienkolleg (foundation year) with the FSP exam. Applications go through uni-assist for most universities, or directly for some.",
    applicationOverviewRu:
      "Большинство студентов из СНГ не могут поступить напрямую в немецкий бакалавриат — казахские, кыргызские, узбекские аттестаты обычно не соответствуют требованию HZB. Обычно нужно либо: (а) один год в вузе родной страны с хорошими оценками, либо (б) Studienkolleg (подготовительный год) с экзаменом FSP. Подача — через uni-assist для большинства университетов или напрямую для некоторых.",
    typicalDeadlines: {
      undergrad: "Jul 15 (winter) · Jan 15 (summer)",
      postgrad: "Varies; many May 31 / Nov 30",
    },
    testRequirements: [
      { name: "TestDaF or DSH", minScore: "TDN 4 / DSH-2", notes: "For German-taught programs" },
      { name: "IELTS / TOEFL", minScore: "6.5 / 88", notes: "For English-taught programs" },
      { name: "TestAS", minScore: "Above-average", notes: "Increasingly required for international undergrad applicants" },
    ],
    tuitionRangeUsd: "$0–$1,500/year (public); $5,000–$25,000 (private)",
    livingRangeUsd: "$10,000–$13,000/year",
    costs: [
      { label: "Semester fee (public)", labelRu: "Семестровый сбор (государственный)", rangeUsd: "100–400/semester" },
      { label: "Tuition (Baden-Württemberg, non-EU)", labelRu: "Обучение (Баден-Вюртемберг, не ЕС)", rangeUsd: "3,500/year" },
      { label: "Studienkolleg (if at private)", labelRu: "Studienkolleg (если частный)", rangeUsd: "0–8,000/year" },
      { label: "Accommodation", labelRu: "Жильё", rangeUsd: "3,500–7,000" },
      { label: "Health insurance (mandatory)", labelRu: "Медицинская страховка (обязательна)", rangeUsd: "1,400" },
      { label: "Food, transport, personal", labelRu: "Еда, транспорт, личные", rangeUsd: "4,000–6,000" },
    ],
    visaName: "National Visa for Study Purposes (then residence permit on arrival)",
    visaProcessingWeeks: "6–12 weeks",
    proofOfFundsUsd: "€11,904/year in a blocked account (Sperrkonto), updated annually",
    visaSteps: [
      {
        step: "Open a blocked account (Sperrkonto)",
        stepRu: "Откройте блокированный счёт (Sperrkonto)",
        detail: "Deposit €11,904 (or current amount). Providers: Expatrio, Fintiba, Coracle.",
        detailRu: "Внесите €11,904 (или актуальную сумму). Провайдеры: Expatrio, Fintiba, Coracle.",
      },
      {
        step: "Get health insurance",
        stepRu: "Оформите медицинскую страховку",
        detail: "Required for visa application. Travel insurance is sufficient initially; switch to statutory insurance on arrival.",
        detailRu: "Требуется для визы. Изначально достаточно туристической; после прибытия переключитесь на государственную.",
      },
      {
        step: "Book embassy appointment",
        stepRu: "Запишитесь в посольство",
        detail: "Wait times in Almaty/Tashkent/Bishkek can be 2–3 months — book very early.",
        detailRu: "Время ожидания в Алматы/Ташкенте/Бишкеке — 2–3 месяца, записывайтесь очень заранее.",
      },
      {
        step: "Submit documents at appointment",
        stepRu: "Подайте документы на приёме",
        detail: "Admission letter, financial proof, insurance, passport, motivation letter, language certificates.",
        detailRu: "Письмо о зачислении, финансовые документы, страховка, паспорт, мотивационное письмо, сертификаты языка.",
      },
      {
        step: "Register in Germany within 2 weeks of arrival",
        stepRu: "Зарегистрируйтесь в Германии в течение 2 недель после прибытия",
        detail: "Anmeldung at the local Bürgeramt; then apply for residence permit at the Ausländerbehörde.",
        detailRu: "Anmeldung в местном Bürgeramt; затем подача на residence permit в Ausländerbehörde.",
      },
    ],
    workRights: "120 full days or 240 half days per year. Working as a student assistant (HiWi) at university is encouraged.",
    workRightsRu: "120 полных или 240 половинных дней в год. Работа студентом-ассистентом (HiWi) в университете приветствуется.",
    postStudyWork: "18-month job-seeker residence permit after graduation. Pathway to Blue Card and PR.",
    postStudyWorkRu: "Резидентский статус для поиска работы на 18 месяцев после выпуска. Путь к Blue Card и PR.",
    scholarships: [
      { name: "DAAD Scholarships", coverage: "Variable: monthly stipend, tuition, travel, insurance", eligibility: "Postgrad mainly; specific programs for CIS countries", deadline: "Varies by program, typically Aug–Nov" },
      { name: "Deutschlandstipendium", coverage: "€300/month", eligibility: "Enrolled students with strong performance" },
      { name: "Heinrich Böll Foundation", coverage: "Full stipend", eligibility: "Engaged students with strong civic profile" },
      { name: "Friedrich Ebert Foundation", coverage: "Full stipend", eligibility: "Politically engaged students aligned with social democracy" },
    ],
    prosForCentralAsians: [
      "Public tuition is essentially free — total annual cost can be under $14,000",
      "World-class engineering, sciences, and applied programs",
      "Strong post-study work options; clear path to permanent residency",
      "DAAD has dedicated programs for Central Asian countries",
    ],
    prosForCentralAsiansRu: [
      "Государственное обучение практически бесплатно — общие расходы могут быть менее $14,000 в год",
      "Мирового уровня инженерия, науки, прикладные программы",
      "Сильные возможности работы после учёбы; чёткий путь к PR",
      "DAAD имеет специальные программы для стран ЦА",
    ],
    challenges: [
      "Most undergrad programs require C1 German",
      "CIS school diplomas usually require Studienkolleg or one year of home university",
      "Bureaucracy is real — registration, insurance, residence permit, blocked account",
      "Embassy appointment wait times can derail your timeline",
    ],
    challengesRu: [
      "Большинство программ бакалавриата требуют немецкий C1",
      "Аттестаты СНГ обычно требуют Studienkolleg или год обучения в вузе родной страны",
      "Бюрократия реальна — регистрация, страховка, ВНЖ, блокированный счёт",
      "Время ожидания приёма в посольстве может сорвать сроки",
    ],
    sources: [
      { label: "DAAD — Study in Germany", url: "https://www.daad.de/en/" },
      { label: "uni-assist", url: "https://www.uni-assist.de/en/" },
      { label: "Make it in Germany — Visa info", url: "https://www.make-it-in-germany.com/en/visa-residence/types/student-visa" },
    ],
  },
  {
    slug: "netherlands",
    country: "Netherlands",
    countryRu: "Нидерланды",
    flag: "🇳🇱",
    tagline: "English-taught programs, research-strong, EU work rights after graduation.",
    taglineRu: "Программы на английском, сильные исследования, право работы в ЕС после выпуска.",
    intro:
      "The Netherlands has more English-taught bachelor's and master's programs than any other non-Anglophone European country. Research universities (Universiteit) like Amsterdam, Delft, Leiden, and Utrecht are globally recognized; universities of applied sciences (Hogeschool) focus on practical training. After graduation, you can apply for a 'zoekjaar' (orientation year) to find work — leading to Highly Skilled Migrant status.",
    introRu:
      "В Нидерландах больше программ бакалавриата и магистратуры на английском, чем в любой другой неанглоязычной европейской стране. Исследовательские университеты (Universiteit) — Амстердам, Делфт, Лейден, Утрехт — известны во всём мире; университеты прикладных наук (Hogeschool) фокусируются на практической подготовке. После выпуска можно подать на 'zoekjaar' — год для поиска работы, ведущий к статусу высококвалифицированного мигранта.",
    popularCities: ["Amsterdam", "Rotterdam", "Utrecht", "Delft", "Leiden", "Groningen"],
    languageOfInstruction: ["English (most international programs)", "Dutch"],
    intakes: ["September (primary)", "February (limited, mainly master's)"],
    intakesRu: ["Сентябрь (основной)", "Февраль (ограниченный, в основном магистратура)"],
    applicationOverview:
      "Apply via Studielink (the central portal) and then submit additional documents to the university. Most programs have early application deadlines for non-EU students (often January 15 or May 1) due to visa processing time. Some competitive programs (medicine, psychology) have lottery or selection procedures (decentrale selectie).",
    applicationOverviewRu:
      "Подача через Studielink (центральный портал) с последующей передачей документов в университет. У большинства программ ранние дедлайны для не-ЕС студентов (часто 15 января или 1 мая) из-за времени оформления визы. У некоторых программ (медицина, психология) — лотерея или decentrale selectie.",
    typicalDeadlines: {
      undergrad: "Jan 15 – May 1 for non-EU (varies)",
      postgrad: "Varies; often Apr 1 for non-EU",
    },
    testRequirements: [
      { name: "IELTS Academic", minScore: "6.0–6.5 (research uni); 6.0 (applied uni)" },
      { name: "TOEFL iBT", minScore: "80–90" },
      { name: "Cambridge English (CAE/CPE)", minScore: "C1 Advanced+" },
    ],
    tuitionRangeUsd: "$9,000–$22,000/year (non-EU)",
    livingRangeUsd: "$12,000–$16,000/year",
    costs: [
      { label: "Tuition (research uni, undergrad, non-EU)", labelRu: "Обучение (исследовательский, бакалавриат)", rangeUsd: "9,000–18,000" },
      { label: "Tuition (research uni, master's, non-EU)", labelRu: "Обучение (магистратура)", rangeUsd: "15,000–22,000" },
      { label: "Accommodation", labelRu: "Жильё", rangeUsd: "5,000–9,000" },
      { label: "Health insurance", labelRu: "Медицинская страховка", rangeUsd: "500–1,800", notes: "Depends on whether you work" },
      { label: "Food + transport", labelRu: "Еда + транспорт", rangeUsd: "4,000–6,000" },
    ],
    visaName: "MVV (entry visa) + VVR (residence permit)",
    visaProcessingWeeks: "2–4 weeks (university files on your behalf)",
    proofOfFundsUsd: "€13,500–€16,000/year (varies by university)",
    visaSteps: [
      {
        step: "Get accepted to a recognized university",
        stepRu: "Получите зачисление в признанный вуз",
        detail: "Universities act as your sponsor — they file the visa application on your behalf.",
        detailRu: "Университеты выступают спонсором — они подают визовую заявку от вашего имени.",
      },
      {
        step: "Pay tuition deposit + provide proof of funds",
        stepRu: "Оплатите депозит за обучение + предоставьте финансовые документы",
        detail: "Either bank statement or transfer to university escrow.",
        detailRu: "Либо банковская выписка, либо перевод на эскроу университета.",
      },
      {
        step: "University files MVV + VVR application with IND",
        stepRu: "Университет подаёт заявку на MVV + VVR в IND",
        detail: "You provide documents to the university; they handle the IND submission.",
        detailRu: "Вы передаёте документы университету; они подают в IND.",
      },
      {
        step: "Collect MVV at Dutch embassy/consulate",
        stepRu: "Получите MVV в посольстве/консульстве",
        detail: "Once approved, schedule biometrics appointment.",
        detailRu: "После одобрения запишитесь на биометрию.",
      },
      {
        step: "Collect residence permit on arrival",
        stepRu: "Получите ВНЖ по прибытии",
        detail: "Pick up VVR card from IND within a few weeks of arrival.",
        detailRu: "Заберите карту VVR из IND в течение нескольких недель после прибытия.",
      },
    ],
    workRights: "16 hrs/week year-round OR full-time during summer (June, July, August). Employer needs work permit (TWV).",
    workRightsRu: "16 ч/нед круглогодично ИЛИ полная занятость летом (июнь–август). Работодателю нужен TWV.",
    postStudyWork: "Orientation year (zoekjaar): 1 year to find work. Then Highly Skilled Migrant pathway — strong for tech and STEM.",
    postStudyWorkRu: "Год ориентации (zoekjaar): 1 год для поиска работы. Далее путь Highly Skilled Migrant — особенно для tech и STEM.",
    scholarships: [
      { name: "Holland Scholarship", coverage: "€5,000 first year only", eligibility: "Non-EU students at participating universities" },
      { name: "Orange Tulip Scholarship (Nuffic Neso)", coverage: "Variable, partial to full", eligibility: "Specific countries; check Nuffic Neso for your country availability" },
      { name: "University-specific (Amsterdam Excellence, TU Delft Justus & Louise van Effen)", coverage: "Full to partial tuition", eligibility: "Top international applicants" },
    ],
    prosForCentralAsians: [
      "Most English-taught programs in Europe",
      "1-year orientation year (zoekjaar) for job search after graduation",
      "Strong universities at moderate cost relative to UK",
      "International student community; English widely spoken in cities",
    ],
    prosForCentralAsiansRu: [
      "Больше всего программ на английском в Европе",
      "1-летний год ориентации (zoekjaar) для поиска работы после выпуска",
      "Сильные университеты при умеренной стоимости относительно Великобритании",
      "Международное сообщество; английский широко распространён в городах",
    ],
    challenges: [
      "Severe student housing shortage — start looking the moment you get admitted",
      "Tuition for non-EU is roughly 4x EU tuition",
      "From 2025+ Dutch government is restricting English-taught programs — landscape may change",
      "Cost of living in Amsterdam is high",
    ],
    challengesRu: [
      "Острый дефицит студенческого жилья — ищите сразу после зачисления",
      "Стоимость обучения для не-ЕС примерно в 4 раза выше, чем для ЕС",
      "С 2025+ правительство ограничивает программы на английском — ситуация может измениться",
      "Стоимость жизни в Амстердаме высокая",
    ],
    sources: [
      { label: "Studielink", url: "https://www.studielink.nl/" },
      { label: "Nuffic — Study in Holland", url: "https://www.studyinnl.org/" },
      { label: "IND — Student residence permit", url: "https://ind.nl/en/study" },
    ],
  },
  {
    slug: "south-korea",
    country: "South Korea",
    countryRu: "Южная Корея",
    flag: "🇰🇷",
    tagline: "Generous government scholarships (GKS), strong tech, growing English programs.",
    taglineRu: "Щедрые государственные стипендии (GKS), сильный tech, растущее число программ на английском.",
    intro:
      "South Korea has aggressively recruited international students through the Global Korea Scholarship (GKS) — one of the most generous fully-funded scholarships in the world. Top universities (SNU, KAIST, Yonsei, Korea, POSTECH, SKKU) offer increasing numbers of English-taught programs, especially at master's level. Cost of living is moderate; Seoul has a vibrant international community. Korean language is helpful but not strictly required for many programs.",
    introRu:
      "Южная Корея активно привлекает иностранных студентов через Global Korea Scholarship (GKS) — одну из самых щедрых полностью покрываемых стипендий в мире. Топовые университеты (SNU, KAIST, Yonsei, Korea, POSTECH, SKKU) предлагают всё больше программ на английском, особенно в магистратуре. Стоимость жизни умеренная; в Сеуле живая международная среда. Корейский язык полезен, но не обязателен для многих программ.",
    popularCities: ["Seoul", "Daejeon (KAIST)", "Pohang (POSTECH)", "Busan"],
    languageOfInstruction: ["Korean", "English (growing share, especially STEM and business)"],
    intakes: ["March (primary)", "September"],
    intakesRu: ["Март (основной)", "Сентябрь"],
    applicationOverview:
      "Apply directly to each university — there is no central system. Documents typically include: high school transcript (apostilled and translated), self-introduction and study plan essays, recommendation letters, language proficiency certificate (TOPIK for Korean-taught; IELTS/TOEFL for English-taught), and financial documents. GKS scholarship has its own separate application process via embassy or university track.",
    applicationOverviewRu:
      "Подача напрямую в каждый университет — централизованной системы нет. Обычно требуются: школьный аттестат (апостиль + перевод), эссе self-introduction и study plan, рекомендации, сертификат языка (TOPIK для корейского; IELTS/TOEFL для английского), финансовые документы. У стипендии GKS отдельный процесс — через посольство или университет.",
    typicalDeadlines: {
      undergrad: "Sep–Nov (for March intake) · Apr–Jun (for Sep intake)",
      postgrad: "Similar; GKS deadlines: Feb–Mar (embassy), Mar–Apr (university)",
    },
    testRequirements: [
      { name: "TOPIK", minScore: "Level 3–6", notes: "For Korean-taught programs; level depends on field" },
      { name: "IELTS", minScore: "5.5–6.5" },
      { name: "TOEFL iBT", minScore: "71–88" },
    ],
    tuitionRangeUsd: "$4,000–$12,000/year (most programs)",
    livingRangeUsd: "$7,000–$12,000/year (Seoul)",
    costs: [
      { label: "Tuition (national universities)", labelRu: "Обучение (национальные)", rangeUsd: "4,000–8,000" },
      { label: "Tuition (top private: Yonsei, Korea, SKKU)", labelRu: "Обучение (топ частные)", rangeUsd: "8,000–12,000" },
      { label: "Dormitory", labelRu: "Общежитие", rangeUsd: "1,500–3,000" },
      { label: "Off-campus housing (Seoul)", labelRu: "Жильё вне кампуса (Сеул)", rangeUsd: "4,000–8,000" },
      { label: "Food", labelRu: "Еда", rangeUsd: "2,500–4,000" },
      { label: "Health insurance (NHIS, mandatory)", labelRu: "Медицинская страховка (NHIS, обязательна)", rangeUsd: "600–700" },
    ],
    visaName: "D-2 Student Visa",
    visaProcessingWeeks: "1–3 weeks",
    proofOfFundsUsd: "$10,000–$20,000 in bank account (varies by consulate)",
    visaSteps: [
      {
        step: "Receive Certificate of Admission and CoE",
        stepRu: "Получите сертификат о зачислении и CoE",
        detail: "Certificate of Eligibility processed by your university with Korean immigration.",
        detailRu: "Certificate of Eligibility оформляется университетом совместно с миграционной службой.",
      },
      {
        step: "Apply at Korean embassy/consulate",
        stepRu: "Подайте заявку в посольстве/консульстве Кореи",
        detail: "Documents: passport, application form, photos, CoE, admission letter, financial proof, transcripts.",
        detailRu: "Документы: паспорт, анкета, фото, CoE, письмо о зачислении, финансовые документы, транскрипты.",
      },
      {
        step: "Receive D-2 visa",
        stepRu: "Получите визу D-2",
        detail: "Single-entry initially; convert to multiple-entry after registering as alien.",
        detailRu: "Изначально однократная; конвертируется в многократную после регистрации.",
      },
      {
        step: "Register as alien within 90 days of arrival",
        stepRu: "Зарегистрируйтесь как иностранец в течение 90 дней",
        detail: "Get Alien Registration Card (ARC) at local immigration office.",
        detailRu: "Получите Alien Registration Card (ARC) в местной миграционной службе.",
      },
    ],
    workRights: "Up to 20 hrs/week during term (with TOPIK level 2+ usually required for off-campus); full-time during vacation.",
    workRightsRu: "До 20 ч/нед в семестре (обычно нужен TOPIK уровень 2+ для работы вне кампуса); полная занятость в каникулы.",
    postStudyWork: "D-10 job-seeker visa: 6 months extendable to 2 years total. E-7 work visa pathway for skilled fields.",
    postStudyWorkRu: "Виза для поиска работы D-10: 6 месяцев с возможностью продления до 2 лет. Путь к рабочей визе E-7 для квалифицированных специалистов.",
    scholarships: [
      { name: "Global Korea Scholarship (GKS, formerly KGSP)", coverage: "Full: tuition + monthly stipend (~$900–$1,200) + flights + Korean language year + insurance", eligibility: "Highly competitive; embassy or university track. Open to undergrad and postgrad.", deadline: "Feb–Mar (embassy) / Mar–Apr (university)" },
      { name: "University-specific scholarships (SNU, KAIST, Yonsei Underwood)", coverage: "Tuition reduction 30–100%", eligibility: "Strong academics; automatic or application" },
      { name: "POSCO Asia Fellowship", coverage: "Full funding for postgrad in Korea", eligibility: "Asian students; rolling deadlines" },
    ],
    prosForCentralAsians: [
      "GKS is one of the most generous scholarships globally — full funding genuinely possible",
      "Lower tuition and living costs than US/UK/Canada",
      "Strong tech, engineering, and Korean wave (K-content, business) opportunities",
      "Direct flights from Almaty, Tashkent, Bishkek to Seoul",
    ],
    prosForCentralAsiansRu: [
      "GKS — одна из самых щедрых стипендий мира",
      "Ниже стоимость обучения и жизни, чем в США/Великобритании/Канаде",
      "Сильные tech, инженерия, корейская волна (K-контент, бизнес)",
      "Прямые рейсы из Алматы, Ташкента, Бишкека в Сеул",
    ],
    challenges: [
      "Korean language is a real asset — without it, employment options narrow",
      "Cultural adjustment can be intense (work hours, hierarchy, social norms)",
      "Outside top universities, English-taught options are limited",
      "GKS is extremely competitive; backup plan is essential",
    ],
    challengesRu: [
      "Корейский язык — серьёзное преимущество; без него возможностей трудоустройства меньше",
      "Культурная адаптация может быть интенсивной (часы работы, иерархия, социальные нормы)",
      "Вне топ-вузов — мало программ на английском",
      "GKS крайне конкурентна; нужен запасной план",
    ],
    sources: [
      { label: "Study in Korea (official portal)", url: "https://www.studyinkorea.go.kr/" },
      { label: "Global Korea Scholarship (NIIED)", url: "https://www.studyinkorea.go.kr/en/sub/gks/allnew_invitation.do" },
      { label: "HiKorea (immigration)", url: "https://www.hikorea.go.kr/" },
    ],
  },
  {
    slug: "china",
    country: "China",
    countryRu: "Китай",
    flag: "🇨🇳",
    tagline: "Massive scholarship pool (CSC), top STEM universities, growing English programs.",
    taglineRu: "Огромный пул стипендий (CSC), топовые STEM-университеты, растущее число программ на английском.",
    intro:
      "China has invested heavily in international education through the China Scholarship Council (CSC), which funds thousands of full scholarships annually. Top universities (Tsinghua, Peking, Fudan, SJTU, Zhejiang) compete with global elite in engineering, computer science, and life sciences. Most undergraduate degrees are in Mandarin (with a year of Chinese first if needed); master's and PhD programs increasingly offer English tracks.",
    introRu:
      "Китай активно инвестирует в международное образование через China Scholarship Council (CSC), которая ежегодно финансирует тысячи полных стипендий. Топовые университеты (Tsinghua, Peking, Fudan, SJTU, Zhejiang) конкурируют с мировой элитой в инженерии, компьютерных и биологических науках. Большинство программ бакалавриата на китайском (с подготовительным годом языка при необходимости); магистратура и аспирантура всё чаще предлагают английские треки.",
    popularCities: ["Beijing", "Shanghai", "Hangzhou", "Guangzhou", "Wuhan", "Nanjing"],
    languageOfInstruction: ["Mandarin Chinese", "English (many master's/PhD programs)"],
    intakes: ["September (primary)", "March (limited)"],
    intakesRu: ["Сентябрь (основной)", "Март (ограниченный)"],
    applicationOverview:
      "Apply directly to universities or via CSC for scholarships. CSC has multiple channels: Type A (embassy nomination), Type B (university nomination), Type C (provincial). Documents: notarized transcripts, study plan, recommendations, language test, physical examination form, no-criminal-record certificate.",
    applicationOverviewRu:
      "Подача напрямую в университеты или через CSC для стипендий. У CSC несколько каналов: Type A (через посольство), Type B (через университет), Type C (провинциальный). Документы: нотариально заверенные транскрипты, план обучения, рекомендации, тест языка, форма медосмотра, справка о несудимости.",
    typicalDeadlines: {
      undergrad: "Feb–May for September intake",
      postgrad: "Dec–Mar for September intake; CSC: typically ends April",
    },
    testRequirements: [
      { name: "HSK", minScore: "Level 4–6", notes: "For Chinese-taught programs" },
      { name: "IELTS / TOEFL", minScore: "6.0 / 80", notes: "For English-taught programs" },
    ],
    tuitionRangeUsd: "$3,000–$10,000/year",
    livingRangeUsd: "$3,500–$8,000/year",
    costs: [
      { label: "Tuition (most undergrad)", labelRu: "Обучение (бакалавриат)", rangeUsd: "3,000–6,000" },
      { label: "Tuition (top universities, English programs)", labelRu: "Обучение (топ вузы, английские программы)", rangeUsd: "6,000–10,000" },
      { label: "Dormitory", labelRu: "Общежитие", rangeUsd: "800–2,500" },
      { label: "Food", labelRu: "Еда", rangeUsd: "1,500–3,000" },
      { label: "Health insurance (mandatory)", labelRu: "Медицинская страховка (обязательна)", rangeUsd: "100–120" },
    ],
    visaName: "X1 Visa (study > 180 days)",
    visaProcessingWeeks: "1–2 weeks",
    proofOfFundsUsd: "Typically not required if scholarship; otherwise ~$10,000",
    visaSteps: [
      {
        step: "Receive JW201 or JW202 form from university",
        stepRu: "Получите форму JW201 или JW202 от университета",
        detail: "Plus admission notice. JW201 is for government scholarship students.",
        detailRu: "Плюс уведомление о зачислении. JW201 — для стипендиатов государственной программы.",
      },
      {
        step: "Complete medical examination (Foreigner Physical Examination Form)",
        stepRu: "Пройдите медосмотр (Foreigner Physical Examination Form)",
        detail: "At an approved clinic; valid for 6 months.",
        detailRu: "В аккредитованной клинике; действителен 6 месяцев.",
      },
      {
        step: "Apply at Chinese embassy or via CVASC",
        stepRu: "Подайте в посольстве Китая или через CVASC",
        detail: "Submit documents and biometrics.",
        detailRu: "Сдайте документы и биометрию.",
      },
      {
        step: "Convert X1 to residence permit within 30 days of arrival",
        stepRu: "Конвертируйте X1 в ВНЖ в течение 30 дней",
        detail: "At local Public Security Bureau Exit and Entry Administration.",
        detailRu: "В местном управлении выхода/въезда Бюро общественной безопасности.",
      },
    ],
    workRights: "Generally restricted — internships allowed with university and PSB approval. Off-campus work largely prohibited for student visa holders.",
    workRightsRu: "Обычно ограничены — стажировки разрешены с одобрения вуза и PSB. Работа вне кампуса в основном запрещена.",
    postStudyWork: "No automatic post-study work visa. Must obtain work permit (Z visa) with employer sponsorship; new graduate-friendly policies in pilot cities.",
    postStudyWorkRu: "Нет автоматической визы после выпуска. Нужно получить рабочее разрешение (Z визу) с работодателем; в пилотных городах есть новые программы для выпускников.",
    scholarships: [
      { name: "Chinese Government Scholarship (CSC)", coverage: "Full: tuition + dorm + monthly stipend ($350–$500) + insurance", eligibility: "Multiple tracks; Type A via embassy, Type B via university", deadline: "Typically Jan–Apr" },
      { name: "Confucius Institute Scholarship", coverage: "Tuition + stipend for Chinese language and Chinese-related programs", eligibility: "Through Confucius Institutes; HSK test required" },
      { name: "Provincial and Municipal Government Scholarships (Beijing, Shanghai, Jiangsu)", coverage: "Tuition reduction or stipend", eligibility: "Apply via partner universities" },
      { name: "University-specific (Tsinghua Schwarzman, Peking Yenching)", coverage: "Fully funded for selected master's programs", eligibility: "Highly competitive; separate application" },
    ],
    prosForCentralAsians: [
      "Largest scholarship pool in Asia (CSC funds thousands annually)",
      "Cost of living is among the lowest of major destinations",
      "Strong universities in tech, engineering, traditional Chinese medicine, business",
      "Geographic and cultural proximity for Central Asians; established CIS communities",
    ],
    prosForCentralAsiansRu: [
      "Крупнейший пул стипендий в Азии (CSC финансирует тысячи в год)",
      "Стоимость жизни одна из самых низких среди основных направлений",
      "Сильные вузы в tech, инженерии, традиционной китайской медицине, бизнесе",
      "Географическая и культурная близость для ЦА; устоявшиеся русскоязычные общины",
    ],
    challenges: [
      "Mandarin is essential for full integration and most undergrad programs",
      "Internet restrictions (Great Firewall) — VPN reliability varies",
      "Limited post-study work options compared to US/Canada/UK",
      "Western degree recognition uneven outside top-50 Chinese universities",
    ],
    challengesRu: [
      "Китайский язык необходим для полной интеграции и большинства бакалаврских программ",
      "Интернет-ограничения (Great Firewall) — надёжность VPN различная",
      "Ограниченные возможности работы после выпуска по сравнению с США/Канадой/Великобританией",
      "Признание дипломов на Западе нестабильно вне топ-50 вузов",
    ],
    sources: [
      { label: "China Scholarship Council (CSC)", url: "https://www.campuschina.org/" },
      { label: "Study in China (Ministry of Education)", url: "http://www.moe.gov.cn/" },
      { label: "China Visa Application Service Center (CVASC)", url: "https://www.visaforchina.cn/" },
    ],
  },
];

export const getCountryGuide = (slug: string) => countryGuides.find((g) => g.slug === slug);
