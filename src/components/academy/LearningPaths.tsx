import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowRight, GraduationCap, FileText, Globe, DollarSign, Mic, BookOpen } from "lucide-react";
import { motion } from "framer-motion";

const paths = [
  {
    id: "application-mastery",
    title: "Application Mastery",
    description: "From zero to submitted — every step of crafting a winning application",
    icon: GraduationCap,
    modules: 8,
    hours: 12,
    color: "from-blue-500/20 to-blue-600/10",
    borderColor: "border-blue-500/30",
  },
  {
    id: "essay-excellence",
    title: "Essay Excellence",
    description: "Write SOPs, personal statements, and supplemental essays that stand out",
    icon: FileText,
    modules: 6,
    hours: 8,
    color: "from-purple-500/20 to-purple-600/10",
    borderColor: "border-purple-500/30",
  },
  {
    id: "scholarship-hunter",
    title: "Scholarship Hunter",
    description: "Find, apply, and win scholarships — from partial to full rides",
    icon: DollarSign,
    modules: 5,
    hours: 6,
    color: "from-green-500/20 to-green-600/10",
    borderColor: "border-green-500/30",
  },
  {
    id: "test-prep-accelerator",
    title: "Test Prep Accelerator",
    description: "IELTS & SAT strategies, shortcuts, and score-boosting techniques",
    icon: BookOpen,
    modules: 10,
    hours: 15,
    color: "from-gold/20 to-gold/10",
    borderColor: "border-gold/30",
  },
  {
    id: "interview-ready",
    title: "Interview Ready",
    description: "Mock interviews, body language, and answers that impress admissions",
    icon: Mic,
    modules: 4,
    hours: 5,
    color: "from-red-500/20 to-red-600/10",
    borderColor: "border-red-500/30",
  },
  {
    id: "country-deep-dives",
    title: "Country Deep Dives",
    description: "Everything about studying in the UK, US, Canada, Europe, and Asia",
    icon: Globe,
    modules: 7,
    hours: 10,
    color: "from-cyan-500/20 to-cyan-600/10",
    borderColor: "border-cyan-500/30",
  },
];

export const LearningPaths = () => {
  return (
    <section className="py-16">
      <div className="text-center mb-10">
        <Badge className="bg-gold/15 text-gold border-gold/30 mb-3">Learning Paths</Badge>
        <h2 className="text-3xl font-bold text-foreground">
          Structured journeys, not random videos
        </h2>
        <p className="text-muted-foreground mt-2 max-w-xl mx-auto">
          Each path is a curated sequence of workshops, templates, and case studies 
          designed to take you from confused to confident.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {paths.map((path, i) => (
          <motion.div
            key={path.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className={`group cursor-pointer border ${path.borderColor} hover:shadow-lg transition-all duration-300 h-full`}>
              <CardContent className="p-5 space-y-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${path.color} flex items-center justify-center`}>
                  <path.icon className="w-6 h-6 text-foreground/70" />
                </div>
                
                <div>
                  <h3 className="font-semibold text-foreground group-hover:text-gold transition-colors">
                    {path.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">{path.description}</p>
                </div>

                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{path.modules} modules</span>
                  <span>{path.hours}h total</span>
                </div>

                <div className="flex items-center text-xs text-gold font-medium group-hover:gap-2 transition-all">
                  Start Path <ArrowRight className="w-3 h-3 ml-1" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  );
};
