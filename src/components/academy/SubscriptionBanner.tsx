import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles, Zap, Crown } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const features = [
  "Full workshop & masterclass library",
  "Application Vault — real accepted SOPs, essays, CVs",
  "Learning paths with progress tracking",
  "Community lounge & peer review rooms",
  "Weekly live Q&A sessions",
  "Template & checklist downloads",
  "Priority mentor matching",
  "New content every week",
];

export const SubscriptionBanner = () => {
  const navigate = useNavigate();
  const { subscription } = useAuth();
  if (subscription.is_active) return null;
  return (
    <section className="py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-primary/90 border border-gold/20 p-8 sm:p-12"
      >
        {/* Background effects */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,hsl(var(--gold)/0.15),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_80%,hsl(var(--gold)/0.08),transparent_50%)]" />

        <div className="relative z-10 grid lg:grid-cols-2 gap-10 items-center">
          <div className="space-y-6">
            <Badge className="bg-gold/20 text-gold border-gold/30">
              <Crown className="w-3 h-3 mr-1" /> Academy Pro
            </Badge>

            <h2 className="text-3xl sm:text-4xl font-bold text-primary-foreground">
              Unlock the full{" "}
              <span className="text-gold">Academy</span>
            </h2>

            <p className="text-primary-foreground/60 text-sm">
              Get unlimited access to every workshop, template, case study, and the 
              Application Vault — the only place where you can see what actually got 
              students accepted.
            </p>

            <div className="flex flex-wrap gap-3">
              <Button variant="gold" size="lg" className="gap-2" onClick={() => navigate("/pricing")}>
                <Zap className="w-4 h-4" /> See plans
              </Button>
              <div className="flex items-center gap-2 text-sm text-primary-foreground/50">
                <span className="text-2xl font-bold text-gold">$29</span>
                <span>/mo or $290/yr</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {features.map((feature) => (
              <div key={feature} className="flex items-start gap-2">
                <Check className="w-4 h-4 text-gold mt-0.5 shrink-0" />
                <span className="text-sm text-primary-foreground/70">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </section>
  );
};
