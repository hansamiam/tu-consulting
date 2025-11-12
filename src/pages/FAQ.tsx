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
      answer: "We're different. Our consultants from Yale, Harvard, Cambridge, and Tsinghua didn't have perfect journeys—we faced setbacks, made mistakes, and learned from them. That's exactly why we can help you. We've been through the real struggles of the application process and know how to navigate them. Plus, we bridge the gap others can't: large firms give you minimal attention despite premium prices, while smaller services often lack global experience and proven results. We offer world-class expertise with genuine personal attention at accessible prices."
    },
    {
      question: "Who are your consultants?",
      answer: "Current students and recent graduates from top universities (Yale, Harvard, Cambridge, Tsinghua) who succeeded across diverse disciplines—STEM, humanities, business, and arts. They've personally won prestigious scholarships, navigated competitive admissions, and understand what it takes because they've done it themselves. More importantly, they remember the challenges and know how to guide you through yours."
    },
    {
      question: "Who is this for?",
      answer: "Everyone pursuing ambitious educational and career goals. We work with high school students applying to undergraduate programs, graduate school applicants (Master's, PhD, MBA), early-to-mid career professionals seeking career coaching and professional development, middle school students preparing extracurriculars and building strong foundations, students applying to competitive summer programs and boarding schools, job seekers needing application and interview preparation, and anyone navigating educational transitions or career advancement. Whether you're 13 or 35, if you're striving for excellence, we're here to help."
    },
    {
      question: "Do I need perfect grades to work with you?",
      answer: "Absolutely not. We specialize in helping students from all backgrounds and circumstances—whether you're dealing with lower grades, unique challenges, non-traditional paths, or just need guidance to take your best shot. You don't need to be a straight-A student to benefit from expert consulting. Our job is to help you present the strongest possible application with whatever starting point you have. Every student deserves a chance to reach for their dreams."
    },
    {
      question: "Is this just for Ivy League applications?",
      answer: "No! While our consultants have Ivy League experience, we help students apply to top universities worldwide—US, UK, Canada, Europe, China, and beyond. Whether you're aiming for Harvard, Oxford, McGill, or Tsinghua, we have the expertise. We focus on finding the right fit for YOU, not just the most prestigious name."
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

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-block">
            <h1 className="font-heading text-4xl md:text-5xl font-bold bg-gradient-to-r from-gold via-accent to-primary bg-clip-text text-transparent mb-2">
              Frequently Asked Questions
            </h1>
            <div className="h-1 w-32 bg-gradient-to-r from-primary to-gold mx-auto rounded-full mb-4"></div>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Everything you need to know about TopUni Consulting
          </p>
        </div>

        {/* FAQ Accordion */}
        <Card className="border-gold/20 bg-card/50 backdrop-blur-sm shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl text-primary">Quick Answers</CardTitle>
            <CardDescription className="text-base">
              Can't find what you're looking for? Email us at{" "}
              <a href="mailto:team@topuniconsulting.com" className="text-accent hover:underline">
                team@topuniconsulting.com
              </a>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-left">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground whitespace-pre-line">
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
