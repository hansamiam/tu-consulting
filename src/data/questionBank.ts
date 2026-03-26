export interface BankQuestion {
  id: string;
  section: string;       // Reading, Writing, Listening, Speaking, Math, Vocabulary, Grammar
  subSkill: string;      // e.g. "inference", "main-idea", "algebra", "verb-tense"
  difficulty: 1 | 2 | 3; // 1=easy, 2=medium, 3=hard
  exam: "ielts" | "sat" | "both";
  question: string;
  options: string[];
  correct: number;
  explanation: string;
  timeLimit?: number;    // seconds
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VOCABULARY (20 questions)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const vocab: BankQuestion[] = [
  { id: "v1", section: "Vocabulary", subSkill: "academic-words", difficulty: 1, exam: "both", question: "What does 'pragmatic' mean?", options: ["Idealistic", "Practical and realistic", "Pessimistic", "Romantic"], correct: 1, explanation: "'Pragmatic' means dealing with things sensibly and realistically." },
  { id: "v2", section: "Vocabulary", subSkill: "academic-words", difficulty: 1, exam: "both", question: "Choose the synonym of 'ephemeral':", options: ["Permanent", "Short-lived", "Mysterious", "Heavy"], correct: 1, explanation: "'Ephemeral' means lasting for a very short time." },
  { id: "v3", section: "Vocabulary", subSkill: "academic-words", difficulty: 1, exam: "both", question: "'Benevolent' most nearly means:", options: ["Cruel", "Indifferent", "Kind and generous", "Weak"], correct: 2, explanation: "'Benevolent' means well-meaning and kindly." },
  { id: "v4", section: "Vocabulary", subSkill: "academic-words", difficulty: 1, exam: "both", question: "What does 'eloquent' describe?", options: ["Quiet speech", "Fluent and persuasive speech", "Angry speech", "Slow speech"], correct: 1, explanation: "'Eloquent' means fluent or persuasive in speaking or writing." },
  { id: "v5", section: "Vocabulary", subSkill: "academic-words", difficulty: 1, exam: "both", question: "The word 'meticulous' means:", options: ["Careless", "Very careful and precise", "Quick", "Lazy"], correct: 1, explanation: "'Meticulous' means showing great attention to detail." },
  { id: "v6", section: "Vocabulary", subSkill: "context-clues", difficulty: 2, exam: "both", question: "'The CEO's decision was unilateral.' 'Unilateral' means:", options: ["Collaborative", "One-sided", "Temporary", "Profitable"], correct: 1, explanation: "'Unilateral' means made by one party without the agreement of others." },
  { id: "v7", section: "Vocabulary", subSkill: "context-clues", difficulty: 2, exam: "both", question: "'Despite his recalcitrant behavior, he was given another chance.' 'Recalcitrant' means:", options: ["Cooperative", "Stubbornly disobedient", "Cheerful", "Confused"], correct: 1, explanation: "'Recalcitrant' means having an obstinately uncooperative attitude." },
  { id: "v8", section: "Vocabulary", subSkill: "word-roots", difficulty: 2, exam: "both", question: "The prefix 'anti-' means:", options: ["Before", "Against", "After", "With"], correct: 1, explanation: "'Anti-' is a prefix meaning against or opposed to." },
  { id: "v9", section: "Vocabulary", subSkill: "collocations", difficulty: 2, exam: "ielts", question: "Which collocation is correct?", options: ["Make a decision", "Do a decision", "Take a decision", "Both A and C"], correct: 3, explanation: "Both 'make a decision' and 'take a decision' are acceptable." },
  { id: "v10", section: "Vocabulary", subSkill: "word-roots", difficulty: 3, exam: "both", question: "'Antediluvian' most nearly means:", options: ["Modern", "Extremely old-fashioned", "Underwater", "Explosive"], correct: 1, explanation: "'Antediluvian' literally means 'before the flood' — extremely old." },
  { id: "v11", section: "Vocabulary", subSkill: "academic-words", difficulty: 2, exam: "both", question: "What does 'ubiquitous' mean?", options: ["Rare", "Found everywhere", "Dangerous", "Beautiful"], correct: 1, explanation: "'Ubiquitous' means present everywhere." },
  { id: "v12", section: "Vocabulary", subSkill: "academic-words", difficulty: 2, exam: "both", question: "'Ameliorate' means:", options: ["Worsen", "Improve", "Maintain", "Destroy"], correct: 1, explanation: "'Ameliorate' means to make something better." },
  { id: "v13", section: "Vocabulary", subSkill: "academic-words", difficulty: 3, exam: "both", question: "'Sycophant' refers to:", options: ["A wise person", "A flatterer seeking advantage", "A rebel", "A teacher"], correct: 1, explanation: "A sycophant is someone who acts obsequiously to gain advantage." },
  { id: "v14", section: "Vocabulary", subSkill: "academic-words", difficulty: 3, exam: "sat", question: "'Perfunctory' most nearly means:", options: ["Thorough", "Done without care", "Excellent", "Repetitive"], correct: 1, explanation: "'Perfunctory' means carried out without real interest or care." },
  { id: "v15", section: "Vocabulary", subSkill: "academic-words", difficulty: 1, exam: "both", question: "'Ambiguous' means:", options: ["Clear", "Open to interpretation", "Forceful", "Boring"], correct: 1, explanation: "'Ambiguous' means open to more than one interpretation." },
  { id: "v16", section: "Vocabulary", subSkill: "collocations", difficulty: 2, exam: "ielts", question: "Which is correct: 'a ___ rise in temperature'?", options: ["Sharp", "Strong", "Heavy", "Thick"], correct: 0, explanation: "We say 'a sharp rise' in academic English." },
  { id: "v17", section: "Vocabulary", subSkill: "academic-words", difficulty: 3, exam: "both", question: "'Obfuscate' means:", options: ["Clarify", "Make unclear", "Accelerate", "Criticize"], correct: 1, explanation: "'Obfuscate' means to render obscure or unclear." },
  { id: "v18", section: "Vocabulary", subSkill: "context-clues", difficulty: 1, exam: "both", question: "'The resilient community rebuilt after the disaster.' 'Resilient' means:", options: ["Fragile", "Able to recover quickly", "Wealthy", "Isolated"], correct: 1, explanation: "'Resilient' means able to recover quickly from difficulties." },
  { id: "v19", section: "Vocabulary", subSkill: "academic-words", difficulty: 2, exam: "both", question: "'Empirical' means based on:", options: ["Theory", "Observation and experiment", "Tradition", "Opinion"], correct: 1, explanation: "'Empirical' means based on observation or experience rather than theory." },
  { id: "v20", section: "Vocabulary", subSkill: "academic-words", difficulty: 3, exam: "sat", question: "'Enervate' means:", options: ["Energize", "Weaken", "Anger", "Enlighten"], correct: 1, explanation: "'Enervate' means to cause someone to feel drained of energy." },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// READING COMPREHENSION (20 questions)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const reading: BankQuestion[] = [
  { id: "r1", section: "Reading", subSkill: "main-idea", difficulty: 1, exam: "both", question: "What is the primary purpose of a thesis statement?", options: ["Summarize the conclusion", "Present the main argument", "List evidence", "Introduce the author"], correct: 1, explanation: "A thesis statement presents the essay's central claim." },
  { id: "r2", section: "Reading", subSkill: "inference", difficulty: 2, exam: "both", question: "What does 'inference' mean in reading?", options: ["Copying text", "Drawing conclusions from evidence", "Guessing randomly", "Summarizing"], correct: 1, explanation: "Inference means using evidence to reach a logical conclusion." },
  { id: "r3", section: "Reading", subSkill: "rhetoric", difficulty: 2, exam: "both", question: "Which is NOT a feature of persuasive writing?", options: ["Emotional appeals", "Objective neutrality", "Call to action", "Rhetorical questions"], correct: 1, explanation: "Persuasive writing is subjective by nature." },
  { id: "r4", section: "Reading", subSkill: "vocab-in-context", difficulty: 1, exam: "both", question: "'The findings corroborate earlier studies' — 'corroborate' means:", options: ["Contradict", "Confirm", "Ignore", "Replace"], correct: 1, explanation: "'Corroborate' means to confirm or support with evidence." },
  { id: "r5", section: "Reading", subSkill: "main-idea", difficulty: 1, exam: "both", question: "An author's primary purpose when using an anecdote is to:", options: ["Confuse readers", "Illustrate a point", "Add word count", "Change topic"], correct: 1, explanation: "Anecdotes illustrate points through brief stories." },
  { id: "r6", section: "Reading", subSkill: "inference", difficulty: 2, exam: "both", question: "'However' in academic texts signals:", options: ["Agreement", "Contrast", "Conclusion", "An example"], correct: 1, explanation: "'However' introduces a contrasting idea." },
  { id: "r7", section: "Reading", subSkill: "detail", difficulty: 1, exam: "ielts", question: "In IELTS True/False/Not Given, 'Not Given' means:", options: ["The statement is false", "The passage doesn't contain this info", "The statement is partially true", "You need to guess"], correct: 1, explanation: "'Not Given' means the passage doesn't provide information about the statement." },
  { id: "r8", section: "Reading", subSkill: "structure", difficulty: 2, exam: "both", question: "A topic sentence typically appears:", options: ["At the end of a paragraph", "At the beginning of a paragraph", "In the conclusion", "In footnotes"], correct: 1, explanation: "Topic sentences usually open paragraphs to state the main point." },
  { id: "r9", section: "Reading", subSkill: "inference", difficulty: 3, exam: "sat", question: "When an author uses irony, they:", options: ["Mean exactly what they say", "Say the opposite of what they mean", "Quote another author", "Use statistics"], correct: 1, explanation: "Irony involves saying the opposite of what is meant for rhetorical effect." },
  { id: "r10", section: "Reading", subSkill: "rhetoric", difficulty: 3, exam: "sat", question: "An 'ad hominem' argument attacks:", options: ["The evidence", "The person making the argument", "The logic", "The conclusion"], correct: 1, explanation: "Ad hominem attacks the person rather than addressing their argument." },
  { id: "r11", section: "Reading", subSkill: "structure", difficulty: 2, exam: "ielts", question: "Skimming is best used for:", options: ["Detailed analysis", "Getting the general idea quickly", "Finding specific numbers", "Memorizing text"], correct: 1, explanation: "Skimming helps you quickly grasp the overall meaning." },
  { id: "r12", section: "Reading", subSkill: "detail", difficulty: 2, exam: "ielts", question: "Scanning is best for finding:", options: ["The main argument", "Specific facts like dates and names", "The author's tone", "Hidden meanings"], correct: 1, explanation: "Scanning helps locate specific information quickly." },
  { id: "r13", section: "Reading", subSkill: "vocab-in-context", difficulty: 3, exam: "both", question: "'The government's laissez-faire approach allowed market forces to operate freely.' 'Laissez-faire' means:", options: ["Strict regulation", "Non-interference", "Active intervention", "Corruption"], correct: 1, explanation: "'Laissez-faire' means a policy of non-interference." },
  { id: "r14", section: "Reading", subSkill: "rhetoric", difficulty: 3, exam: "sat", question: "What rhetorical device is: 'Shall I compare thee to a summer's day?'", options: ["Metaphor", "Simile", "Rhetorical question", "Hyperbole"], correct: 2, explanation: "This is a rhetorical question — asked for effect, not an answer." },
  { id: "r15", section: "Reading", subSkill: "main-idea", difficulty: 1, exam: "both", question: "The conclusion of an essay should:", options: ["Introduce new arguments", "Restate and synthesize main points", "Include raw data", "Begin a new topic"], correct: 1, explanation: "Conclusions synthesize the essay's main arguments." },
  { id: "r16", section: "Reading", subSkill: "inference", difficulty: 3, exam: "sat", question: "An author's 'tone' refers to:", options: ["Volume of text", "Attitude toward the subject", "Length of sentences", "Number of citations"], correct: 1, explanation: "Tone is the author's attitude conveyed through word choice." },
  { id: "r17", section: "Reading", subSkill: "detail", difficulty: 2, exam: "ielts", question: "In IELTS matching headings, you should:", options: ["Read every word carefully", "Skim paragraphs for key themes", "Guess randomly", "Match by paragraph length"], correct: 1, explanation: "Skim each paragraph's opening and closing for key themes." },
  { id: "r18", section: "Reading", subSkill: "structure", difficulty: 2, exam: "both", question: "A 'counterargument' in an essay serves to:", options: ["Weaken the essay", "Show awareness of opposing views", "Confuse the reader", "End the discussion"], correct: 1, explanation: "Counterarguments strengthen an essay by acknowledging opposition." },
  { id: "r19", section: "Reading", subSkill: "vocab-in-context", difficulty: 2, exam: "both", question: "'The data was inconclusive.' This means:", options: ["Definitive", "Not providing a clear answer", "Falsified", "Complete"], correct: 1, explanation: "'Inconclusive' means not leading to a definite conclusion." },
  { id: "r20", section: "Reading", subSkill: "main-idea", difficulty: 3, exam: "sat", question: "An author who presents multiple perspectives without choosing one is using:", options: ["Advocacy", "Objective analysis", "Satire", "Allegory"], correct: 1, explanation: "Objective analysis presents multiple views without bias." },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GRAMMAR (15 questions)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const grammar: BankQuestion[] = [
  { id: "g1", section: "Grammar", subSkill: "verb-tense", difficulty: 1, exam: "both", question: "Choose the correct form: 'She _____ to the store yesterday.'", options: ["go", "goes", "went", "going"], correct: 2, explanation: "Past simple 'went' is correct for a completed action yesterday." },
  { id: "g2", section: "Grammar", subSkill: "subject-verb", difficulty: 2, exam: "both", question: "'Neither the students nor the teacher _____ aware.'", options: ["were", "was", "are", "is being"], correct: 1, explanation: "With 'neither...nor', the verb agrees with the nearest subject (teacher = singular)." },
  { id: "g3", section: "Grammar", subSkill: "pronoun", difficulty: 1, exam: "both", question: "Which sentence is grammatically correct?", options: ["Me and him went.", "He and I went.", "Him and I went.", "Him and me went."], correct: 1, explanation: "'He and I' uses subject pronouns correctly." },
  { id: "g4", section: "Grammar", subSkill: "cohesion", difficulty: 2, exam: "ielts", question: "Which cohesive device shows contrast?", options: ["Furthermore", "Nevertheless", "In addition", "Similarly"], correct: 1, explanation: "'Nevertheless' introduces a contrasting point." },
  { id: "g5", section: "Grammar", subSkill: "verb-tense", difficulty: 2, exam: "both", question: "'By the time we arrived, the movie _____.'", options: ["started", "has started", "had started", "starts"], correct: 2, explanation: "Past perfect 'had started' for an action completed before another past action." },
  { id: "g6", section: "Grammar", subSkill: "article", difficulty: 1, exam: "ielts", question: "'She is _____ honest person.'", options: ["a", "an", "the", "no article"], correct: 1, explanation: "'An' is used before words beginning with a vowel sound." },
  { id: "g7", section: "Grammar", subSkill: "relative-clause", difficulty: 2, exam: "both", question: "'The book _____ I read was excellent.'", options: ["who", "which", "whom", "whose"], correct: 1, explanation: "'Which' or 'that' is used for things in relative clauses." },
  { id: "g8", section: "Grammar", subSkill: "conditional", difficulty: 3, exam: "both", question: "'If I _____ you, I would apologize.'", options: ["am", "was", "were", "be"], correct: 2, explanation: "Second conditional uses 'were' for all subjects (subjunctive mood)." },
  { id: "g9", section: "Grammar", subSkill: "passive", difficulty: 2, exam: "ielts", question: "'The report _____ by the committee last week.'", options: ["written", "was written", "wrote", "has written"], correct: 1, explanation: "Passive voice: 'was written' for past simple passive." },
  { id: "g10", section: "Grammar", subSkill: "parallel", difficulty: 3, exam: "sat", question: "Choose the parallel structure: 'She likes swimming, _____, and cycling.'", options: ["to run", "running", "she runs", "run"], correct: 1, explanation: "Parallel structure requires matching forms: swimming, running, cycling." },
  { id: "g11", section: "Grammar", subSkill: "modifier", difficulty: 3, exam: "sat", question: "'Walking to school, the rain started.' This sentence has:", options: ["A dangling modifier", "Correct grammar", "A split infinitive", "A comma splice"], correct: 0, explanation: "The rain wasn't walking — this is a dangling modifier." },
  { id: "g12", section: "Grammar", subSkill: "punctuation", difficulty: 2, exam: "both", question: "A semicolon is used to:", options: ["Introduce a list", "Join two independent clauses", "End a question", "Show possession"], correct: 1, explanation: "Semicolons connect two closely related independent clauses." },
  { id: "g13", section: "Grammar", subSkill: "verb-tense", difficulty: 3, exam: "ielts", question: "'I wish I _____ harder last semester.'", options: ["study", "studied", "had studied", "would study"], correct: 2, explanation: "'Wish' + past perfect expresses regret about the past." },
  { id: "g14", section: "Grammar", subSkill: "subject-verb", difficulty: 1, exam: "both", question: "'The team _____ working on the project.'", options: ["is", "are", "were", "A or B depending on dialect"], correct: 3, explanation: "Collective nouns can take singular (AmE) or plural (BrE) verbs." },
  { id: "g15", section: "Grammar", subSkill: "conditional", difficulty: 3, exam: "both", question: "'Had I known, I _____ differently.'", options: ["would act", "would have acted", "acted", "will act"], correct: 1, explanation: "Third conditional: 'Had I known' + 'would have acted'." },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SAT MATH (25 questions)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const math: BankQuestion[] = [
  { id: "m1", section: "Math", subSkill: "algebra", difficulty: 1, exam: "sat", question: "If 3x + 7 = 22, what is x?", options: ["3", "5", "7", "15"], correct: 1, explanation: "3x = 15, so x = 5." },
  { id: "m2", section: "Math", subSkill: "geometry", difficulty: 1, exam: "sat", question: "Slope of line through (2,3) and (6,11)?", options: ["1", "2", "3", "4"], correct: 1, explanation: "Slope = (11-3)/(6-2) = 8/4 = 2." },
  { id: "m3", section: "Math", subSkill: "geometry", difficulty: 1, exam: "sat", question: "Circle with radius 5, area = ?", options: ["25π", "10π", "50π", "5π"], correct: 0, explanation: "Area = πr² = 25π." },
  { id: "m4", section: "Math", subSkill: "algebra", difficulty: 1, exam: "sat", question: "Solve: 2(x+3) = 14", options: ["x=2", "x=4", "x=5.5", "x=7"], correct: 1, explanation: "2x+6=14 → 2x=8 → x=4." },
  { id: "m5", section: "Math", subSkill: "arithmetic", difficulty: 1, exam: "sat", question: "What is √144?", options: ["10", "11", "12", "14"], correct: 2, explanation: "12×12=144." },
  { id: "m6", section: "Math", subSkill: "functions", difficulty: 2, exam: "sat", question: "If f(x) = 2x²−3, what is f(3)?", options: ["15", "12", "18", "21"], correct: 0, explanation: "f(3) = 2(9)−3 = 15." },
  { id: "m7", section: "Math", subSkill: "geometry", difficulty: 1, exam: "sat", question: "Triangle angles: 45° and 65°. Third angle?", options: ["60°", "70°", "80°", "90°"], correct: 1, explanation: "180−45−65 = 70°." },
  { id: "m8", section: "Math", subSkill: "arithmetic", difficulty: 1, exam: "sat", question: "3/8 as a decimal?", options: ["0.35", "0.375", "0.38", "0.325"], correct: 1, explanation: "3÷8 = 0.375." },
  { id: "m9", section: "Math", subSkill: "algebra", difficulty: 2, exam: "sat", question: "Simplify: (x²−9)/(x−3)", options: ["x+3", "x−3", "x²−3", "9"], correct: 0, explanation: "x²−9 = (x+3)(x−3); divided by (x−3) = x+3." },
  { id: "m10", section: "Math", subSkill: "percent", difficulty: 1, exam: "sat", question: "What is 15% of 200?", options: ["15", "25", "30", "35"], correct: 2, explanation: "0.15 × 200 = 30." },
  { id: "m11", section: "Math", subSkill: "algebra", difficulty: 2, exam: "sat", question: "If 4x − 2y = 10 and y = 3, find x.", options: ["2", "3", "4", "5"], correct: 2, explanation: "4x−6=10 → 4x=16 → x=4." },
  { id: "m12", section: "Math", subSkill: "geometry", difficulty: 2, exam: "sat", question: "Volume of a cylinder with r=3, h=7:", options: ["63π", "21π", "42π", "189π"], correct: 0, explanation: "V=πr²h = π(9)(7) = 63π." },
  { id: "m13", section: "Math", subSkill: "statistics", difficulty: 2, exam: "sat", question: "Mean of {4, 7, 10, 3, 6}:", options: ["5", "6", "7", "8"], correct: 1, explanation: "(4+7+10+3+6)/5 = 30/5 = 6." },
  { id: "m14", section: "Math", subSkill: "algebra", difficulty: 3, exam: "sat", question: "If x²−5x+6=0, solutions are:", options: ["x=1,6", "x=2,3", "x=−2,−3", "x=−1,6"], correct: 1, explanation: "(x−2)(x−3)=0 → x=2 or x=3." },
  { id: "m15", section: "Math", subSkill: "algebra", difficulty: 3, exam: "sat", question: "System: 2x+y=7, x−y=2. Find x:", options: ["2", "3", "4", "5"], correct: 1, explanation: "Adding: 3x=9 → x=3." },
  { id: "m16", section: "Math", subSkill: "geometry", difficulty: 3, exam: "sat", question: "In a 30-60-90 triangle, if the shortest side is 5, the hypotenuse is:", options: ["5√2", "5√3", "10", "15"], correct: 2, explanation: "In 30-60-90, hypotenuse = 2 × shortest side = 10." },
  { id: "m17", section: "Math", subSkill: "functions", difficulty: 3, exam: "sat", question: "If g(x) = 3x−1 and f(x) = x², find f(g(2)):", options: ["25", "20", "9", "11"], correct: 0, explanation: "g(2)=5, f(5)=25." },
  { id: "m18", section: "Math", subSkill: "statistics", difficulty: 2, exam: "sat", question: "Median of {2, 5, 1, 8, 3}:", options: ["3", "5", "4", "2"], correct: 0, explanation: "Sorted: {1,2,3,5,8}. Middle = 3." },
  { id: "m19", section: "Math", subSkill: "percent", difficulty: 2, exam: "sat", question: "A price increases from $80 to $100. Percent increase?", options: ["20%", "25%", "30%", "15%"], correct: 1, explanation: "(100−80)/80 × 100 = 25%." },
  { id: "m20", section: "Math", subSkill: "algebra", difficulty: 3, exam: "sat", question: "Simplify: (2x³y²)/(4xy⁴)", options: ["x²/(2y²)", "2x²/y²", "x²y²/2", "x/(2y²)"], correct: 0, explanation: "2x³y²/(4xy⁴) = x²/(2y²)." },
  { id: "m21", section: "Math", subSkill: "geometry", difficulty: 2, exam: "sat", question: "Pythagorean triple: 3, 4, ?", options: ["5", "6", "7", "8"], correct: 0, explanation: "3²+4²=25 → √25=5." },
  { id: "m22", section: "Math", subSkill: "functions", difficulty: 2, exam: "sat", question: "Domain of f(x) = 1/(x−3):", options: ["All reals", "x ≠ 3", "x > 3", "x < 3"], correct: 1, explanation: "x−3 cannot be 0, so x ≠ 3." },
  { id: "m23", section: "Math", subSkill: "algebra", difficulty: 1, exam: "sat", question: "Solve: |x−4| = 7", options: ["x=11 or x=−3", "x=11", "x=3 or x=−11", "x=−3"], correct: 0, explanation: "x−4=7→x=11 or x−4=−7→x=−3." },
  { id: "m24", section: "Math", subSkill: "statistics", difficulty: 3, exam: "sat", question: "Standard deviation measures:", options: ["Central tendency", "Spread of data", "Maximum value", "Sample size"], correct: 1, explanation: "Standard deviation measures how spread out values are." },
  { id: "m25", section: "Math", subSkill: "geometry", difficulty: 3, exam: "sat", question: "Arc length of 60° sector, radius 6:", options: ["2π", "6π", "π", "12π"], correct: 0, explanation: "Arc = (60/360)×2π(6) = 2π." },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// IELTS LISTENING (10 questions)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const listening: BankQuestion[] = [
  { id: "l1", section: "Listening", subSkill: "format", difficulty: 1, exam: "ielts", question: "If you hear 'the deadline is the fifteenth of March', write:", options: ["15 March", "March 15th", "15/3", "Any of the above"], correct: 3, explanation: "IELTS accepts multiple date formats." },
  { id: "l2", section: "Listening", subSkill: "strategy", difficulty: 1, exam: "ielts", question: "In IELTS Listening, you should read questions:", options: ["After the recording", "Before the recording starts", "Never", "Only once"], correct: 1, explanation: "Reading questions beforehand helps you know what to listen for." },
  { id: "l3", section: "Listening", subSkill: "trap", difficulty: 2, exam: "ielts", question: "A speaker says 'Tuesday... no, sorry, Wednesday'. The answer is:", options: ["Tuesday", "Wednesday", "Both", "Neither"], correct: 1, explanation: "Self-corrections — the last answer is correct." },
  { id: "l4", section: "Listening", subSkill: "format", difficulty: 2, exam: "ielts", question: "For IELTS Listening, if it says 'NO MORE THAN THREE WORDS', '7 pm' counts as:", options: ["One word", "Two words", "A number, not a word", "Invalid answer"], correct: 0, explanation: "Numbers and times count as one word." },
  { id: "l5", section: "Listening", subSkill: "strategy", difficulty: 1, exam: "ielts", question: "In map labeling questions, you should:", options: ["Ignore compass directions", "Identify landmarks first", "Write full sentences", "Wait until the end"], correct: 1, explanation: "Identifying landmarks helps you follow the speaker's directions." },
  { id: "l6", section: "Listening", subSkill: "trap", difficulty: 3, exam: "ielts", question: "When two speakers disagree, the answer usually comes from:", options: ["The first speaker", "The second speaker", "Whichever speaks last on that point", "Neither"], correct: 2, explanation: "In disagreements, the final consensus or correction is usually the answer." },
  { id: "l7", section: "Listening", subSkill: "format", difficulty: 1, exam: "ielts", question: "IELTS Listening spelling must be:", options: ["Approximately correct", "Exactly correct", "Doesn't matter", "American English only"], correct: 1, explanation: "Spelling must be correct — even one wrong letter loses the mark." },
  { id: "l8", section: "Listening", subSkill: "strategy", difficulty: 2, exam: "ielts", question: "Section 4 of IELTS Listening is usually:", options: ["A conversation", "An academic lecture", "A phone call", "A group discussion"], correct: 1, explanation: "Section 4 is typically an academic monologue/lecture." },
  { id: "l9", section: "Listening", subSkill: "trap", difficulty: 3, exam: "ielts", question: "Distractor answers in IELTS Listening are:", options: ["Always wrong", "Correct answers mentioned then changed", "Not real words", "Given by the second speaker"], correct: 1, explanation: "Distractors are plausible answers mentioned but then corrected." },
  { id: "l10", section: "Listening", subSkill: "strategy", difficulty: 2, exam: "ielts", question: "In multiple choice listening, focus on:", options: ["The exact words from options", "Paraphrases and synonyms", "The longest answer", "The first option mentioned"], correct: 1, explanation: "Answers are often paraphrased — listen for synonyms and meaning." },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// IELTS WRITING STRATEGY (10 questions)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const writing: BankQuestion[] = [
  { id: "w1", section: "Writing", subSkill: "task-response", difficulty: 1, exam: "ielts", question: "Best topic sentence for an argumentative essay?", options: ["I think education is important.", "While some argue for traditional schooling, evidence suggests online learning can be equally effective.", "Education is good.", "Let me tell you about education."], correct: 1, explanation: "A strong topic sentence presents a clear argument with nuance." },
  { id: "w2", section: "Writing", subSkill: "task-response", difficulty: 2, exam: "ielts", question: "IELTS Task 2 requires a minimum of:", options: ["150 words", "200 words", "250 words", "300 words"], correct: 2, explanation: "Task 2 requires at least 250 words." },
  { id: "w3", section: "Writing", subSkill: "coherence", difficulty: 2, exam: "ielts", question: "Which is the best way to start a body paragraph?", options: ["Firstly,", "With a clear topic sentence", "I think", "According to me"], correct: 1, explanation: "Body paragraphs should open with a clear topic sentence." },
  { id: "w4", section: "Writing", subSkill: "lexical", difficulty: 2, exam: "ielts", question: "To score Band 7+ in vocabulary, you need:", options: ["Complex words only", "A range of less common vocabulary used accurately", "Simple words", "Memorized phrases"], correct: 1, explanation: "Band 7 requires varied, less common vocabulary used with precision." },
  { id: "w5", section: "Writing", subSkill: "task-response", difficulty: 3, exam: "ielts", question: "For a 'discuss both views' essay, you must:", options: ["Only give your opinion", "Present both sides then give your view", "Pick one side only", "Avoid stating your opinion"], correct: 1, explanation: "Discuss both views essays require balanced coverage plus your position." },
  { id: "w6", section: "Writing", subSkill: "coherence", difficulty: 1, exam: "ielts", question: "Good paragraph structure follows:", options: ["Random order", "Topic sentence → supporting details → concluding sentence", "Conclusion first", "Details without main idea"], correct: 1, explanation: "PEEL structure: Point, Evidence, Explain, Link." },
  { id: "w7", section: "Writing", subSkill: "grammar-range", difficulty: 3, exam: "ielts", question: "To reach Band 8 in grammar, you need:", options: ["Only simple sentences", "A wide range of structures with rare errors", "No errors at all", "Mostly passive voice"], correct: 1, explanation: "Band 8 requires flexible, accurate use of a wide range of structures." },
  { id: "w8", section: "Writing", subSkill: "task-response", difficulty: 1, exam: "ielts", question: "IELTS Task 1 (Academic) asks you to:", options: ["Write your opinion", "Describe visual data", "Write a story", "Answer questions"], correct: 1, explanation: "Task 1 Academic requires describing charts, graphs, or diagrams." },
  { id: "w9", section: "Writing", subSkill: "lexical", difficulty: 2, exam: "ielts", question: "Which transition best shows cause and effect?", options: ["However", "Consequently", "Meanwhile", "Furthermore"], correct: 1, explanation: "'Consequently' signals that something is a result of something else." },
  { id: "w10", section: "Writing", subSkill: "coherence", difficulty: 3, exam: "ielts", question: "Overusing linking words (Firstly, Secondly, Thirdly...) will:", options: ["Improve coherence score", "Lower coherence score (mechanical)", "Have no effect", "Guarantee Band 7"], correct: 1, explanation: "Mechanical overuse of linkers actually lowers the coherence score." },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// IELTS SPEAKING STRATEGY (10 questions)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const speaking: BankQuestion[] = [
  { id: "s1", section: "Speaking", subSkill: "strategy", difficulty: 1, exam: "ielts", question: "Best strategy for Speaking Part 2?", options: ["Memorize a script", "Make brief notes then speak naturally", "Speak as fast as possible", "Use only simple words"], correct: 1, explanation: "Notes + natural speech demonstrates fluency and coherence." },
  { id: "s2", section: "Speaking", subSkill: "fluency", difficulty: 2, exam: "ielts", question: "To sound more fluent, you should:", options: ["Speak extremely fast", "Use natural pauses and fillers like 'well' and 'actually'", "Memorize long answers", "Repeat the question"], correct: 1, explanation: "Natural pauses and discourse markers show genuine fluency." },
  { id: "s3", section: "Speaking", subSkill: "vocabulary", difficulty: 2, exam: "ielts", question: "In Part 3, the examiner expects:", options: ["Short yes/no answers", "Extended, analytical responses", "Memorized answers", "Personal stories only"], correct: 1, explanation: "Part 3 requires abstract, analytical thinking with extended responses." },
  { id: "s4", section: "Speaking", subSkill: "pronunciation", difficulty: 2, exam: "ielts", question: "Pronunciation score is mainly about:", options: ["Having a native accent", "Being clearly understood with natural intonation", "Speaking slowly", "Using big words"], correct: 1, explanation: "Clarity and natural intonation matter more than accent." },
  { id: "s5", section: "Speaking", subSkill: "strategy", difficulty: 1, exam: "ielts", question: "If you don't understand a Part 1 question:", options: ["Stay silent", "Ask the examiner to rephrase", "Change the topic", "Guess and answer something random"], correct: 1, explanation: "It's perfectly fine to ask for clarification in Part 1." },
  { id: "s6", section: "Speaking", subSkill: "fluency", difficulty: 3, exam: "ielts", question: "Self-correction in speaking is:", options: ["Always bad", "Shows language awareness (positive at Band 6+)", "Never noticed by examiners", "Only acceptable once"], correct: 1, explanation: "Self-correction shows metalinguistic awareness and is valued." },
  { id: "s7", section: "Speaking", subSkill: "strategy", difficulty: 1, exam: "ielts", question: "How long should your Part 2 response be?", options: ["30 seconds", "1-2 minutes", "5 minutes", "As long as possible"], correct: 1, explanation: "Part 2 should be 1-2 minutes (the examiner will stop you at 2 min)." },
  { id: "s8", section: "Speaking", subSkill: "vocabulary", difficulty: 3, exam: "ielts", question: "Using idioms in speaking:", options: ["Guarantees Band 9", "Can help if used naturally and correctly", "Should be avoided entirely", "Is required for Band 6"], correct: 1, explanation: "Natural, accurate use of idioms can boost vocabulary score." },
  { id: "s9", section: "Speaking", subSkill: "pronunciation", difficulty: 3, exam: "ielts", question: "Word stress in 'photograph' vs 'photography':", options: ["Same stress pattern", "Different — stress shifts to second syllable in 'photography'", "Both stress first syllable", "Stress doesn't matter"], correct: 1, explanation: "PHO-to-graph vs pho-TOG-ra-phy — stress shift shows phonological awareness." },
  { id: "s10", section: "Speaking", subSkill: "strategy", difficulty: 2, exam: "ielts", question: "In Part 1, answers should be:", options: ["One word only", "2-3 sentences with detail", "5+ sentences", "Academic language only"], correct: 1, explanation: "Part 1 answers should be natural, 2-3 sentences with some elaboration." },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EXPORT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const questionBank: BankQuestion[] = [
  ...vocab, ...reading, ...grammar, ...math, ...listening, ...writing, ...speaking,
];

export const getQuestionsBySection = (section: string, exam?: "ielts" | "sat") =>
  questionBank.filter(q => q.section === section && (!exam || q.exam === exam || q.exam === "both"));

export const getQuestionsByDifficulty = (section: string, difficulty: 1 | 2 | 3, exam?: "ielts" | "sat") =>
  getQuestionsBySection(section, exam).filter(q => q.difficulty === difficulty);

export const getAdaptiveQuestions = (
  section: string,
  count: number,
  userLevel: number, // 0-100 performance percentage
  exam?: "ielts" | "sat"
): BankQuestion[] => {
  const pool = getQuestionsBySection(section, exam);
  const targetDifficulty: 1 | 2 | 3 = userLevel >= 75 ? 3 : userLevel >= 40 ? 2 : 1;
  
  // Weight toward target difficulty but include some variety
  const weighted = pool.map(q => ({
    q,
    weight: q.difficulty === targetDifficulty ? 3 : q.difficulty === targetDifficulty - 1 || q.difficulty === targetDifficulty + 1 ? 2 : 1,
  }));
  
  // Shuffle with weights
  const shuffled = weighted
    .map(w => ({ ...w, sort: Math.random() * w.weight }))
    .sort((a, b) => b.sort - a.sort)
    .slice(0, count)
    .map(w => w.q);
  
  return shuffled;
};

// Mock exam question sets
export const getMockExamQuestions = (exam: "ielts" | "sat"): { section: string; questions: BankQuestion[] }[] => {
  if (exam === "ielts") {
    return [
      { section: "Listening", questions: getQuestionsBySection("Listening", "ielts").slice(0, 10) },
      { section: "Reading", questions: getQuestionsBySection("Reading", "ielts").slice(0, 10) },
      { section: "Writing", questions: getQuestionsBySection("Writing", "ielts").slice(0, 5) },
      { section: "Speaking", questions: getQuestionsBySection("Speaking", "ielts").slice(0, 5) },
      { section: "Grammar", questions: getQuestionsBySection("Grammar", "ielts").slice(0, 5) },
      { section: "Vocabulary", questions: getQuestionsBySection("Vocabulary", "ielts").slice(0, 5) },
    ];
  }
  return [
    { section: "Math", questions: getQuestionsBySection("Math", "sat").slice(0, 15) },
    { section: "Reading", questions: getQuestionsBySection("Reading", "sat").slice(0, 10) },
    { section: "Grammar", questions: getQuestionsBySection("Grammar", "sat").slice(0, 5) },
    { section: "Vocabulary", questions: getQuestionsBySection("Vocabulary", "sat").slice(0, 5) },
  ];
};

// Section metadata
export const sectionMeta: Record<string, { icon: string; color: string; subSkills: string[] }> = {
  Vocabulary: { icon: "📚", color: "text-purple-500", subSkills: ["academic-words", "context-clues", "word-roots", "collocations"] },
  Reading: { icon: "📖", color: "text-blue-500", subSkills: ["main-idea", "inference", "rhetoric", "vocab-in-context", "detail", "structure"] },
  Grammar: { icon: "✏️", color: "text-green-500", subSkills: ["verb-tense", "subject-verb", "pronoun", "cohesion", "article", "relative-clause", "conditional", "passive", "parallel", "modifier", "punctuation"] },
  Math: { icon: "🔢", color: "text-orange-500", subSkills: ["algebra", "geometry", "arithmetic", "functions", "statistics", "percent"] },
  Listening: { icon: "🎧", color: "text-cyan-500", subSkills: ["format", "strategy", "trap"] },
  Writing: { icon: "✍️", color: "text-pink-500", subSkills: ["task-response", "coherence", "lexical", "grammar-range"] },
  Speaking: { icon: "🎤", color: "text-amber-500", subSkills: ["strategy", "fluency", "vocabulary", "pronunciation"] },
};

// Writing prompts for essay practice
export const essayPrompts = [
  { id: "wp1", topic: "Some people believe that university education should be free for all students. To what extent do you agree or disagree?", type: "opinion", difficulty: 2 as const },
  { id: "wp2", topic: "The rise of artificial intelligence will lead to more job losses than job creation. Discuss both views and give your opinion.", type: "discussion", difficulty: 3 as const },
  { id: "wp3", topic: "In many countries, the gap between the rich and the poor is increasing. What problems does this cause and what solutions can you suggest?", type: "problem-solution", difficulty: 2 as const },
  { id: "wp4", topic: "Some people think that the government should invest more in public transport rather than building new roads. Do you agree or disagree?", type: "opinion", difficulty: 1 as const },
  { id: "wp5", topic: "Many young people today are choosing to study abroad rather than in their own country. What are the advantages and disadvantages of this trend?", type: "advantages-disadvantages", difficulty: 2 as const },
  { id: "wp6", topic: "Environmental problems are too big for individual people to solve. Only governments and large companies can make a real difference. To what extent do you agree?", type: "opinion", difficulty: 3 as const },
  { id: "wp7", topic: "In some countries, children start formal education at age 4. In others, they don't begin until age 7. Discuss the advantages and disadvantages of starting school early.", type: "advantages-disadvantages", difficulty: 2 as const },
  { id: "wp8", topic: "Technology has made it easier for people to work from home. Do the advantages outweigh the disadvantages?", type: "opinion", difficulty: 1 as const },
];

// Speaking cue cards
export const speakingCueCards = [
  { id: "sc1", topic: "Describe a place you have visited that you found very beautiful.", prompts: ["What did it look like?", "Why did you visit?", "Why was it memorable?"], difficulty: 1 as const },
  { id: "sc2", topic: "Talk about a skill you would like to learn.", prompts: ["Why do you want to learn it?", "How would you learn it?", "How would it benefit you?"], difficulty: 1 as const },
  { id: "sc3", topic: "Describe a person who has inspired you.", prompts: ["Who are they?", "How did you meet them?", "What did they do that was inspiring?"], difficulty: 1 as const },
  { id: "sc4", topic: "Describe a time when you had to make a difficult decision.", prompts: ["What was the decision?", "Why was it difficult?", "What was the outcome?"], difficulty: 2 as const },
  { id: "sc5", topic: "Talk about a book that has influenced your thinking.", prompts: ["What is it about?", "When did you read it?", "How did it change your perspective?"], difficulty: 2 as const },
  { id: "sc6", topic: "Describe a traditional festival in your country.", prompts: ["When is it celebrated?", "What do people do?", "Why is it important?"], difficulty: 1 as const },
  { id: "sc7", topic: "Describe a technological invention that has changed your daily life.", prompts: ["What is it?", "When did you start using it?", "How has it changed your routine?"], difficulty: 2 as const },
  { id: "sc8", topic: "Talk about a goal you set and achieved.", prompts: ["What was the goal?", "What challenges did you face?", "How did you feel when you achieved it?"], difficulty: 3 as const },
];
