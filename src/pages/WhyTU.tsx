import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { useNavigate } from "react-router-dom";
import { Compass, Brain, Globe2, Sparkles, Target, BookOpen, Users } from "lucide-react";

const WhyTU = () => {
  const navigate = useNavigate();

  const differences = [
    {
      icon: Compass,
      title: "Strategy before search",
      body: "We do not just show options. We help you understand which universities and scholarships fit your grades, budget, goals, country, timeline, and application strength.",
    },
    {
      icon: Brain,
      title: "AI tools with human judgment",
      body: "Our tools help you move faster, but the logic comes from real admissions experience. We combine structured data, personalized recommendations, and expert review where needed.",
    },
    {
      icon: Globe2,
      title: "Built for international students",
      body: "Many admissions platforms are built around U.S. or U.K. assumptions. Top Uni is designed for students applying across borders, especially from Central Asia and other underrepresented markets.",
    },
    {
      icon: Sparkles,
      title: "Premium guidance without the corporate markup",
      body: "Large firms can be expensive and impersonal. We keep the model lean: useful tools first, expert support when it matters, and no unnecessary layers.",
    },
  ];

  const productCards = [
    {
      icon: Target,
      title: "Find realistic scholarship matches",
      body: "Get ranked scholarship options based on eligibility, funding value, deadline urgency, effort level, and fit.",
    },
    {
      icon: BookOpen,
      title: "Build an admissions plan",
      body: "Understand which schools are reach, target, and safer options, and what you need to strengthen before applying.",
    },
    {
      icon: Users,
      title: "Use expert support when needed",
      body: "Book consultation support for essays, school lists, scholarship strategy, interviews, and final application decisions.",
    },
  ];

  const faqs = [
    {
      question: "Why Top Uni?",
      answer: "Because we combine three things students usually have to find separately: structured scholarship data, AI-powered admissions planning, and expert guidance from people who have successfully navigated top university applications.",
    },
    {
      question: "Who is this for?",
      answer: "High school students, university students, graduate applicants, and professionals applying to universities, scholarships, summer programs, or international opportunities.",
    },
    {
      question: "Do I need perfect grades?",
      answer: "No. Strong grades help, but they are not the only factor. We help students understand where they are competitive, where they are stretching, and how to present their background honestly and strategically.",
    },
    {
      question: "Is this only for Ivy League or Oxbridge?",
      answer: "No. We help students apply to universities and scholarships across the U.S., U.K., Canada, Europe, Asia, and other regions. The goal is fit, funding, and long-term opportunity, not prestige alone.",
    },
    {
      question: "Do you offer free consultations?",
      answer: "We focus on paid consultations because they are designed to give real, personalized value from the first session, not function as sales calls. Students can still explore tools and resources before booking.",
    },
    {
      question: "Is Top Uni an AI tool or a consulting service?",
      answer: "Both. The platform helps students move faster with structured recommendations, while consulting is available for higher-stakes decisions that need expert judgment.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* 1. Hero */}
      <section className="bg-primary py-20 sm:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h1 className="text-4xl sm:text-6xl font-heading font-bold text-primary-foreground mb-5 tracking-tight">
            Why <span className="text-gold">Top Uni</span>?
          </h1>
          <p className="text-base sm:text-lg text-primary-foreground/75 max-w-2xl mx-auto leading-relaxed">
            Most students do not need more random university lists. They need a clear strategy:
            where to apply, which scholarships are realistic, and how to make their profile stronger.
          </p>
          <div className="flex flex-wrap gap-3 justify-center mt-8">
            <Button variant="gold" size="lg" onClick={() => navigate("/discover")}>
              Get your admissions plan
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate("/discover")}
              className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
            >
              Explore scholarships
            </Button>
          </div>
        </div>
      </section>

      {/* 2. Core argument */}
      <section className="py-16 sm:py-20 bg-background">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl sm:text-4xl font-heading font-bold mb-5 tracking-tight">
            The problem is not ambition. It is unclear guidance.
          </h2>
          <p className="text-muted-foreground text-base leading-relaxed mb-4">
            Many students are capable but lose months because they do not know:
          </p>
          <ul className="space-y-2 text-foreground/85 text-base">
            <li>— which universities are realistic</li>
            <li>— which scholarships are worth applying to</li>
            <li>— how to position their background</li>
            <li>— when to aim higher and when to be strategic</li>
            <li>— how to avoid wasting months on poor-fit options</li>
          </ul>
        </div>
      </section>

      {/* 3. The Top Uni difference */}
      <section className="py-16 sm:py-20 bg-muted/30 border-y border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl sm:text-4xl font-heading font-bold mb-10 tracking-tight">
            The Top Uni difference
          </h2>
          <div className="grid sm:grid-cols-2 gap-5">
            {differences.map((d) => {
              const Icon = d.icon;
              return (
                <Card key={d.title} className="p-6 sm:p-7 hover:border-accent/40 transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                    <Icon className="h-5 w-5 text-accent" />
                  </div>
                  <h3 className="font-heading font-semibold text-lg mb-2">{d.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{d.body}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. Credibility */}
      <section className="py-16 sm:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl sm:text-4xl font-heading font-bold mb-6 tracking-tight">
            Real experience, not recycled advice
          </h2>
          <ul className="space-y-3 text-foreground/85 text-base">
            <li className="flex gap-3">
              <span className="text-gold">·</span>
              <span>Team experience across Yale, Harvard, Cambridge, Tsinghua, and other leading universities.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-gold">·</span>
              <span>Over $500K in scholarships secured by students we have advised.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-gold">·</span>
              <span>Experience across undergraduate, graduate, scholarship, summer program, and international applications.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-gold">·</span>
              <span>Bilingual support in English and Russian.</span>
            </li>
          </ul>
          <p className="text-xs text-muted-foreground mt-6 italic">
            We do not guarantee acceptance. We help you build the strongest, most realistic case for the targets that fit you.
          </p>
        </div>
      </section>

      {/* 5. You do not need a perfect profile */}
      <section className="py-16 sm:py-20 bg-muted/30 border-y border-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl sm:text-4xl font-heading font-bold mb-5 tracking-tight">
            You do not need perfect grades to build a strong application.
          </h2>
          <p className="text-muted-foreground text-base leading-relaxed mb-6">
            Top universities and scholarships are competitive, but they are not only for students with flawless records.
            Many strong applications come from students with uneven grades, financial constraints, unusual backgrounds,
            learning differences, or non-linear stories. The key is knowing how to choose the right targets and explain
            your record clearly.
          </p>
          <Button variant="gold" size="lg" onClick={() => navigate("/discover")}>
            Find your best-fit options
          </Button>
        </div>
      </section>

      {/* 6. Product-led */}
      <section className="py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl sm:text-4xl font-heading font-bold mb-10 tracking-tight">
            What you can do with Top Uni
          </h2>
          <div className="grid md:grid-cols-3 gap-5">
            {productCards.map((c) => {
              const Icon = c.icon;
              return (
                <Card key={c.title} className="p-6 sm:p-7 hover:border-accent/40 transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center mb-4">
                    <Icon className="h-5 w-5 text-gold" />
                  </div>
                  <h3 className="font-heading font-semibold text-lg mb-2">{c.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{c.body}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* 7. FAQ */}
      <section className="py-16 sm:py-20 bg-muted/30 border-t border-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl sm:text-4xl font-heading font-bold mb-8 tracking-tight">
            Frequently asked
          </h2>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((f, i) => (
              <AccordionItem key={i} value={`item-${i}`}>
                <AccordionTrigger className="text-left text-base font-medium">
                  {f.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-sm leading-relaxed">
                  {f.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <div className="mt-12 flex flex-wrap gap-3">
            <Button variant="gold" size="lg" onClick={() => navigate("/discover")}>
              Get your admissions plan
            </Button>
            <Button variant="outline" size="lg" onClick={() => navigate("/offerings")}>
              See consulting options
            </Button>
          </div>
        </div>
      </section>

      <Footer language="en" />
    </div>
  );
};

export default WhyTU;
