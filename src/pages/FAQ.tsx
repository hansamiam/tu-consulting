import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowLeft } from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import Navigation from "@/components/Navigation";
import heroImage from "@/assets/hero-campus.jpg";

const FAQ = () => {
  const navigate = useNavigate();

  const faqs = [
    {
      question: "Why TopUni Consulting?",
      answer: "We're different. It's true that our consultants from Yale, Harvard, Cambridge, and Tsinghua have seen a lot of success over the years—but just as much, we've faced our fair share of challenges, setbacks, made mistakes, and learned from them. That's exactly why we can help you. We've been through the real struggles of the application process, conquered them, and know how to navigate them. Plus, we bridge the gap others can't: large firms give you minimal attention despite premium prices, while smaller services often lack global experience and proven results. We offer world-class expertise with genuine personal attention at accessible prices."
    },
    {
      question: "Who are your consultants?",
      answer: "Current students and recent graduates from top universities (Yale, Harvard, Cambridge, Tsinghua) who succeeded across natural sciences, social sciences, and the humanities. They've personally won prestigious scholarships, navigated competitive admissions, and understand what it takes because they've done it themselves. More importantly, they remember the challenges and know how to guide you through yours."
    },
    {
      question: "Who is this for?",
      answer: "Everyone pursuing ambitious educational and career goals. We work with high school students applying to undergraduate programs, graduate school applicants (Master's, PhD, MBA), early-to-mid career professionals seeking career coaching and professional development, middle school students preparing extracurriculars and building strong foundations, students applying to competitive summer programs and boarding schools, job seekers needing application and interview preparation, and anyone navigating educational transitions or career advancement. Whether you're 13 or 35, if you're striving for excellence, we're here to help."
    },
    {
      question: "Do I need perfect grades to work with you?",
      answer: "Absolutely not. We specialize in helping students from all backgrounds and circumstances—whether you're dealing with lower grades, unique challenges, non-traditional paths, or just need guidance to take your best shot. You don't need to be a straight-A student to benefit from expert consulting. In fact, we welcome and encourage you—that much more of a comeback story is waiting to be written. Our job is to help you present the strongest possible application with whatever starting point you have. Every student deserves a chance to reach for their dreams."
    },
    {
      question: "Do you offer free consultations?",
      answer: "No—we believe our clients should be getting value from the very first minute. Many firms offer \"free\" consultations, but these are often brief introductory calls focused on explaining packages rather than providing actionable guidance. We take a different approach: every consultation we offer, including our introductory sessions, delivers real insights and genuine expertise tailored to your situation. We take your time seriously and believe quality consulting requires preparation and focus. That's why all our consultations are paid—and that's why they deliver immediate value."
    },
    {
      question: "Is this just for Ivy League / Oxbridge applications?",
      answer: "No! While our consultants have Ivy League and Oxbridge experience, we help students apply to top universities worldwide—US, UK, Canada, Europe, China, and beyond. Whether you're aiming for Harvard, Oxford, McGill, or Tsinghua, we have the expertise. We focus on finding the right fit for YOU, not just the most prestigious name."
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
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 sticky top-16 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-foreground hover:text-accent"
          >
            <ArrowLeft size={20} />
            Back to Home
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 md:py-12">
        {/* Hero Section */}
        <div className="text-center mb-6 md:mb-12 animate-fade-in">
          <div className="inline-block">
            <h1 className="font-heading text-2xl sm:text-3xl md:text-5xl font-bold bg-gradient-to-r from-gold via-accent to-primary bg-clip-text text-transparent mb-2 px-2">
              Frequently Asked Questions
            </h1>
            <div className="h-1 w-20 md:w-32 bg-gradient-to-r from-primary to-gold mx-auto rounded-full mb-3 md:mb-4"></div>
          </div>
          <p className="text-sm md:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
            Everything you need to know
          </p>
        </div>

        {/* FAQ Accordion */}
        <Card className="border-gold/20 bg-card/50 backdrop-blur-sm shadow-xl animate-enter">
          <CardHeader className="pb-4 md:pb-6">
            <CardTitle className="text-lg md:text-2xl text-primary">Quick Answers</CardTitle>
            <CardDescription className="text-xs md:text-base">
              Can't find what you're looking for? Email us at{" "}
              <a href="mailto:team@topuniconsulting.com" className="text-accent hover:underline">
                team@topuniconsulting.com
              </a>
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-left text-sm md:text-base">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-xs md:text-sm text-muted-foreground whitespace-pre-line">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        {/* CTA Section */}
        <Card className="mt-12 p-8 bg-gradient-to-br from-primary/5 to-gold/5 border-primary/20 text-center space-y-4">
          <p className="text-lg text-foreground font-medium">Ready to take your shot?</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              variant="gold"
              size="lg"
              onClick={() => navigate("/offerings")}
            >
              View Services & Pricing
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate("/team")}
              className="border-primary/30"
            >
              Meet Our Team
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default FAQ;
