import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { ArrowRight } from "lucide-react";
// useNavigate dropped — Back-to-Home sub-nav retired.
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
import { useEffect } from "react";

const Team = () => {
  useEffect(() => {
    const prev = document.title;
    document.title = "The team — TopUni";
    return () => { document.title = prev; };
  }, []);

  const teamMembers = [
    {
      name: "Samuel Han",
      title: "Founder & CEO",
      tagline: "Yale",
      photo: samuelPhoto,
      hometown: "Toronto, Canada",
      education: "Yale University",
      languages: "English, Korean (bilingual); Russian, Chinese (conversational)",
      strengths: "Learning strategies, gap year students, natural sciences, immigrants and third-culture kids, supporting students with ADHD",
      accomplishments: [
        "Research experience at Massachusetts General Hospital and Harvard Medical School",
        "Fully-funded programs in China (Tsinghua University) and Japan (Waseda University)",
        "Aga Khan Foundation Canada Research & Development Fellow at University of Central Asia"
      ]
    },
    {
      name: "Nurzada Abdivalieva",
      title: "Co-Founder & Head of Consulting",
      tagline: "Cambridge & Tsinghua",
      photo: nurzadaPhoto,
      hometown: "Bishkek, Kyrgyzstan",
      education: "American University of Central Asia | Korea Development Institute (KDI) | University of Cambridge | Tsinghua University",
      languages: "Russian (native), Kyrgyz (native), English (advanced)",
      strengths: "Scholarships and funding strategies, self-funded education pathways, cross-cultural adaptation, compelling storytelling, social sciences",
      accomplishments: [
        "US Central Asia Education Fellowship — fully funded BA at AUCA",
        "Capstone Finalist — fully funded 3-month internship in Washington, DC",
        "Global Ambassador Scholarship — fully funded MA at KDI School",
        "UCA Cambridge Trust — fully funded MPhil at the University of Cambridge",
        "Schwarzman Scholar — prestigious full-ride MA at Tsinghua University (<3% acceptance)"
      ]
    },
    {
      name: "Josh Hughes",
      title: "Lead Consultant",
      tagline: "Harvard",
      photo: joshPhoto,
      hometown: "North Augusta, South Carolina, USA",
      education: "University of South Carolina | Harvard University",
      languages: "English (native), Russian (advanced), Kyrgyz (lower intermediate)",
      strengths: "Graduate program applications, academic research, essay refinement, languages and humanities, test-taking strategies",
      accomplishments: [
        "Foreign Language and Area Studies (FLAS) Fellow, 2024–2026",
        "Ethnographic research in Kyrgyzstan (2025)",
        "Critical Language Scholarship (CLS) recipient, 2023"
      ]
    },
    {
      name: "Aigul Abdoubaetova",
      title: "Senior Advisor",
      tagline: "U of Oregon",
      photo: aigulPhoto,
      hometown: "Bishkek, Kyrgyzstan",
      education: "University of Oregon",
      languages: "English (fluent), Kyrgyz (native), Russian (fluent)",
      strengths: "Recommendation letter guidance, career coaching, early-to-mid career professionals, institutional advising, international networking",
      accomplishments: [
        "American Association of University Women Fellowship (2002)",
        "Central Asia Research Fellow, Elliott School of International Affairs, GWU (2019)",
        "Research & Teaching Fellowship, OSCE Academy (2009)",
        "International Peace Scholarship, P.E.O. (2001)"
      ]
    }
  ];

  return (
    <div className="min-h-screen relative bg-background">
      <div className="relative z-10">
      <ScrollProgress />
      <Navigation language="en" />
      {/* Sticky "Back to Home" sub-nav retired 2026-05-10 — global
          Navigation already routes users home via the wordmark + Home
          link, so this duplicated affordance read as visual chrome
          ("hairpin everywhere"). Same retirement on TeamRu.tsx. */}

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 md:py-16">
        <div className="max-w-6xl mx-auto">
          {/* Header — reverted 2026-05-10 to the pre-overhaul layout
              (animated $500K+ stat, animated 10+ years stat, 5 country
              flag-circles) per user direction: "REVERT EVERYTHING above
              the profile photo section". The ONLY change vs pre-
              overhaul: the gold-navy gradient on the title text and the
              gradient underscore are dropped. Title is now a solid
              foreground color and the underscore is a solid gold accent. */}
          <div className="text-center mb-8 md:mb-16 space-y-4 md:space-y-8 animate-fade-in">
            <div className="inline-block">
              <h1 className="font-heading text-2xl sm:text-3xl md:text-5xl font-bold text-foreground tracking-tight mb-2">
                Our Team
              </h1>
              <div className="h-1 w-16 md:w-24 bg-gold mx-auto rounded-full"></div>
            </div>

            {/* Stats Section */}
            <ScrollReveal delay={0.2}>
              <div className="grid md:grid-cols-3 gap-4 md:gap-8 max-w-4xl mx-auto animate-enter">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="space-y-1 md:space-y-2"
                >
                  <div className="min-h-[32px] md:min-h-[56px] flex items-center justify-center">
                    <div className="text-3xl md:text-5xl font-bold text-gold">
                      $<AnimatedNumber value={500} />K+
                    </div>
                  </div>
                  <div className="text-xs md:text-base text-muted-foreground">in scholarships secured</div>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="space-y-1 md:space-y-2"
                >
                  <div className="min-h-[32px] md:min-h-[56px] flex items-center justify-center">
                    <div className="text-3xl md:text-5xl font-bold text-gold">
                      <AnimatedNumber value={10} />+
                    </div>
                  </div>
                  <div className="text-xs md:text-base text-muted-foreground">years of collective experience</div>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="space-y-1 md:space-y-2"
                >
                  <div className="min-h-[32px] md:min-h-[56px] flex items-center justify-center">
                    <div className="flex flex-nowrap gap-1.5 md:gap-3 items-center justify-center">
                      <div className="w-7 h-7 md:w-10 md:h-10 rounded-full border-2 border-gold/40 overflow-hidden flex-shrink-0 p-0.5">
                        <img src={usFlag} alt="USA flag" className="w-full h-full object-cover" loading="lazy" />
                      </div>
                      <div className="w-7 h-7 md:w-10 md:h-10 rounded-full border-2 border-gold/40 overflow-hidden flex-shrink-0 p-0.5">
                        <img src={caFlag} alt="Canada flag" className="w-full h-full object-cover" loading="lazy" />
                      </div>
                      <div className="w-7 h-7 md:w-10 md:h-10 rounded-full border-2 border-gold/40 overflow-hidden flex-shrink-0 p-0.5">
                        <img src={gbFlag} alt="United Kingdom flag" className="w-full h-full object-cover" loading="lazy" />
                      </div>
                      <div className="w-7 h-7 md:w-10 md:h-10 rounded-full border-2 border-gold/40 overflow-hidden flex-shrink-0 p-0.5">
                        <img src={cnFlag} alt="China flag" className="w-full h-full object-cover object-left" loading="lazy" />
                      </div>
                      <div className="w-7 h-7 md:w-10 md:h-10 rounded-full border-2 border-gold/40 overflow-hidden flex-shrink-0 p-0.5">
                        <img src={krFlag} alt="South Korea flag" className="w-full h-full object-cover" loading="lazy" />
                      </div>
                    </div>
                  </div>
                  <div className="text-xs md:text-base text-muted-foreground">cross-continental expertise</div>
                </motion.div>
              </div>
            </ScrollReveal>
          </div>

          {/* Team Grid — compact tiles inspired by the home page format.
              Bigger prestige credential (tagline) front-and-center, smaller
              photo, and an explicit "Read profile" affordance so users
              recognise the tile as clickable. */}
          <StaggerContainer className="grid sm:grid-cols-2 gap-4 md:gap-6 animate-fade-in">
            {teamMembers.map((member, index) => (
              <StaggerItem key={index}>
                <Dialog>
                <DialogTrigger asChild>
                  <Card
                    className="group relative p-5 md:p-7 hover:shadow-lg transition-all duration-300 border-border/60 bg-card/70 backdrop-blur-sm hover:border-gold/35 cursor-pointer text-center"
                  >
                    <div className="flex flex-col items-center space-y-3.5">
                      <div className="w-28 h-28 md:w-32 md:h-32 rounded-full overflow-hidden bg-canvas ring-1 ring-border/60 ring-offset-4 ring-offset-card/70 shadow-sm">
                        <img
                          src={member.photo}
                          alt={member.name}
                          className="w-full h-full object-cover group-hover:scale-[1.05] transition-transform duration-700"
                          loading="lazy"
                        />
                      </div>
                      <div className="space-y-1">
                        <p className="font-heading font-semibold text-foreground text-base md:text-lg leading-tight">
                          {member.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {member.title}
                        </p>
                        <p className="text-xs md:text-sm text-gold-dark font-semibold tracking-[0.05em] pt-0.5">
                          {member.tagline}
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground/70 group-hover:text-gold-dark transition-colors pt-1">
                        Read profile
                        <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </div>
                  </Card>
                </DialogTrigger>
                <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <div className="flex items-center gap-4 mb-2">
                      <img
                        src={member.photo}
                        alt={member.name}
                        className="w-16 h-16 rounded-full object-cover ring-1 ring-border/60 shadow-sm shrink-0"
                      />
                      <div className="min-w-0">
                        <DialogTitle className="text-xl font-bold text-foreground tracking-tight">{member.name}</DialogTitle>
                        <p className="text-sm text-muted-foreground">{member.title}</p>
                        <p className="text-xs text-gold-dark font-semibold tracking-[0.05em] mt-0.5">{member.tagline}</p>
                      </div>
                    </div>
                  </DialogHeader>
                  <div className="space-y-5 text-sm pt-2">
                    <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1.5 text-muted-foreground">
                      <dt className="font-semibold text-foreground">Hometown</dt>
                      <dd>{member.hometown}</dd>
                      <dt className="font-semibold text-foreground">Education</dt>
                      <dd>{member.education}</dd>
                      <dt className="font-semibold text-foreground">Languages</dt>
                      <dd>{member.languages}</dd>
                    </dl>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.22em] text-gold-dark font-bold mb-2">Highlights</p>
                      <ul className="space-y-1.5">
                        {member.accomplishments.map((accomplishment, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-muted-foreground">
                            <span className="text-gold-dark mt-1 shrink-0">·</span>
                            <span className="leading-relaxed">{accomplishment}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.22em] text-gold-dark font-bold mb-2">Specialises in</p>
                      <p className="text-muted-foreground leading-relaxed">{member.strengths}</p>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </main>

      {/* Footer — the Footer component already provides its own <footer>
          element with internal max-w container, grid layout, and padding.
          The page used to wrap it in another <footer> + container +
          text-center, which forced the "TopUni" wordmark and the link
          column to render center-aligned and broke the two-column
          layout. Now we render Footer directly so it uses its own
          layout. */}
      <Footer language="en" />
      </div>
    </div>
  );
};

export default Team;
