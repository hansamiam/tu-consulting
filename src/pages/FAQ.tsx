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
      question: "Why choose TopUni Consulting?",
      answer: "At TopUni Consulting, we bridge the gap between large corporate consulting firms and smaller local services. Large firms often charge premium prices but provide minimal personalized attention—their consultants are often underpaid, which affects the quality and dedication you receive. Meanwhile, smaller local services may lack the comprehensive global experience and proven track record needed for competitive applications. \n\nOur consultants are graduates from Yale, Harvard, Cambridge, and Tsinghua who have personally navigated these competitive processes, won prestigious scholarships, and succeeded across diverse disciplines. We combine personalized attention with world-class expertise at accessible prices. Our cohort-based model ensures you get the focused support you deserve."
    },
    {
      question: "What makes your consultants qualified?",
      answer: "All our consultants are current students or recent graduates from top-tier universities including Yale, Harvard, Cambridge, and Tsinghua. They have successfully navigated the admissions process themselves, often securing prestigious scholarships and acceptances across multiple institutions. Beyond their own admissions success, they have diverse academic backgrounds spanning STEM, humanities, business, and the arts, allowing them to provide relevant guidance regardless of your intended field."
    },
    {
      question: "How does the cohort-based intake work?",
      answer: "We accept students in cohorts to ensure each receives personalized attention and exceptional results. This controlled approach allows us to dedicate focused time to your unique journey rather than spreading ourselves thin across hundreds of students. When you apply, we'll assess whether we have availability in the current cohort. This model benefits you by ensuring your consultant has adequate time and energy to invest in your success."
    },
    {
      question: "What's included in the consulting packages?",
      answer: "Our packages include one-on-one consulting hours with your dedicated consultant, comprehensive application review, essay editing and feedback, interview preparation, and ongoing email support between sessions. The Standard and Premium packages offer progressively more hours and deeper support, including unlimited essay revisions and mock interview sessions. All services are tailored to your specific goals and target universities."
    },
    {
      question: "How do consultations work?",
      answer: "Our initial consultations (25 or 50 minutes) are designed as conversational sessions to get to know you, understand your goals, and explore which package would be the best fit for your needs. These sessions provide value through initial assessment and guidance, while allowing us to determine how we can best support your journey. Many students book a consultation before committing to a full package."
    },
    {
      question: "Can you help with universities in any country?",
      answer: "Yes! Our consultants have experience with applications to universities in the United States, United Kingdom, and China. We're particularly strong with US Ivy League schools, UK universities including Oxbridge, and top Chinese institutions. We also provide guidance for Canadian, European, and other international universities."
    },
    {
      question: "Do you offer services in languages other than English?",
      answer: "Yes, we offer all our services in both English and Russian. Our consultants are fluent in both languages and can work with you in whichever language you're most comfortable."
    },
    {
      question: "When should I start working with a consultant?",
      answer: "Ideally, students should begin working with us in their sophomore or junior year of high school (or equivalent) to allow time for strategic planning, test preparation, extracurricular development, and essay crafting. However, we also work with students who are closer to deadlines. The earlier you start, the more comprehensive our support can be."
    },
    {
      question: "What is your success rate?",
      answer: "While we cannot guarantee admissions (no ethical consultant can), our consultants have a strong track record of helping students gain acceptance to highly competitive institutions. Our personalized approach and experienced guidance significantly improve your application's competitiveness. We're happy to discuss specific outcomes during your initial consultation."
    },
    {
      question: "How are sessions scheduled?",
      answer: "After you select a package, we'll match you with a consultant whose background and expertise align with your goals. You'll then work directly with your consultant to schedule sessions at mutually convenient times. We offer flexible scheduling to accommodate different time zones and busy student schedules."
    },
    {
      question: "What if I need to reschedule a session?",
      answer: "We understand that schedules change. Sessions can be rescheduled with at least 24 hours notice. Last-minute cancellations (less than 24 hours) may count toward your total hours, so we encourage advance planning whenever possible."
    },
    {
      question: "Can I upgrade my package later?",
      answer: "Absolutely! If you start with a smaller package and decide you need more support, we can upgrade you to a larger package. You'll only pay the difference, and any unused hours from your original package will be credited toward the new one."
    },
    {
      question: "What is the launch special offer?",
      answer: "As we're launching TopUni Consulting, we're offering special discounted rates on all our packages. These launch prices represent significant savings compared to what these services typically cost. This offer is for a limited time, so we encourage interested students to book soon to lock in these rates."
    },
    {
      question: "How do I get started?",
      answer: "The best way to start is by booking an initial consultation. This allows us to learn about your background, goals, and needs, while you get to ask questions and understand our approach. From there, we can recommend the package that best fits your situation. You can book a consultation directly on our Services & Pricing page."
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
