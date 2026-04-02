import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, MessageSquare, Trophy, Flame, ArrowRight, Vault, BookMarked } from "lucide-react";
import { motion } from "framer-motion";

const upcomingFeatures = [
  {
    icon: Vault,
    title: "Application Vault",
    description: "Browse real accepted SOPs, essays, and CVs tagged by university, program, and year. Learn from what actually worked.",
    status: "Coming Soon",
    statusColor: "bg-gold/15 text-gold",
  },
  {
    icon: MessageSquare,
    title: "Peer Review Rooms",
    description: "Join real-time rooms with students targeting the same universities. Review each other's essays, share intel, co-work on deadlines.",
    status: "Coming Soon",
    statusColor: "bg-blue-500/15 text-blue-500",
  },
  {
    icon: Trophy,
    title: "Acceptance Intelligence",
    description: "Community-wide anonymized tracker showing who applied where and results. Real-time admission pulse that gets smarter every cycle.",
    status: "In Development",
    statusColor: "bg-purple-500/15 text-purple-500",
  },
  {
    icon: Users,
    title: "Micro-Mentorship",
    description: "Current students at your target universities become paid micro-mentors. 15-min calls, essay reviews, insider tips.",
    status: "Planning",
    statusColor: "bg-green-500/15 text-green-500",
  },
];

export const CommunityTeaser = () => {
  return (
    <section className="py-16">
      <div className="text-center mb-10">
        <Badge className="bg-gold/15 text-gold border-gold/30 mb-3">
          <Flame className="w-3 h-3 mr-1" /> What's Next
        </Badge>
        <h2 className="text-3xl font-bold text-foreground">
          More than content — a <span className="text-gold">living ecosystem</span>
        </h2>
        <p className="text-muted-foreground mt-2 max-w-xl mx-auto text-sm">
          We're building features that no other platform has. The Academy isn't just a video library — 
          it's a community-powered intelligence network.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {upcomingFeatures.map((feature, i) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="border-dashed border-border/60 bg-muted/30 h-full hover:border-gold/30 transition-all">
              <CardContent className="p-6 space-y-3">
                <div className="flex items-start justify-between">
                  <feature.icon className="w-8 h-8 text-gold/50" />
                  <Badge className={`text-[10px] ${feature.statusColor}`}>{feature.status}</Badge>
                </div>
                <h3 className="font-semibold text-foreground">{feature.title}</h3>
                <p className="text-xs text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="text-center mt-8">
        <Button variant="outline" className="border-gold/30 text-gold hover:bg-gold/10 gap-2">
          <BookMarked className="w-4 h-4" /> Join Waitlist for Early Access
          <ArrowRight className="w-3 h-3" />
        </Button>
      </div>
    </section>
  );
};
