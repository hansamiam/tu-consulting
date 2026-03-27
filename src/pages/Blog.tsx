import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { ArrowLeft, BookOpen, Clock, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import heroImage from "@/assets/hero-library.jpg";
import { useState } from "react";

interface Article {
  id: string;
  title: string;
  excerpt: string;
  readTime: string;
  category: string;
  content: string[];
}

const articles: Article[] = [
  {
    id: "5-mistakes-study-abroad",
    title: "5 Biggest Mistakes Students Make When Applying Abroad",
    excerpt: "From choosing universities for the wrong reasons to submitting generic essays — here are the pitfalls that cost students their dream admissions, and how to avoid them.",
    readTime: "6 min",
    category: "Admissions",
    content: [
      "Every year, thousands of ambitious students from Central Asia and beyond set their sights on top universities in the US, UK, Canada, and Europe. Yet many fall into the same traps that could have been easily avoided with the right guidance.",
      "**1. Applying Only to \"Dream\" Schools**\nMany students only apply to the most prestigious names — Harvard, Oxford, MIT — without building a balanced list. A strong application strategy includes reach, match, and safety schools. Don't let prestige blind you to excellent programs that are a better fit for your profile.",
      "**2. Writing Generic Personal Statements**\nAdmissions officers read thousands of essays. \"I've always been passionate about...\" doesn't stand out. The best essays are specific, personal, and show self-awareness. Tell a story only you can tell.",
      "**3. Ignoring Financial Planning**\nTuition is just the beginning. Housing, insurance, books, travel — costs add up fast. Many students don't research scholarships early enough or underestimate the cost of living. Use tools like our Discover cost calculator to plan realistically.",
      "**4. Waiting Until the Last Minute**\nStrong applications take months, not weeks. Starting your essays in November for a January deadline is a recipe for mediocrity. Begin research in the spring, draft essays over summer, and refine in the fall.",
      "**5. Not Getting Expert Feedback**\nYour English teacher and your parents mean well, but they may not understand what top universities are looking for. Seek feedback from people who have been through the process recently and understand current admissions trends.",
    ],
  },
  {
    id: "ielts-first-attempt",
    title: "How to Score 7.0+ on IELTS on Your First Attempt",
    excerpt: "A practical, no-fluff guide to IELTS preparation — from study schedules to test-day strategies that actually work for non-native speakers.",
    readTime: "8 min",
    category: "Test Prep",
    content: [
      "IELTS is the gateway to studying abroad for millions of students. But many take it 2 or 3 times before hitting their target score. Here's how to do it right the first time.",
      "**Understand the Format Inside Out**\nBefore you start studying content, understand the test structure. IELTS Academic has four sections: Listening (40 min), Reading (60 min), Writing (60 min), and Speaking (11–14 min). Each section tests different skills and requires different strategies.",
      "**Focus on Your Weakest Section First**\nTake a diagnostic test early. Most students from Central Asia score well in Reading and Listening but struggle with Writing and Speaking. Identify your weak spots and allocate 60% of your study time there.",
      "**Writing: Structure Beats Vocabulary**\nDon't try to impress with big words. Band 7 writing is about clear structure, coherent arguments, and accurate grammar. Learn the Task 2 essay formula: introduction with thesis, 2 body paragraphs with examples, conclusion. Practice writing timed essays weekly.",
      "**Speaking: Practice With a Timer**\nPart 2 (the long turn) trips up most students. Practice speaking for exactly 2 minutes on random topics. Record yourself, listen back, and note filler words and grammar mistakes. AI tutors like TopUni Prep can give you instant feedback.",
      "**The 30-Day Sprint Plan**\nWeeks 1–2: Diagnostic + focus on weakest sections. Weeks 3–4: Full practice tests under timed conditions. Final 3 days: Light review, rest, and confidence building. Cramming the night before hurts more than it helps.",
      "**Test Day Tips**\nBring your ID, arrive early, eat a good breakfast. For listening, read ahead — skim the next questions while the audio plays. For reading, don't read the entire passage first; scan for answers. For writing, spend 5 minutes planning before you write.",
    ],
  },
  {
    id: "scholarships-guide",
    title: "The Ultimate Scholarship Guide for International Students",
    excerpt: "Full and partial scholarships exist at hundreds of universities worldwide. Here's how to find them, qualify for them, and write applications that win.",
    readTime: "7 min",
    category: "Scholarships",
    content: [
      "Studying abroad doesn't have to break the bank. Billions of dollars in scholarship money go unclaimed every year because students don't know where to look or how to apply.",
      "**Types of Scholarships**\nMerit-based (academic excellence), need-based (financial circumstances), athletic, country-specific, and program-specific. Many universities offer automatic merit scholarships based on your GPA and test scores — you don't even need to apply separately.",
      "**Where to Search**\nStart with the university's financial aid page. Then check government programs (Chevening, Fulbright, DAAD, CSC). Don't overlook private foundations and corporate scholarships. Our Discover tool lets you filter universities by scholarship availability.",
      "**The Application Essay**\nScholarship essays are different from admissions essays. They want to know: Why do you need this money? What will you do with your education? How will you give back? Be specific about your goals and connect them to your background.",
      "**Financial Documents**\nMost need-based scholarships require proof of family income. Gather bank statements, tax returns, and employer letters early. In many Central Asian countries, documenting income can be complex — start the process months ahead.",
      "**Common Mistakes**\nMissing deadlines (set calendar reminders for every single one). Applying to only one scholarship (apply to at least 10–15). Sending generic essays (customize every application). Not following instructions (if they ask for 500 words, don't write 800).",
      "**Negotiation**\nYes, you can negotiate financial aid. If you receive a better offer from a comparable university, let your top choice know. Many admissions offices will match or improve their offer. Be polite, professional, and factual.",
    ],
  },
  {
    id: "things-i-wish-i-knew",
    title: "7 Things I Wish I Knew Before Studying Abroad",
    excerpt: "Real talk from students who left Central Asia to study at top universities. The culture shocks, the loneliness, the growth — and what they'd do differently.",
    readTime: "5 min",
    category: "Student Life",
    content: [
      "Going abroad to study is one of the most transformative experiences of your life. But nobody tells you about the hard parts until you're living them.",
      "**1. Homesickness Is Real — and That's OK**\nYou'll miss your mom's cooking, your friends, and even the things you used to complain about. This is normal. It doesn't mean you made the wrong choice. Give yourself time to adjust — most students feel at home within 2–3 months.",
      "**2. Your English Is Good Enough (But Will Get Better)**\nDon't let imperfect English stop you from participating in class or making friends. Everyone understands you're learning. The students who improve fastest are the ones who speak up, make mistakes, and keep going.",
      "**3. Office Hours Are Gold**\nIn Central Asia, students rarely visit professors outside class. Abroad, office hours are expected and valuable. Go. Ask questions. Build relationships. These professors write recommendation letters and open doors you can't see yet.",
      "**4. Nobody Cares Where You're From (In a Good Way)**\nYou might worry about being \"the student from Kazakhstan\" or \"the one from Uzbekistan.\" In reality, international students are celebrated. Your perspective is your superpower — use it in class discussions, essays, and friendships.",
      "**5. Budget Like Your Life Depends On It**\nCurrency conversion will mess with your head. That $5 coffee is 2,500 tenge. Set a weekly budget in local currency and stick to it. Cook at home, use student discounts, and don't compare your spending to wealthy classmates.",
      "**6. Mental Health Support Exists — Use It**\nMost universities offer free counseling. There's no shame in using it. The transition is hard, and having someone to talk to — in confidence — makes a real difference.",
      "**7. Your Network Is Your Net Worth**\nThe friendships and professional connections you make in university will shape your career for decades. Join clubs, attend events, and say yes to social opportunities — even when you'd rather stay in your dorm.",
    ],
  },
  {
    id: "sat-vs-ielts",
    title: "SAT vs. IELTS: Which Test Should You Take First?",
    excerpt: "Strategic test planning can save you months of preparation time. Here's how to sequence your exams for maximum impact on your applications.",
    readTime: "5 min",
    category: "Test Prep",
    content: [
      "If you're applying to US universities, you'll likely need both the SAT and IELTS (or TOEFL). The question isn't whether to take them — it's in what order.",
      "**Start With IELTS If Your English Needs Work**\nIELTS measures your English proficiency. The SAT assumes it. If you're not yet comfortable reading complex English passages quickly, prepare for IELTS first. The language skills you build will directly help your SAT verbal score.",
      "**Start With SAT If Your English Is Already Strong**\nIf you're already at B2+ level in English, the SAT might be the harder test for you because of its reasoning and math components. Tackle it first when your study energy is highest.",
      "**The Ideal Timeline**\nGrade 10: Take IELTS (aim for 6.5+). Grade 11 fall: Focus on SAT prep. Grade 11 spring: Take SAT. Grade 11 summer: Retake IELTS if needed (aim for 7.0+). Grade 12 fall: Final retakes if necessary + applications.",
      "**Don't Overlook Test-Optional Schools**\nMany US universities are now test-optional for the SAT. But strong scores still help, especially for international students seeking scholarships. IELTS is almost never optional for non-native English speakers.",
      "**Prep Resources**\nOfficial practice tests are the gold standard for both exams. Supplement with adaptive practice tools like TopUni Prep, which adjusts difficulty based on your performance and provides AI-powered feedback on writing sections.",
    ],
  },
];

const Blog = () => {
  const navigate = useNavigate();
  const [expandedArticle, setExpandedArticle] = useState<string | null>(null);

  return (
    <div
      className="min-h-screen relative"
      style={{
        backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.9)), url(${heroImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      <Navigation language="en" />

      <header className="border-b border-border/50 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 sticky top-16 z-40 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="gap-2 hover:text-primary transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 md:py-16">
        <div className="max-w-4xl mx-auto space-y-8 md:space-y-12">
          <div className="text-center space-y-4 md:space-y-6 animate-fade-in">
            <div className="flex justify-center">
              <div className="p-4 rounded-full bg-primary/10 border border-primary/20">
                <BookOpen className="h-8 w-8 md:h-12 md:w-12 text-primary" />
              </div>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold bg-gradient-to-r from-gold via-accent to-primary bg-clip-text text-transparent px-2">
              Blog
            </h1>
            <p className="text-sm md:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
              Guides, strategies, and real talk for students applying to universities abroad.
            </p>
          </div>

          <div className="space-y-6">
            {articles.map((article) => (
              <Card
                key={article.id}
                className="overflow-hidden border-border/50 hover:border-accent/30 hover:shadow-lg transition-all duration-300"
              >
                <div className="p-6 md:p-8">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="px-2.5 py-0.5 rounded-full bg-accent/10 text-accent text-xs font-medium">
                      {article.category}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" /> {article.readTime}
                    </span>
                  </div>
                  <h2 className="text-xl md:text-2xl font-bold text-foreground mb-3">{article.title}</h2>
                  <p className="text-sm md:text-base text-muted-foreground mb-4">{article.excerpt}</p>

                  {expandedArticle === article.id ? (
                    <div className="space-y-4 mt-6 pt-6 border-t border-border/50">
                      {article.content.map((paragraph, i) => {
                        const parts = paragraph.split(/\*\*(.*?)\*\*/g);
                        return (
                          <p key={i} className="text-sm md:text-base text-muted-foreground leading-relaxed">
                            {parts.map((part, j) =>
                              j % 2 === 1 ? (
                                <strong key={j} className="text-foreground font-semibold">{part}</strong>
                              ) : (
                                <span key={j}>{part}</span>
                              )
                            )}
                          </p>
                        );
                      })}
                      <button
                        onClick={() => setExpandedArticle(null)}
                        className="text-accent text-sm font-medium hover:underline mt-4"
                      >
                        Show less
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setExpandedArticle(article.id)}
                      className="inline-flex items-center gap-1 text-accent text-sm font-medium hover:gap-2 transition-all"
                    >
                      Read more <ArrowRight className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </Card>
            ))}
          </div>

          <Card className="p-8 md:p-12 bg-gradient-to-br from-primary/10 to-gold/10 border-primary/30 text-center space-y-6">
            <h2 className="text-2xl md:text-3xl font-bold text-primary">Need Personalized Guidance?</h2>
            <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto">
              Our expert consultants can help you with applications, test prep, and scholarship strategy.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" variant="gold" onClick={() => navigate("/offerings")}>Explore Consulting</Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/prep")}>Try Prep Platform</Button>
            </div>
          </Card>
        </div>
      </main>

      <footer className="border-t border-border/30 bg-background/80 backdrop-blur-sm py-6 mt-12">
        <div className="container mx-auto px-4 text-center">
          <Footer language="en" variant="light" />
        </div>
      </footer>
    </div>
  );
};

export default Blog;