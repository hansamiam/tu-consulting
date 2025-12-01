import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Check, Star, ArrowLeft } from "lucide-react";
import Navigation from "@/components/Navigation";
import { useToast } from "@/hooks/use-toast";
import { PaymentDialog } from "@/components/PaymentDialog";
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
  const [selectedPackage, setSelectedPackage] = useState<{name: string; price: string}>({name: "", price: ""});
  const [isPackageDialogOpen, setIsPackageDialogOpen] = useState(false);
  const [isPackagePaymentOpen, setIsPackagePaymentOpen] = useState(false);

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
      originalPrice: "$899",
      price: "$764",
      discount: "15% OFF",
      hours: "5 Sessions",
      features: [
        "5 sessions of comprehensive consulting",
        "Application timeline planning",
        "University selection guidance",
        "Essay structure review (1 essay)",
        "Mock admissions review & feedback",
      ],
      popular: false,
    },
    {
      name: "Standard Package",
      originalPrice: "$1,599",
      price: "$1,199",
      discount: "25% OFF",
      hours: "10 Sessions",
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
      popular: true,
    },
    {
      name: "Premium Package",
      badge: "Most Comprehensive",
      originalPrice: "$2,999",
      price: "$1,949",
      discount: "35% OFF",
      hours: "20 Sessions",
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
      popular: false,
    },
  ];

  const packageBackgrounds = [heroImage, heroLibrary, yaleCampus];

  const consultations = [
    {
      name: "Diagnostic Consultation",
      price: "$50",
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
      price: "$90",
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16 animate-fade-in">
          <div className="inline-block px-4 py-2 bg-accent/10 border border-accent/20 rounded-full mb-4">
            <p className="text-accent font-semibold text-sm uppercase tracking-wide">Launch Special</p>
          </div>
          <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-gold via-accent to-primary bg-clip-text text-transparent mb-4">
            Our Services & Pricing
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-2">
            Choose the perfect package to achieve your university admission goals
          </p>
        </div>

        {/* Package Pricing */}
        <section className="mb-20 animate-enter">
          <h2 className="font-heading text-3xl font-bold text-center mb-4 text-foreground">
            Consulting Packages
          </h2>
          <p className="text-center text-muted-foreground max-w-2xl mx-auto mb-12">
            While not mandatory, we highly advise you to book either a Diagnostic or Strategy Consultation to better understand what we offer before purchasing a package.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {packages.map((pkg, index) => (
                <Card
                key={index}
                className={`relative border-gold/30 bg-card/60 backdrop-blur-sm hover:shadow-xl transition-all ${
                  pkg.popular
                    ? "shadow-lg scale-105 border-accent/50"
                    : ""
                }`}
                style={{
                  backgroundImage: `linear-gradient(hsla(var(--background)/0.88), hsla(var(--background)/0.88)), url(${packageBackgrounds[index]})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
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
                      setSelectedPackage({name: pkg.name, price: pkg.price});
                      setIsPackageDialogOpen(true);
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
        <section className="mb-20 animate-fade-in">
          <div className="text-center mb-8">
            <h2 className="font-heading text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Not Ready Yet?
            </h2>
            <p className="text-muted-foreground text-lg mb-4">
              Start with a trial consultation to experience our service
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {consultations.map((consultation, index) => (
              <Card key={index} className="border-gold/30 bg-card/50 backdrop-blur-sm hover:shadow-lg transition-all">
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
              <DialogTitle className="text-2xl">Book Your {selectedPackage.name}</DialogTitle>
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
          consultationType={selectedPackage.name}
          price={selectedPackage.price}
          language="en"
          isConsultation={false}
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
              <p className="text-sm text-muted-foreground">
                Questions?{" "}
                <a href="mailto:team@topuniconsulting.com" className="text-accent hover:underline font-medium">
                  team@topuniconsulting.com
                </a>
              </p>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
};

export default Offerings;
