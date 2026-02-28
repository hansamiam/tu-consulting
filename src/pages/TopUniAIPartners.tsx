import { useState } from "react";
import { motion } from "framer-motion";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Users, Filter, Globe, BarChart3, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const TopUniAIPartners = () => {
  const { toast } = useToast();
  const [institutionName, setInstitutionName] = useState("");
  const [region, setRegion] = useState("");
  const [contact, setContact] = useState("");
  const [commission, setCommission] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    toast({ title: "Request submitted", description: "We'll be in touch within 48 hours." });
  };

  const benefits = [
    { icon: <Users className="w-6 h-6" />, title: "Pre-screened academic profiles", desc: "Students are evaluated on GPA, test scores, and readiness before matching." },
    { icon: <Filter className="w-6 h-6" />, title: "Budget-filtered applicants", desc: "Match with students whose financial capacity aligns with your fee structure." },
    { icon: <BarChart3 className="w-6 h-6" />, title: "Scholarship-aligned matching", desc: "Connect with students actively seeking funded opportunities at your institution." },
    { icon: <Globe className="w-6 h-6" />, title: "Regional marketing access", desc: "Gain visibility among ambitious students across Kyrgyzstan, Kazakhstan, and Uzbekistan." },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation language="en" />
      <div className="bg-primary text-primary-foreground text-center py-2 text-sm font-medium tracking-wide">
        <Sparkles className="inline-block w-4 h-4 mr-2 text-accent" />Launching Soon — Early Access Prototype<Sparkles className="inline-block w-4 h-4 ml-2 text-accent" />
      </div>

      <div className="max-w-5xl mx-auto px-4 py-16 space-y-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-3xl mx-auto space-y-4">
          <h1 className="text-4xl md:text-5xl font-heading font-bold text-foreground">Partner With TopUni AI as a <span className="text-accent">Pathways Sponsor</span></h1>
          <p className="text-lg text-muted-foreground leading-relaxed">We connect pre-qualified, data-profiled students from Central Asia to aligned institutions worldwide.</p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          {benefits.map((b, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Card className="h-full border-border/50 hover:border-accent/30 transition-colors">
                <CardContent className="p-6 flex gap-4">
                  <div className="text-accent shrink-0 mt-1">{b.icon}</div>
                  <div><h3 className="font-heading font-semibold text-foreground mb-1">{b.title}</h3><p className="text-sm text-muted-foreground">{b.desc}</p></div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="max-w-xl mx-auto">
          <Card className="border-accent/20">
            <CardContent className="p-8">
              {submitted ? (
                <div className="text-center py-8 space-y-4">
                  <CheckCircle2 className="w-12 h-12 text-accent mx-auto" />
                  <h3 className="text-xl font-heading font-bold text-foreground">Thank you for your interest</h3>
                  <p className="text-muted-foreground">Our partnerships team will reach out within 48 hours.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <h3 className="text-xl font-heading font-bold text-foreground">Request Partnership Discussion</h3>
                  <div className="space-y-2"><Label>Institution Name *</Label><Input required value={institutionName} onChange={e => setInstitutionName(e.target.value)} placeholder="e.g. University of Example" /></div>
                  <div className="space-y-2"><Label>Region *</Label><Input required value={region} onChange={e => setRegion(e.target.value)} placeholder="e.g. United Kingdom" /></div>
                  <div className="space-y-2"><Label>Admissions Contact Email *</Label><Input required type="email" value={contact} onChange={e => setContact(e.target.value)} placeholder="admissions@university.edu" /></div>
                  <div className="space-y-2">
                    <Label>Commission-based partnership?</Label>
                    <Select value={commission} onValueChange={setCommission}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent><SelectItem value="yes">Yes</SelectItem><SelectItem value="no">No</SelectItem><SelectItem value="discuss">Open to discussion</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Message</Label><Textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Tell us about your institution and goals..." rows={4} /></div>
                  <Button type="submit" variant="gold" size="lg" className="w-full">Request Partnership Discussion</Button>
                </form>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
      <Footer language="en" />
    </div>
  );
};

export default TopUniAIPartners;
