import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import aigulPhoto from "@/assets/aigul.jpeg";
import joshPhoto from "@/assets/josh.jpg";
import nurzadaPhoto from "@/assets/nurzada.jpg";
import samuelPhoto from "@/assets/samuel.jpg";
import { CampusBackdrop } from "@/components/CampusBackdrop";
import { ScrollProgress } from "@/components/ScrollProgress";
import { StaggerContainer, StaggerItem } from "@/hooks/use-stagger-animation";
import { useEffect } from "react";

const Team = () => {
  const navigate = useNavigate();
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
      tagline: "Oregon & OSCE Academy",
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
      <CampusBackdrop />
      <div className="relative z-10">
      <ScrollProgress />
      <Navigation language="en" />
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 sticky top-16 z-40 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="gap-2 hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 md:py-16">
        <div className="max-w-6xl mx-auto">
          {/* Header — overhauled 2026-05-10. Pre-overhaul this section
              had: a gradient-clipped "Our Team" wordmark, a gradient
              underscore bar, and a 3-up stats grid ($500K secured /
              10+ years / 5 country-flag bubbles ringed in gold). The
              gradient text + flag bar read tacky at scale (gradient
              text is dated visual language; the flag-circle ribbon
              looked like a multilingual landing-page builder). The
              new header is a single editorial line: clean wordmark,
              one peer-voice subhead, one restrained line of
              credibility. Typography does the premium work. */}
          <div className="text-center mb-10 md:mb-16 space-y-3 md:space-y-4 animate-fade-in">
            <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-foreground tracking-tight">
              The team
            </h1>
            <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
              Four people who have actually been through this — and now help you do the same.
            </p>
            <p className="text-xs md:text-sm font-medium text-muted-foreground/70 tracking-wide pt-1">
              <span className="text-foreground/85 font-semibold">$500K+</span> in scholarships secured between us · <span className="text-foreground/85 font-semibold">10+ years</span> across the US, UK, Canada, China, and Korea
            </p>
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
