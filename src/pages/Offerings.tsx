import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Check, Star, ArrowLeft } from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useToast } from "@/hooks/use-toast";

const Offerings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    currentGrade: "",
    targetUniversities: "",
    intendedMajor: "",
    currentChallenges: "",
    goals: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFormSubmit = (consultationType: string) => {
    // Validate form
    if (!formData.name || !formData.email) {
      toast({
        title: "Required fields missing",
        description: "Please fill in your name and email",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Form submitted!",
      description: "We'll contact you shortly to schedule your consultation.",
    });

    // Reset form
    setFormData({
      name: "",
      email: "",
      phone: "",
      currentGrade: "",
      targetUniversities: "",
      intendedMajor: "",
      currentChallenges: "",
      goals: "",
    });
  };

  const packages = [
    {
      name: "Starter Package",
      originalPrice: "$899",
      price: "$699",
      discount: "22% OFF",
      hours: "5 Hours",
      features: [
        "5 hours of comprehensive consulting",
        "Application timeline planning",
        "University selection guidance",
        "Email support between sessions",
      ],
      popular: false,
    },
    {
      name: "Standard Package",
      badge: "Best Value",
      originalPrice: "$1,599",
      price: "$1,199",
      discount: "25% OFF",
      hours: "10 Hours",
      features: [
        "10 hours of comprehensive consulting",
        "Complete application review",
        "Essay editing & feedback",
        "Interview preparation",
        "Priority email support",
      ],
      popular: true,
    },
    {
      name: "Premium Package",
      badge: "Most Comprehensive",
      originalPrice: "$2,799",
      price: "$2,299",
      discount: "18% OFF",
      hours: "20 Hours",
      features: [
        "20 hours of comprehensive consulting",
        "Complete application management",
        "Unlimited essay revisions",
        "Mock interviews (3 sessions)",
        "Priority support",
        "Personalized success strategy",
        "Post-application guidance",
      ],
      popular: false,
    },
  ];

  const consultations = [
    {
      name: "Quick Consultation",
      price: "$60",
      duration: "25 minutes",
      description: "Perfect for initial conversation and questions",
      features: [
        "Get to know your background",
        "Discuss your goals",
        "Explore package options",
      ],
    },
    {
      name: "In-Depth Consultation",
      price: "$100",
      duration: "50 minutes",
      description: "Extended session to discuss your journey",
      features: [
        "Comprehensive discussion",
        "Initial assessment",
        "Package recommendations",
        "Q&A session",
      ],
    },
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-block px-4 py-2 bg-accent/10 border border-accent/20 rounded-full mb-4">
            <p className="text-accent font-semibold text-sm">🎉 LAUNCH SPECIAL - Limited Time Offer!</p>
          </div>
          <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4">
            Our Services & Pricing
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Choose the perfect package to achieve your university admission goals
          </p>
        </div>

        {/* Package Pricing */}
        <section className="mb-20">
          <h2 className="font-heading text-3xl font-bold text-center mb-12 text-foreground">
            Consulting Packages
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {packages.map((pkg, index) => (
              <Card
                key={index}
                className={`relative ${
                  pkg.popular
                    ? "border-accent shadow-lg scale-105 bg-gradient-to-br from-accent/5 to-transparent"
                    : "border-border"
                }`}
              >
                {pkg.badge && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-accent text-accent-foreground px-4 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                      <Star size={14} fill="currentColor" />
                      {pkg.badge}
                    </span>
                  </div>
                )}
                <CardHeader className="text-center pt-8">
                  <CardTitle className="text-2xl mb-2">{pkg.name}</CardTitle>
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-sm text-muted-foreground line-through">
                        {pkg.originalPrice}
                      </span>
                      <span className="bg-destructive text-destructive-foreground text-xs px-2 py-1 rounded">
                        {pkg.discount}
                      </span>
                    </div>
                    <div className="text-4xl font-bold text-accent">{pkg.price}</div>
                  </div>
                  <CardDescription className="text-base pt-2">
                    {pkg.hours}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-3">
                    {pkg.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="text-accent flex-shrink-0 mt-0.5" size={20} />
                        <span className="text-sm text-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    variant={pkg.popular ? "gold" : "default"}
                    className="w-full"
                    onClick={() => {
                      toast({
                        title: "Coming Soon!",
                        description: "Package booking will be available shortly.",
                      });
                    }}
                  >
                    Select Package
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Individual Consultations */}
        <section className="mb-20">
          <div className="text-center mb-12">
            <h2 className="font-heading text-3xl font-bold mb-4 text-foreground">
              Individual Consultations
            </h2>
            <p className="text-muted-foreground">
              Not ready for a package? Start with a single consultation
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {consultations.map((consultation, index) => (
              <Card key={index} className="border-border">
                <CardHeader>
                  <CardTitle className="text-xl">{consultation.name}</CardTitle>
                  <div className="flex items-baseline gap-2 pt-2">
                    <span className="text-3xl font-bold text-accent">{consultation.price}</span>
                    <span className="text-muted-foreground">/ {consultation.duration}</span>
                  </div>
                  <CardDescription className="pt-2">{consultation.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {consultation.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="text-accent flex-shrink-0 mt-0.5" size={18} />
                        <span className="text-sm text-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      const formSection = document.getElementById("consultation-form");
                      formSection?.scrollIntoView({ behavior: "smooth" });
                    }}
                  >
                    Book Now
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Consultation Preparation Form */}
        <section id="consultation-form" className="max-w-3xl mx-auto">
          <Card className="border-accent/20 bg-gradient-to-br from-accent/5 to-transparent">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Maximize Your Consultation</CardTitle>
              <CardDescription className="text-base">
                Help us prepare for your session by sharing some information. The more details you provide,
                the more value you'll get from your consultation time.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="John Doe"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="john@example.com"
                      required
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="+1234567890"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currentGrade">Current Grade/Year</Label>
                    <Input
                      id="currentGrade"
                      name="currentGrade"
                      value={formData.currentGrade}
                      onChange={handleInputChange}
                      placeholder="e.g., 11th grade"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="targetUniversities">Target Universities</Label>
                  <Textarea
                    id="targetUniversities"
                    name="targetUniversities"
                    value={formData.targetUniversities}
                    onChange={handleInputChange}
                    placeholder="List the universities you're interested in..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="intendedMajor">Intended Major/Field</Label>
                  <Input
                    id="intendedMajor"
                    name="intendedMajor"
                    value={formData.intendedMajor}
                    onChange={handleInputChange}
                    placeholder="e.g., Computer Science, Business"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currentChallenges">Current Challenges</Label>
                  <Textarea
                    id="currentChallenges"
                    name="currentChallenges"
                    value={formData.currentChallenges}
                    onChange={handleInputChange}
                    placeholder="What are your main concerns or challenges with the application process?"
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="goals">What do you hope to achieve from this consultation?</Label>
                  <Textarea
                    id="goals"
                    name="goals"
                    value={formData.goals}
                    onChange={handleInputChange}
                    placeholder="Be specific about what you want to get out of our session..."
                    rows={4}
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <Button
                    type="button"
                    variant="gold"
                    className="flex-1"
                    onClick={() => handleFormSubmit("25min")}
                  >
                    Book 25-min Consultation ($60)
                  </Button>
                  <Button
                    type="button"
                    variant="gold"
                    className="flex-1"
                    onClick={() => handleFormSubmit("50min")}
                  >
                    Book 50-min Consultation ($100)
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </section>

        {/* Cohort Intake Section */}
        <section className="mt-20">
          <Card className="border-accent/30 bg-gradient-to-br from-accent/10 to-transparent">
            <CardHeader className="text-center">
              <div className="inline-block mx-auto px-4 py-2 bg-accent/20 border border-accent/30 rounded-full mb-2">
                <p className="text-accent font-semibold text-sm">🎯 LIMITED SPOTS AVAILABLE</p>
              </div>
              <CardTitle className="text-3xl">Join Our Next Cohort</CardTitle>
              <CardDescription className="text-base max-w-2xl mx-auto">
                We accept students in cohorts to ensure personalized attention and exceptional results. 
                Our cohort-based approach allows us to dedicate focused time to each student's unique journey.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto">
                <div className="space-y-2">
                  <div className="text-2xl font-bold text-accent">Next Intake</div>
                  <p className="text-sm text-muted-foreground">Rolling Admissions</p>
                </div>
                <div className="space-y-2">
                  <div className="text-2xl font-bold text-accent">Spots Left</div>
                  <p className="text-sm text-muted-foreground">Contact for Availability</p>
                </div>
                <div className="space-y-2">
                  <div className="text-2xl font-bold text-accent">Start Date</div>
                  <p className="text-sm text-muted-foreground">Upon Enrollment</p>
                </div>
              </div>
              <Button
                variant="gold"
                size="lg"
                onClick={() => {
                  const formSection = document.getElementById("consultation-form");
                  formSection?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                Apply for Next Cohort
              </Button>
            </CardContent>
          </Card>
        </section>

        {/* Trust Section */}
        <section className="mt-20 text-center">
          <div className="max-w-2xl mx-auto space-y-4">
            <p className="text-muted-foreground">
              🎓 All consultations are led by consultants from top universities including Yale, Harvard, Cambridge, and Tsinghua
            </p>
            <p className="text-muted-foreground">
              🌍 Available in Russian and English
            </p>
            <p className="text-sm text-muted-foreground">
              Questions? Email us at{" "}
              <a href="mailto:team@topuniconsulting.com" className="text-accent hover:underline">
                team@topuniconsulting.com
              </a>
            </p>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Offerings;
