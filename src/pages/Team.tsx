import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { ArrowLeft, GraduationCap, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import aigulPhoto from "@/assets/aigul.jpeg";
import joshPhoto from "@/assets/josh.jpg";
import nurzadaPhoto from "@/assets/nurzada.jpg";
import samuelPhoto from "@/assets/samuel.jpg";
import usFlag from "@/assets/flags/us.svg";
import caFlag from "@/assets/flags/ca.svg";
import gbFlag from "@/assets/flags/gb.svg";
import cnFlag from "@/assets/flags/cn.svg";
import krFlag from "@/assets/flags/kr.svg";
import { ScrollProgress } from "@/components/ScrollProgress";
import { ScrollReveal } from "@/components/ScrollReveal";
import { StaggerContainer, StaggerItem } from "@/hooks/use-stagger-animation";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { motion } from "framer-motion";

interface TeamMember {
  name: string;
  title: string;
  tagline: string;
  photo: string;
  hometown: string;
  /** Branded universities front and center — used by the chip strip
   *  on each card. The longer prose form lives in `education` for the
   *  modal-detail view. */
  universities: string[];
  education: string;
  languages: string;
  strengths: string;
  accomplishments: string[];
}

const Team = () => {
  const navigate = useNavigate();

  const teamMembers: TeamMember[] = [
    {
      name: "Samuel Han",
      title: "Founder & CEO",
      tagline: "Yale Alum",
      photo: samuelPhoto,
      hometown: "Toronto, Canada",
      universities: ["Yale", "Tsinghua", "Waseda", "Harvard Medical (research)"],
      education: "Yale University",
      languages: "English, Korean (bilingual); Russian, Chinese (conversational)",
      strengths: "Learning strategies, gap year students, natural sciences, immigrants and third-culture kids, supporting students with ADHD",
      accomplishments: [
        "Research experience at Massachusetts General Hospital and Harvard Medical School",
        "Fully-funded programs in China (Tsinghua University) and Japan (Waseda University)",
        "Aga Khan Foundation Canada Research & Development Fellow at University of Central Asia",
      ],
    },
    {
      name: "Nurzada Abdivalieva",
      title: "Co-Founder & Head of Consulting",
      tagline: "Schwarzman Scholar",
      photo: nurzadaPhoto,
      hometown: "Bishkek, Kyrgyzstan",
      universities: ["Cambridge", "Tsinghua", "KDI", "AUCA"],
      education: "American University of Central Asia | Korea Development Institute (KDI) | University of Cambridge | Tsinghua University",
      languages: "Russian (native), Kyrgyz (native), English (advanced)",
      strengths: "Scholarships and funding strategies, self-funded education pathways, cross-cultural adaptation, compelling storytelling, social sciences",
      accomplishments: [
        "US Central Asia Education Fellowship — fully funded BA at AUCA",
        "Capstone Finalist — fully funded 3-month internship in Washington, DC",
        "Global Ambassador Scholarship — fully funded MA at KDI School",
        "UCA Cambridge Trust — fully funded MPhil at the University of Cambridge",
        "Schwarzman Scholar — prestigious full-ride MA at Tsinghua University (<3% acceptance)",
      ],
    },
    {
      name: "Josh Hughes",
      title: "Lead Consultant",
      tagline: "Harvard Graduate Student",
      photo: joshPhoto,
      hometown: "North Augusta, South Carolina, USA",
      universities: ["Harvard", "South Carolina", "FLAS Fellow"],
      education: "University of South Carolina | Harvard University",
      languages: "English (native), Russian (advanced), Kyrgyz (lower intermediate)",
      strengths: "Graduate program applications, academic research, essay refinement, languages and humanities, test-taking strategies",
      accomplishments: [
        "Foreign Language and Area Studies (FLAS) Fellow, 2024–2026",
        "Ethnographic research in Kyrgyzstan (2025)",
        "Critical Language Scholarship (CLS) recipient, 2023",
      ],
    },
    {
      name: "Aigul Abdoubaetova",
      title: "Senior Advisor",
      tagline: "Ex-Head at OSCE Academy",
      photo: aigulPhoto,
      hometown: "Bishkek, Kyrgyzstan",
      universities: ["University of Oregon", "GWU", "OSCE Academy"],
      education: "University of Oregon",
      languages: "English (fluent), Kyrgyz (native), Russian (fluent)",
      strengths: "Recommendation letter guidance, career coaching, early-to-mid career professionals, institutional advising, international networking",
      accomplishments: [
        "American Association of University Women Fellowship (2002)",
        "Central Asia Research Fellow, Elliott School of International Affairs, GWU (2019)",
        "Research & Teaching Fellowship, OSCE Academy (2009)",
        "International Peace Scholarship, P.E.O. (2001)",
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <ScrollProgress />
      <Navigation language="en" />

      {/* HERO — navy gradient panel matching Index / Academy ────────── */}
      <section className="relative bg-gradient-to-br from-primary via-primary to-primary/90 py-20 sm:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_hsl(var(--gold)/0.1),_transparent_60%)]" />
        <div className="relative max-w-3xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 bg-gold/15 border border-gold/40 px-3 py-1 rounded-full text-gold text-xs font-semibold mb-6"
          >
            <GraduationCap className="h-3.5 w-3.5" /> The team
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="text-4xl sm:text-6xl font-heading font-bold text-primary-foreground mb-5 leading-tight tracking-tight"
          >
            Built by alumni of <span className="text-gold">Yale, Cambridge & Harvard</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-primary-foreground/75 text-base sm:text-lg max-w-xl mx-auto leading-relaxed"
          >
            Founders, scholars, and advisors who've been through the admissions and full-ride scholarship gauntlet themselves.
          </motion.p>
        </div>
      </section>

      {/* Stats strip — sits on light background just below hero ─────── */}
      <section className="container mx-auto px-4 -mt-12 sm:-mt-14 mb-12 sm:mb-16 relative z-10">
        <ScrollReveal delay={0.1}>
          <div className="max-w-4xl mx-auto bg-card border border-border rounded-2xl shadow-lg px-6 sm:px-10 py-7 grid grid-cols-3 gap-3 sm:gap-8">
            <div className="text-center">
              <div className="text-2xl sm:text-4xl font-bold text-gold-dark dark:text-gold tabular-nums leading-none">
                $<AnimatedNumber value={500} />K+
              </div>
              <div className="text-[11px] sm:text-xs text-muted-foreground mt-2 leading-snug">
                in scholarships secured
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-4xl font-bold text-gold-dark dark:text-gold tabular-nums leading-none">
                <AnimatedNumber value={10} />+
              </div>
              <div className="text-[11px] sm:text-xs text-muted-foreground mt-2 leading-snug">
                years of collective experience
              </div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1.5 sm:gap-2 min-h-[28px] sm:min-h-[40px]">
                <FlagBubble src={usFlag} alt="USA" />
                <FlagBubble src={caFlag} alt="Canada" />
                <FlagBubble src={gbFlag} alt="UK" />
                <FlagBubble src={cnFlag} alt="China" />
                <FlagBubble src={krFlag} alt="South Korea" />
              </div>
              <div className="text-[11px] sm:text-xs text-muted-foreground mt-2 leading-snug">
                cross-continental expertise
              </div>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* Team grid ─────────────────────────────────────────────────── */}
      <main className="container mx-auto px-4 pb-16 sm:pb-20">
        <div className="max-w-6xl mx-auto">
          <StaggerContainer className="grid md:grid-cols-2 gap-5 md:gap-6">
            {teamMembers.map((member, index) => (
              <StaggerItem key={index}>
                <Dialog>
                  <DialogTrigger asChild>
                    <Card className="group p-6 md:p-7 transition-all duration-300 border-border bg-card hover:border-gold/45 hover:shadow-xl hover:-translate-y-0.5 cursor-pointer h-full">
                      <div className="flex flex-col h-full">
                        {/* Photo + name lockup */}
                        <div className="flex items-center gap-4 mb-5">
                          <div className="relative shrink-0">
                            <div className="absolute inset-0 bg-gradient-to-br from-gold/20 to-primary/15 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <img
                              src={member.photo}
                              alt={member.name}
                              className="relative w-20 h-20 md:w-24 md:h-24 rounded-full object-cover border-2 border-border group-hover:border-gold/55 transition-all duration-300"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h2 className="text-lg md:text-xl font-heading font-bold text-foreground leading-tight tracking-tight group-hover:text-gold-dark dark:group-hover:text-gold transition-colors">
                              {member.name}
                            </h2>
                            <p className="text-[11px] uppercase tracking-[0.18em] text-gold-dark dark:text-gold font-bold mt-1.5">
                              {member.title}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {member.tagline}
                            </p>
                          </div>
                        </div>

                        {/* University brand strip — front and center.
                            Each chip carries the institution name in a
                            consistent gold-tinted treatment so the
                            credentialing is the first thing the eye
                            lands on after the photo. */}
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {member.universities.map((u, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold bg-gold/10 text-gold-dark dark:text-gold border border-gold/30 px-2 py-1 rounded-md"
                            >
                              {u}
                            </span>
                          ))}
                        </div>

                        <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                          {member.strengths.split(",").slice(0, 3).join(", ")}.
                        </p>

                        <div className="mt-auto pt-3 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>📍 {member.hometown}</span>
                          <span className="inline-flex items-center gap-1 text-gold-dark dark:text-gold font-semibold group-hover:underline">
                            Read more →
                          </span>
                        </div>
                      </div>
                    </Card>
                  </DialogTrigger>

                  <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-background">
                    <DialogHeader>
                      <div className="flex items-start gap-5">
                        <img
                          src={member.photo}
                          alt={member.name}
                          className="w-24 h-24 rounded-full object-cover border-2 border-border shrink-0"
                        />
                        <div className="min-w-0">
                          <DialogTitle className="text-xl md:text-2xl font-heading font-bold text-foreground tracking-tight">
                            {member.name}
                          </DialogTitle>
                          <p className="text-[11px] uppercase tracking-[0.18em] text-gold-dark dark:text-gold font-bold mt-1.5">
                            {member.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">{member.tagline}</p>
                        </div>
                      </div>
                    </DialogHeader>

                    <div className="space-y-5 mt-3">
                      <div className="flex flex-wrap gap-1.5">
                        {member.universities.map((u, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold bg-gold/10 text-gold-dark dark:text-gold border border-gold/30 px-2 py-1 rounded-md"
                          >
                            {u}
                          </span>
                        ))}
                      </div>

                      <DetailRow label="Hometown" value={member.hometown} />
                      <DetailRow label="Education" value={member.education} />
                      <DetailRow label="Languages" value={member.languages} />
                      <DetailRow label="Strengths" value={member.strengths} />

                      <div>
                        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-2">
                          Accomplishments
                        </p>
                        <ul className="space-y-1.5">
                          {member.accomplishments.map((a, i) => (
                            <li key={i} className="text-sm text-foreground/85 leading-relaxed pl-4 relative">
                              <span className="absolute left-0 top-2 h-1.5 w-1.5 rounded-full bg-gold-dark" />
                              {a}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </StaggerItem>
            ))}
          </StaggerContainer>

          {/* Back-to-home strip */}
          <div className="mt-12 sm:mt-16 flex justify-center">
            <Button
              variant="ghost"
              onClick={() => navigate("/")}
              className="gap-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to home
            </Button>
          </div>
        </div>
      </main>

      {/* Bottom bookend — gradient ramp into the navy footer */}
      <div
        className="h-32 sm:h-40"
        style={{
          backgroundImage: `linear-gradient(180deg,
            transparent 0%,
            hsl(var(--primary) / 0.06) 40%,
            hsl(var(--primary) / 0.30) 75%,
            hsl(var(--primary)) 100%)`,
        }}
        aria-hidden="true"
      />

      <Footer language="en" />
    </div>
  );
};

const FlagBubble = ({ src, alt }: { src: string; alt: string }) => (
  <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-full border-2 border-gold/40 overflow-hidden flex-shrink-0">
    <img src={src} alt={alt} className="w-full h-full object-cover" loading="lazy" />
  </div>
);

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-1">
      {label}
    </p>
    <p className="text-sm text-foreground/85 leading-relaxed">{value}</p>
  </div>
);

export default Team;
