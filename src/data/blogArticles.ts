export interface BlogArticle {
  id: string;
  title: string;
  titleRu: string;
  excerpt: string;
  excerptRu: string;
  readTime: string;
  readTimeRu: string;
  category: string;
  categoryRu: string;
  image: string;
  content: string[];
  contentRu: string[];
}

export const blogArticles: BlogArticle[] = [
  {
    id: "5-mistakes-study-abroad",
    title: "5 Biggest Mistakes Students Make When Applying Abroad",
    titleRu: "5 самых больших ошибок при поступлении за рубеж",
    excerpt: "From choosing universities for the wrong reasons to submitting generic essays — here are the pitfalls that cost students their dream admissions, and how to avoid them.",
    excerptRu: "От выбора университетов по неправильным причинам до шаблонных эссе — вот ловушки, которые стоят студентам поступления мечты, и как их избежать.",
    readTime: "6 min",
    readTimeRu: "6 мин",
    category: "Admissions",
    categoryRu: "Поступление",
    image: "https://images.unsplash.com/photo-1523050854058-8df90110c476?w=800&q=80",
    content: [
      "Every year, thousands of ambitious students from Central Asia and beyond set their sights on top universities in the US, UK, Canada, and Europe. Yet many fall into the same traps that could have been easily avoided with the right guidance.",
      "**1. Applying Only to \"Dream\" Schools**\nMany students only apply to the most prestigious names — Harvard, Oxford, MIT — without building a balanced list. A strong application strategy includes reach, match, and safety schools. Don't let prestige blind you to excellent programs that are a better fit for your profile.",
      "**2. Writing Generic Personal Statements**\nAdmissions officers read thousands of essays. \"I've always been passionate about...\" doesn't stand out. The best essays are specific, personal, and show self-awareness. Tell a story only you can tell.",
      "**3. Ignoring Financial Planning**\nTuition is just the beginning. Housing, insurance, books, travel — costs add up fast. Many students don't research scholarships early enough or underestimate the cost of living. Use tools like our Discover cost calculator to plan realistically.",
      "**4. Waiting Until the Last Minute**\nStrong applications take months, not weeks. Starting your essays in November for a January deadline is a recipe for mediocrity. Begin research in the spring, draft essays over summer, and refine in the fall.",
      "**5. Not Getting Expert Feedback**\nYour English teacher and your parents mean well, but they may not understand what top universities are looking for. Seek feedback from people who have been through the process recently and understand current admissions trends.",
    ],
    contentRu: [
      "Каждый год тысячи амбициозных студентов из Центральной Азии нацеливаются на топовые университеты США, Великобритании, Канады и Европы. Но многие попадают в одни и те же ловушки, которых можно было легко избежать.",
      "**1. Подача только в «университеты мечты»**\nМногие студенты подают заявки только в самые престижные — Гарвард, Оксфорд, MIT — не составляя сбалансированного списка. Сильная стратегия включает амбициозные, подходящие и запасные варианты.",
      "**2. Шаблонные мотивационные письма**\nПриёмные комиссии читают тысячи эссе. «Я всегда мечтал о...» не выделяется. Лучшие эссе конкретны, личны и показывают самосознание. Расскажите историю, которую можете рассказать только вы.",
      "**3. Игнорирование финансового планирования**\nОбучение — это только начало. Жильё, страховка, книги, перелёты — расходы растут быстро. Многие студенты не ищут стипендии достаточно рано. Используйте наш калькулятор расходов в разделе Discover.",
      "**4. Всё в последний момент**\nСильные заявки требуют месяцев, а не недель. Начинать эссе в ноябре для январского дедлайна — рецепт посредственности. Начните исследование весной, пишите черновики летом, дорабатывайте осенью.",
      "**5. Отсутствие экспертной обратной связи**\nВаш учитель английского и родители желают добра, но они могут не понимать, что ищут топовые университеты. Обращайтесь за обратной связью к людям, которые недавно прошли этот процесс.",
    ],
  },
  {
    id: "ielts-first-attempt",
    title: "How to Score 7.0+ on IELTS on Your First Attempt",
    titleRu: "Как набрать 7.0+ по IELTS с первой попытки",
    excerpt: "A practical, no-fluff guide to IELTS preparation — from study schedules to test-day strategies that actually work for non-native speakers.",
    excerptRu: "Практическое руководство по подготовке к IELTS — от графиков обучения до стратегий дня экзамена, которые реально работают.",
    readTime: "8 min",
    readTimeRu: "8 мин",
    category: "Test Prep",
    categoryRu: "Подготовка",
    image: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&q=80",
    content: [
      "IELTS is the gateway to studying abroad for millions of students. But many take it 2 or 3 times before hitting their target score. Here's how to do it right the first time.",
      "**Understand the Format Inside Out**\nBefore you start studying content, understand the test structure. IELTS Academic has four sections: Listening (40 min), Reading (60 min), Writing (60 min), and Speaking (11–14 min). Each section tests different skills and requires different strategies.",
      "**Focus on Your Weakest Section First**\nTake a diagnostic test early. Most students from Central Asia score well in Reading and Listening but struggle with Writing and Speaking. Identify your weak spots and allocate 60% of your study time there.",
      "**Writing: Structure Beats Vocabulary**\nDon't try to impress with big words. Band 7 writing is about clear structure, coherent arguments, and accurate grammar. Learn the Task 2 essay formula: introduction with thesis, 2 body paragraphs with examples, conclusion. Practice writing timed essays weekly.",
      "**Speaking: Practice With a Timer**\nPart 2 (the long turn) trips up most students. Practice speaking for exactly 2 minutes on random topics. Record yourself, listen back, and note filler words and grammar mistakes. AI tutors like TopUni Prep can give you instant feedback.",
      "**The 30-Day Sprint Plan**\nWeeks 1–2: Diagnostic + focus on weakest sections. Weeks 3–4: Full practice tests under timed conditions. Final 3 days: Light review, rest, and confidence building. Cramming the night before hurts more than it helps.",
      "**Test Day Tips**\nBring your ID, arrive early, eat a good breakfast. For listening, read ahead — skim the next questions while the audio plays. For reading, don't read the entire passage first; scan for answers. For writing, spend 5 minutes planning before you write.",
    ],
    contentRu: [
      "IELTS — это пропуск к обучению за рубежом для миллионов студентов. Но многие сдают его 2–3 раза, прежде чем набирают нужный балл. Вот как сделать это с первого раза.",
      "**Изучите формат досконально**\nПрежде чем учить содержание, поймите структуру теста. IELTS Academic состоит из четырёх частей: Listening (40 мин), Reading (60 мин), Writing (60 мин) и Speaking (11–14 мин).",
      "**Сосредоточьтесь на слабых местах**\nПройдите диагностический тест в начале. Большинство студентов из Центральной Азии хорошо справляются с Reading и Listening, но испытывают трудности с Writing и Speaking. Выделите 60% времени на слабые навыки.",
      "**Writing: Структура важнее словаря**\nНе пытайтесь впечатлить сложными словами. Балл 7 в Writing — это чёткая структура, логичные аргументы и точная грамматика. Выучите формулу эссе Task 2 и практикуйтесь еженедельно.",
      "**Speaking: Тренируйтесь с таймером**\nЧасть 2 (монолог) ставит в тупик большинство. Тренируйтесь говорить ровно 2 минуты на случайные темы. Записывайте себя, переслушивайте и замечайте ошибки. AI-репетитор TopUni Prep даст мгновенную обратную связь.",
      "**30-дневный план**\nНедели 1–2: Диагностика + работа над слабыми местами. Недели 3–4: Полные пробные тесты в условиях таймера. Последние 3 дня: лёгкое повторение, отдых и уверенность.",
      "**Советы на день экзамена**\nВозьмите паспорт, приходите заранее, хорошо позавтракайте. В Listening читайте вперёд. В Reading не читайте весь текст — ищите ответы сканированием. В Writing потратьте 5 минут на план перед тем, как писать.",
    ],
  },
  {
    id: "sat-vs-ielts",
    title: "SAT vs. IELTS: Which Test Should You Take First?",
    titleRu: "SAT или IELTS: какой тест сдавать первым?",
    excerpt: "Strategic test planning can save you months of preparation time. Here's how to sequence your exams for maximum impact on your applications.",
    excerptRu: "Стратегическое планирование тестов может сэкономить месяцы подготовки. Вот как правильно выстроить последовательность экзаменов.",
    readTime: "5 min",
    readTimeRu: "5 мин",
    category: "Test Prep",
    categoryRu: "Подготовка",
    image: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800&q=80",
    content: [
      "If you're applying to US universities, you'll likely need both the SAT and IELTS (or TOEFL). The question isn't whether to take them — it's in what order.",
      "**Start With IELTS If Your English Needs Work**\nIELTS measures your English proficiency. The SAT assumes it. If you're not yet comfortable reading complex English passages quickly, prepare for IELTS first. The language skills you build will directly help your SAT verbal score.",
      "**Start With SAT If Your English Is Already Strong**\nIf you're already at B2+ level in English, the SAT might be the harder test for you because of its reasoning and math components. Tackle it first when your study energy is highest.",
      "**The Ideal Timeline**\nGrade 10: Take IELTS (aim for 6.5+). Grade 11 fall: Focus on SAT prep. Grade 11 spring: Take SAT. Grade 11 summer: Retake IELTS if needed (aim for 7.0+). Grade 12 fall: Final retakes if necessary + applications.",
      "**Don't Overlook Test-Optional Schools**\nMany US universities are now test-optional for the SAT. But strong scores still help, especially for international students seeking scholarships. IELTS is almost never optional for non-native English speakers.",
      "**Prep Resources**\nOfficial practice tests are the gold standard for both exams. Supplement with adaptive practice tools like TopUni Prep, which adjusts difficulty based on your performance and provides AI-powered feedback on writing sections.",
    ],
    contentRu: [
      "Если вы поступаете в университеты США, вам, скорее всего, понадобятся и SAT, и IELTS. Вопрос не в том, сдавать ли их, а в каком порядке.",
      "**Начните с IELTS, если английский нужно подтянуть**\nIELTS измеряет владение английским. SAT предполагает его. Если вам пока некомфортно быстро читать сложные тексты на английском, готовьтесь к IELTS первым.",
      "**Начните с SAT, если английский уже сильный**\nЕсли ваш уровень B2+, SAT может быть сложнее из-за логических задач и математики. Беритесь за него, пока энергия на максимуме.",
      "**Идеальный таймлайн**\n10 класс: сдайте IELTS (цель — 6.5+). Осень 11 класса: подготовка к SAT. Весна 11 класса: сдайте SAT. Лето 11 класса: пересдача IELTS если нужно (цель — 7.0+). Осень 12 класса: финальные пересдачи + заявки.",
      "**Не забывайте о test-optional**\nМногие университеты США сейчас не требуют SAT. Но сильные баллы помогают, особенно для стипендий. IELTS почти никогда не является необязательным для неносителей.",
      "**Ресурсы для подготовки**\nОфициальные пробные тесты — золотой стандарт для обоих экзаменов. Дополните адаптивной практикой TopUni Prep, которая подстраивает сложность и даёт AI-обратную связь по Writing.",
    ],
  },
];
