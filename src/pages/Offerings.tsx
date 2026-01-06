import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Check, Star, ArrowLeft, Info } from "lucide-react";
import Navigation from "@/components/Navigation";
import { useToast } from "@/hooks/use-toast";
import { PaymentDialog } from "@/components/PaymentDialog";
import { PackageDetailDialog } from "@/components/PackageDetailDialog";
import { Footer } from "@/components/Footer";
import heroImage from "@/assets/hero-campus.jpg";
import heroLibrary from "@/assets/hero-library.jpg";
import yaleCampus from "@/assets/yale-campus.jpg";

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
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedConsultation, setSelectedConsultation] = useState<{name: string; price: string}>({name: "", price: ""});
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [isPackageDialogOpen, setIsPackageDialogOpen] = useState(false);
  const [isPackagePaymentOpen, setIsPackagePaymentOpen] = useState(false);
  const [isPackageDetailOpen, setIsPackageDetailOpen] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      toast({
        title: "Required fields missing",
        description: "Please fill in your name and email",
        variant: "destructive",
      });
      return;
    }

    // Close form dialog and open payment dialog
    setIsDialogOpen(false);
    setIsPaymentDialogOpen(true);
  };

  const handlePackageFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      toast({
        title: "Required fields missing",
        description: "Please fill in your name and email",
        variant: "destructive",
      });
      return;
    }

    // Close form dialog and open payment dialog
    setIsPackageDialogOpen(false);
    setIsPackagePaymentOpen(true);
  };


  const packages = [
    {
      name: "Starter Package",
      originalPrice: "78,000 KGS",
      originalPriceUsd: "≈ $899",
      price: "66,300 KGS",
      priceUsd: "≈ $764",
      discount: "15% OFF",
      sessions: "5 Sessions",
      features: [
        "5 sessions of comprehensive consulting",
        "Application timeline planning",
        "University selection guidance",
        "Essay structure review (1 essay)",
        "Mock admissions review & feedback",
      ],
      fullDescription: "The Starter Package is designed for students who need foundational guidance in their university application journey. This package provides essential support to help you understand the application process, select the right universities, and begin crafting compelling application materials. Ideal for students starting their preparation early or those who need focused help on specific aspects of their application.",
      format: "Online / Remote consultation via video call (Zoom or Google Meet). All sessions are conducted one-on-one with your dedicated consultant.",
      timeline: "Sessions can be scheduled flexibly over 2-4 months. Each session lasts approximately 50-60 minutes. Total package duration depends on your application timeline.",
      popular: false,
    },
    {
      name: "Standard Package",
      originalPrice: "138,700 KGS",
      originalPriceUsd: "≈ $1,599",
      price: "104,000 KGS",
      priceUsd: "≈ $1,199",
      discount: "25% OFF",
      sessions: "10 Sessions",
      features: [
        "10 sessions of comprehensive consulting",
        "Complete application review",
        "Essay editing & feedback (up to 3 essays)",
        "Mock admissions review & feedback",
        "Recommendation letter strategy & review",
        "Interview preparation (1 session)",
        "Email support between sessions",
        "Application proofreading",
        "Scholarship guidance",
      ],
      fullDescription: "Our most popular choice, the Standard Package offers comprehensive support throughout your entire application process. This package covers everything from initial planning to final submission, including multiple essay reviews, interview preparation, and ongoing support. Perfect for students applying to competitive universities who want thorough guidance at every step.",
      format: "Online / Remote consultation via video call (Zoom or Google Meet). All sessions are conducted one-on-one with your dedicated consultant. Includes email support for questions between sessions.",
      timeline: "Sessions typically span 4-8 months to cover the full application cycle. Each session lasts 50-60 minutes. Flexible scheduling to accommodate your school schedule and deadlines.",
      popular: true,
    },
    {
      name: "Premium Package",
      badge: "Most Comprehensive",
      originalPrice: "260,100 KGS",
      originalPriceUsd: "≈ $2,999",
      price: "169,100 KGS",
      priceUsd: "≈ $1,949",
      discount: "35% OFF",
      sessions: "20 Sessions",
      features: [
        "20 sessions of comprehensive consulting",
        "Complete application management",
        "Unlimited essay revisions (all essays)",
        "Mock admissions review & feedback",
        "Recommendation letter strategy & detailed review",
        "Mock interviews (3 sessions)",
        "Priority support throughout application cycle",
        "Personalized success strategy",
        "Post-application guidance",
        "Scholarship search assistance",
        "Networking introduction support",
      ],
      fullDescription: "The Premium Package is our most comprehensive offering, providing end-to-end support for students aiming for the world's top universities. With priority support, unlimited essay revisions, and extensive interview preparation, this package ensures you have every advantage in your application. Includes personalized strategy sessions, post-application guidance, and networking opportunities to maximize your success.",
      format: "Online / Remote consultation via video call (Zoom or Google Meet). All sessions are conducted one-on-one with your dedicated consultant. Priority email and messaging support with faster response times.",
      timeline: "Sessions span 6-12 months for complete application cycle coverage. Each session lasts 50-60 minutes. Includes post-application support and guidance through decision phase. Flexible scheduling with priority booking.",
      popular: false,
    },
  ];

  const packageBackgrounds = [heroImage, heroLibrary, yaleCampus];

  const consultations = [
    {
      name: "Diagnostic Consultation",
      price: "4,350 KGS",
      priceUsd: "≈ $50",
      duration: "25 minutes",
      description: "Perfect for initial conversation and questions",
      features: [
        "Get to know your background",
        "Discuss your goals",
        "Explore package options",
      ],
    },
    {
      name: "Strategy Consultation",
      price: "7,800 KGS",
      priceUsd: "≈ $90",
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-12">
        {/* Hero Section */}
        <div className="text-center mb-8 md:mb-16 animate-fade-in">
          <div className="inline-block px-3 py-1.5 md:px-4 md:py-2 bg-accent/10 border border-accent/20 rounded-full mb-3 md:mb-4">
            <p className="text-accent font-semibold text-xs md:text-sm uppercase tracking-wide">Launch Special</p>
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-gold via-accent to-primary bg-clip-text text-transparent mb-3 md:mb-4 px-2">
            Our Services & Pricing
          </h1>
          <p className="text-sm md:text-lg text-muted-foreground max-w-2xl mx-auto mb-2 px-4">
            Choose the perfect package to achieve your university admission goals
          </p>
        </div>

        {/* Package Pricing */}
        <section className="mb-12 md:mb-20 animate-enter">
          <h2 className="font-heading text-xl sm:text-2xl md:text-3xl font-bold text-center mb-3 md:mb-4 text-foreground px-4">
            Consulting Packages
          </h2>
          <p className="text-center text-sm md:text-base text-muted-foreground max-w-2xl mx-auto mb-6 md:mb-12 px-4">
            While not mandatory, we highly advise you to book either a Diagnostic or Strategy Consultation to better understand what we offer before purchasing a package.
          </p>
          <div className="grid md:grid-cols-3 gap-4 md:gap-8">
            {packages.map((pkg, index) => (
                <Card
                key={index}
                className={`relative border-gold/30 bg-card/60 backdrop-blur-sm hover:shadow-xl transition-all ${
                  pkg.popular
                    ? "shadow-lg md:scale-105 border-accent/60 ring-1 ring-accent/10"
                    : ""
                }`}
                style={{
                  backgroundImage: `linear-gradient(hsla(var(--background)/0.88), hsla(var(--background)/0.88)), url(${packageBackgrounds[index]})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              >
                {pkg.badge && (
                  <div className="absolute -top-3 -right-2 md:-top-4 md:left-1/2 md:-translate-x-1/2 md:right-auto rotate-12 md:rotate-0">
                    <span className="bg-accent text-accent-foreground px-3 py-1 md:px-4 rounded-full text-xs md:text-sm font-semibold flex items-center gap-1 shadow-lg">
                      <Star size={12} className="md:w-[14px] md:h-[14px]" fill="currentColor" />
                      {pkg.badge}
                    </span>
                  </div>
                )}
                <CardHeader className="text-center pt-6 md:pt-8 pb-4 md:pb-6">
                  <CardTitle className="text-lg md:text-2xl mb-2">{pkg.name}</CardTitle>
                  <div className="space-y-1 md:space-y-2">
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      <span className="text-xs md:text-sm text-muted-foreground line-through">
                        {pkg.originalPrice}
                      </span>
                      <span className="text-xs text-muted-foreground/70">
                        ({pkg.originalPriceUsd})
                      </span>
                      <span className="bg-destructive text-destructive-foreground text-xs px-1.5 md:px-2 py-0.5 md:py-1 rounded">
                        {pkg.discount}
                      </span>
                    </div>
                    <div className="text-xl md:text-3xl font-bold text-accent">{pkg.price}</div>
                    <div className="text-sm text-muted-foreground">({pkg.priceUsd})</div>
                  </div>
                  <CardDescription className="text-sm md:text-base pt-1 md:pt-2">
                    {pkg.sessions}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 md:space-y-4 pb-4 md:pb-6">
                  <ul className="space-y-2 md:space-y-3">
                    {pkg.features.slice(0, 5).map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="text-accent flex-shrink-0 mt-0.5" size={16} />
                        <span className="text-xs md:text-sm text-foreground">{feature}</span>
                      </li>
                    ))}
                    {pkg.features.length > 5 && (
                      <li className="text-xs md:text-sm text-muted-foreground italic">
                        +{pkg.features.length - 5} more features...
                      </li>
                    )}
                  </ul>
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      className="w-full border-accent/30"
                      onClick={() => {
                        setSelectedPackage(pkg);
                        setIsPackageDetailOpen(true);
                      }}
                    >
                      <Info size={16} className="mr-2" />
                      View Details
                    </Button>
                    <Button
                      variant={pkg.popular ? "gold" : "default"}
                      className="w-full"
                      onClick={() => {
                        setSelectedPackage(pkg);
                        setIsPackageDialogOpen(true);
                      }}
                    >
                      Select Package
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Individual Consultations */}
        <section className="mb-12 md:mb-20 animate-fade-in">
          <div className="text-center mb-6 md:mb-8">
            <h2 className="font-heading text-xl sm:text-2xl md:text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent px-4">
              Not Ready Yet?
            </h2>
            <p className="text-muted-foreground text-sm md:text-lg mb-2 md:mb-4 px-4">
              Start with a trial consultation to experience our service
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-4 md:gap-8 max-w-4xl mx-auto">
            {consultations.map((consultation, index) => (
              <Card key={index} className="border-gold/30 bg-card/50 backdrop-blur-sm hover:shadow-lg transition-all">
                <CardHeader className="pb-4 md:pb-6">
                  <CardTitle className="text-lg md:text-xl">{consultation.name}</CardTitle>
                  <div className="pt-1 md:pt-2">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl md:text-3xl font-bold text-accent">{consultation.price}</span>
                      <span className="text-sm md:text-base text-muted-foreground">/ {consultation.duration}</span>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">({consultation.priceUsd})</div>
                  </div>
                  <CardDescription className="pt-1 md:pt-2 text-xs md:text-sm">{consultation.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 md:space-y-4">
                  <ul className="space-y-1.5 md:space-y-2">
                    {consultation.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="text-accent flex-shrink-0 mt-0.5" size={16} />
                        <span className="text-xs md:text-sm text-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    variant="outline"
                    className="w-full border-accent/30"
                    onClick={() => {
                      setSelectedConsultation({name: consultation.name, price: consultation.price});
                      setIsDialogOpen(true);
                    }}
                  >
                    Book Now
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Consultation Form Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">Book Your {selectedConsultation.name}</DialogTitle>
              <DialogDescription className="text-base">
                Help us prepare for your session. The more details you provide, the more value you'll get from your consultation time.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleFormSubmit} className="space-y-6 mt-4">
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

              <div className="flex gap-4 pt-4">
                <Button
                  type="submit"
                  variant="gold"
                  className="flex-1"
                >
                  Continue to Payment
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Consultation Payment Dialog */}
        <PaymentDialog
          open={isPaymentDialogOpen}
          onOpenChange={setIsPaymentDialogOpen}
          consultationType={selectedConsultation.name}
          price={selectedConsultation.price}
          language="en"
          isConsultation={true}
        />

        {/* Package Form Dialog */}
        <Dialog open={isPackageDialogOpen} onOpenChange={setIsPackageDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">Book Your {selectedPackage?.name}</DialogTitle>
              <DialogDescription className="text-base">
                Help us prepare for your program. The more details you provide, the better we can tailor our services to your needs.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handlePackageFormSubmit} className="space-y-6 mt-4">
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
                <Label htmlFor="goals">What do you hope to achieve from this program?</Label>
                <Textarea
                  id="goals"
                  name="goals"
                  value={formData.goals}
                  onChange={handleInputChange}
                  placeholder="Be specific about what you want to get out of our program..."
                  rows={4}
                />
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  type="submit"
                  variant="gold"
                  className="flex-1"
                >
                  Continue to Payment
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Package Payment Dialog */}
        <PaymentDialog
          open={isPackagePaymentOpen}
          onOpenChange={setIsPackagePaymentOpen}
          consultationType={selectedPackage?.name || ""}
          price={selectedPackage?.price || ""}
          language="en"
          isConsultation={false}
        />

        {/* Package Detail Dialog */}
        <PackageDetailDialog
          isOpen={isPackageDetailOpen}
          onClose={() => setIsPackageDetailOpen(false)}
          package={selectedPackage}
          onProceedToPayment={() => {
            setIsPackageDetailOpen(false);
            setIsPackageDialogOpen(true);
          }}
          language="en"
        />

        {/* Trust Section */}
        <section className="mt-20">
          <Card className="border-gold/20 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-8 text-center space-y-4">
              <p className="text-foreground font-medium">
                Led by consultants from Yale, Harvard, Cambridge, and Tsinghua
              </p>
              <p className="text-muted-foreground">
                Available in Russian and English
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Footer */}
        <section className="mt-12 pb-8">
          <Footer language="en" variant="light" />
        </section>
      </main>
    </div>
  );
};

export default Offerings;
