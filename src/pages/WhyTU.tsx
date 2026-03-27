import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import heroImage from "@/assets/hero-library.jpg";

const WhyTU = () => {
  const navigate = useNavigate();

  const faqs = [
    {
      question: "Why TopUni?",
      answer: "We're different. Our consultants from Yale, Harvard, Cambridge, and Tsinghua have seen a lot of success—but just as much, we've faced challenges, setbacks, made mistakes, and learned from them. That's exactly why we can help you. We've been through the real struggles of the application process, conquered them, and know how to navigate them. We bridge the gap others can't: large firms give you minimal attention despite premium prices, while smaller services often lack global experience. We offer world-class expertise with genuine personal attention at accessible prices."
    },
    {
      question: "Who are your consultants?",
      answer: "Current students and recent graduates from top universities (Yale, Harvard, Cambridge, Tsinghua) who succeeded across natural sciences, social sciences, and the humanities. They've personally won prestigious scholarships, navigated competitive admissions, and understand what it takes because they've done it themselves."
    },
    {
      question: "Who is this for?",
      answer: "Everyone pursuing ambitious educational and career goals. We work with high school students applying to undergraduate programs, graduate school applicants (Master's, PhD, MBA), professionals seeking career coaching, middle school students building foundations, students applying to summer programs and boarding schools, and anyone navigating educational transitions. Whether you're 13 or 35, if you're striving for excellence, we're here to help."
    },
    {
      question: "Do I need perfect grades?",
      answer: "Absolutely not. We specialize in helping students from all backgrounds—whether you're dealing with lower grades, unique challenges, or non-traditional paths. You don't need to be a straight-A student to benefit from expert guidance. In fact, we welcome and encourage you—that much more of a comeback story is waiting to be written."
    },
    {
      question: "Do you offer free consultations?",
      answer: "No—we believe our clients should be getting value from the very first minute. Many firms offer \"free\" consultations that are really just sales calls. We take a different approach: every consultation delivers real insights and genuine expertise tailored to your situation. That's why all our consultations are paid—and that's why they deliver immediate value."
    },
    {
      question: "Is this just for Ivy League / Oxbridge applications?",
      answer: "No! While our consultants have Ivy League and Oxbridge experience, we help students apply to top universities worldwide—US, UK, Canada, Europe, China, and beyond. We focus on finding the right fit for YOU, not just the most prestigious name."
    }
  ];

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
        <div className="max-w-6xl mx-auto space-y-8 md:space-y-16">
          {/* Hero */}
          <div className="text-center space-y-3 md:space-y-6 animate-fade-in">
            <h1 className="text-2xl sm:text-3xl md:text-6xl font-bold bg-gradient-to-r from-gold via-accent to-primary bg-clip-text text-transparent px-2">
              Why Top Uni?
            </h1>
            <p className="text-sm md:text-xl text-muted-foreground max-w-3xl mx-auto px-4">
              Lean team. Real experience. Personal attention. No corporate markup.
            </p>
          </div>

          {/* Forbes */}
          <Card className="p-6 md:p-10 bg-gradient-to-br from-accent/10 to-primary/10 border-accent/30 shadow-xl animate-enter">
            <div className="max-w-4xl mx-auto space-y-4 md:space-y-6 text-center">
              <p className="text-base md:text-2xl lg:text-3xl text-foreground leading-relaxed">
                <a href="https://www.forbes.com/sites/christopherrim/2025/05/02/how-the-explosion-of-private-consultants-has-changed-the-college-admissions-landscape/" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline font-bold">Forbes</a> says the most critical factor in consulting success: <span className="font-bold">how well mentors understand their students.</span>
              </p>
              <div className="border-t-2 border-accent/30 pt-4 md:pt-6 mt-4 md:mt-6">
                <p className="text-base md:text-xl lg:text-2xl text-primary font-bold mb-2 md:mb-3">The TopUni Difference:</p>
                <p className="text-sm md:text-base lg:text-lg text-foreground">
                  We're <span className="font-semibold">fresh out of the process</span>. We remember what it feels like, what works, what doesn't. We understand today's challenges—<span className="font-semibold">not from textbooks, from experience.</span>
                </p>
              </div>
            </div>
          </Card>

          {/* Key Differentiators */}
          <div className="grid md:grid-cols-2 gap-4 md:gap-8 animate-fade-in">
            {[
              { title: "Small Team, Big Impact", text: "Unlike large firms where you're just a number, our small team means every consultant brings top-tier expertise. You work directly with someone who's been through it themselves—recently.", note: "Every team member is hand-picked for excellence" },
              { title: "Personal Attention", text: "Large firms charge premium but spread mentors thin. We keep client loads manageable—you get dedicated support without the markup.", note: "Your success is our mission, not just another metric" },
              { title: "Global Standards, Local Access", text: "We bring top-tier Western consulting methodology and resources directly to you. Full bilingual support in English and Russian means nothing gets lost in translation.", note: "World-class approach, accessible and personal" },
              { title: "Proven Results", text: "Secured $500K+ in scholarships with 10+ years combined experience across Yale, Harvard, Cambridge, and Tsinghua. Real successes, tested strategies.", note: "Expertise proven through real outcomes" },
            ].map((item) => (
              <Card key={item.title} className="p-4 md:p-8 space-y-3 md:space-y-4 border-gold/30 bg-gradient-to-br from-card/80 to-accent/5 hover:shadow-xl transition-all">
                <h3 className="text-lg md:text-2xl font-bold text-primary">{item.title}</h3>
                <p className="text-xs md:text-base text-muted-foreground">{item.text}</p>
                <div className="pt-3 md:pt-4 border-t border-border/50">
                  <p className="text-xs md:text-sm text-foreground font-medium">{item.note}</p>
                </div>
              </Card>
            ))}
          </div>

          {/* Philosophy */}
          <Card className="p-8 bg-gradient-to-br from-primary/5 via-accent/5 to-gold/5 border-primary/20">
            <div className="max-w-3xl mx-auto space-y-4 text-center">
              <h2 className="text-2xl md:text-3xl font-bold text-primary">Perfect Grades Not Required</h2>
              <p className="text-base text-muted-foreground">
                Top universities aren't just for "perfect" students. Our team faced learning differences, cultural barriers, financial constraints, and setbacks. We learned from those struggles—now we help you avoid the same mistakes.
              </p>
              <p className="text-base text-foreground font-medium">
                Lower grades? Unusual background? Unique challenges? These make compelling applications.
              </p>
            </div>
          </Card>

          {/* FAQ Section */}
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-gold via-accent to-primary bg-clip-text text-transparent mb-2">
                Frequently Asked Questions
              </h2>
              <p className="text-sm md:text-base text-muted-foreground">
                Can't find what you're looking for? Email us at{" "}
                <a href="mailto:team@topuniconsulting.com" className="text-accent hover:underline">team@topuniconsulting.com</a>
              </p>
            </div>
            <Card className="border-gold/20 bg-card/50 backdrop-blur-sm shadow-xl">
              <div className="p-6">
                <Accordion type="single" collapsible className="w-full">
                  {faqs.map((faq, index) => (
                    <AccordionItem key={index} value={`item-${index}`}>
                      <AccordionTrigger className="text-left text-sm md:text-base">{faq.question}</AccordionTrigger>
                      <AccordionContent className="text-xs md:text-sm text-muted-foreground whitespace-pre-line">{faq.answer}</AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </Card>
          </div>

          {/* CTA */}
          <Card className="p-12 bg-gradient-to-br from-primary/10 to-gold/10 border-primary/30 text-center space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold text-primary">Ready to Start Your Journey?</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">Take the first step toward your dream university with expert guidance.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" variant="gold" onClick={() => navigate("/offerings")}>View Our Packages</Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/team")}>Meet Our Team</Button>
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

export default WhyTU;