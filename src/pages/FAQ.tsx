import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowLeft } from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";

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
      question: "Do I need perfect grades to work with you?",
      answer: "Absolutely not. We specialize in helping students from all backgrounds and circumstances—whether you're dealing with lower grades, unique challenges, non-traditional paths, or just need guidance to take your best shot. You don't need to be a straight-A student to benefit from expert consulting. Our job is to help you present the strongest possible application with whatever starting point you have. Every student deserves a chance to reach for their dreams."
    },
    {
      question: "Is this just for Ivy League applications?",
      answer: "No! While our consultants have Ivy League experience, we help students apply to top universities worldwide—US, UK, Canada, Europe, China, and beyond. Whether you're aiming for Harvard, Oxford, McGill, or Tsinghua, we have the expertise. We focus on finding the right fit for YOU, not just the most prestigious name."
    },
    {
      question: "How do I get started?",
      answer: "Book a trial consultation (25 or 50 minutes) on our Services & Pricing page. This low-commitment session lets you meet us, discuss your situation, and see if we're the right fit. No pressure—just a conversation about your goals and how we can help you achieve them."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-foreground hover:text-accent"
          >
            <ArrowLeft size={20} />
            Back to Home
          </Button>
          <LanguageSwitcher />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="font-heading text-4xl md:text-5xl font-bold text-foreground mb-4">
            Frequently Asked Questions
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Everything you need to know about TopUni Consulting and our services
          </p>
        </div>

        {/* FAQ Accordion */}
        <Card>
          <CardHeader>
            <CardTitle>Common Questions</CardTitle>
            <CardDescription>
              Can't find what you're looking for? Email us at team@topuniconsulting.com
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
        <div className="mt-12 text-center space-y-4">
          <p className="text-muted-foreground">Ready to get started?</p>
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
            >
              Meet Our Team
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default FAQ;
