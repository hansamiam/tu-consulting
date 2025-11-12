import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import aigulPhoto from "@/assets/aigul.jpeg";
import joshPhoto from "@/assets/josh.jpg";
import nurzadaPhoto from "@/assets/nurzada.jpg";
import samuelPhoto from "@/assets/samuel.jpg";
import heroImage from "@/assets/hero-campus.jpg";
import usFlag from "@/assets/flags/us.svg";
import caFlag from "@/assets/flags/ca.svg";
import gbFlag from "@/assets/flags/gb.svg";
import cnFlag from "@/assets/flags/cn.svg";
import krFlag from "@/assets/flags/kr.svg";

const Team = () => {
  const navigate = useNavigate();

  const teamMembers = [
    {
      name: "Samuel Han",
      title: "Co-Founder",
      photo: samuelPhoto,
      hometown: "Toronto, Canada",
      education: "Yale University",
      languages: "English, Korean (bilingual); Russian, Chinese (conversational)",
      strengths: "Learning strategies, supporting students with ADHD, immigrants and third-culture kids, adjusting to new environments, natural sciences",
      challenges: "Navigated learning differences and cultural adaptation as an immigrant student",
      lessons: "Your unique background is your superpower—embrace it in your applications",
      advice: "Don't hide your struggles; they make your story authentic and compelling"
    },
    {
      name: "Nurzada Abdivalieva",
      title: "Co-Founder",
      photo: nurzadaPhoto,
      hometown: "Bishkek, Kyrgyzstan",
      education: "American University of Central Asia | Korea Development Institute (KDI) | University of Cambridge | Tsinghua University",
      languages: "Russian (native), Kyrgyz (native), English (advanced)",
      strengths: "Scholarships and funding strategies, self-funded education pathways, cross-cultural adaptation, compelling storytelling, social sciences",
      challenges: "Secured full funding for multiple degrees through scholarships despite limited initial resources",
      lessons: "Financial constraints don't limit your potential—strategic scholarship hunting opens doors",
      advice: "Your story matters more than perfect grades; learn to tell it powerfully"
    },
    {
      name: "Josh Hughes",
      title: "Lead Consultant",
      photo: joshPhoto,
      hometown: "North Augusta, South Carolina, USA",
      education: "University of South Carolina | Harvard University",
      languages: "English (native), Russian (advanced), Kyrgyz (lower intermediate)",
      strengths: "Graduate program applications, test-taking strategies, academic research, essay refinement, presentation skills, languages and humanities",
      challenges: "Mastered multiple standardized tests and navigated competitive graduate admissions",
      lessons: "Strategic preparation and understanding what evaluators want is half the battle",
      advice: "Focus on clarity and authenticity in your writing—admissions committees read thousands of essays"
    },
    {
      name: "Aigul Abdoubaetova",
      title: "Senior Advisor",
      photo: aigulPhoto,
      hometown: "Bishkek, Kyrgyzstan",
      education: "University of Oregon",
      languages: "English (fluent), Kyrgyz (native), Russian (fluent)",
      strengths: "Recommendation letter guidance, early-to-mid career professionals, reference support, institutional advising, negotiation, international networking",
      challenges: "Mentored hundreds of students and written countless recommendation letters across diverse contexts",
      lessons: "The right recommenders and how you approach them can transform your application",
      advice: "Build genuine relationships with mentors early—strong recommendations come from authentic connections"
    }
  ];

  return (
    <div 
      className="min-h-screen relative"
      style={{
        backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.85), rgba(255, 255, 255, 0.85)), url(${heroImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="gap-2 hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>
          <LanguageSwitcher />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 space-y-8">
            <div className="inline-block">
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-gold via-accent to-primary bg-clip-text text-transparent mb-2">
                Our Team
              </h1>
              <div className="h-1 w-24 bg-gradient-to-r from-primary to-gold mx-auto rounded-full"></div>
            </div>
            
            {/* Stats Section */}
            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <div className="space-y-2">
<div className="min-h-[40px] md:min-h-[56px] flex items-center justify-center">
  <div className="text-4xl md:text-5xl font-bold text-gold">$500K+</div>
</div>
                <div className="text-sm md:text-base text-muted-foreground">in scholarships secured</div>
              </div>
              <div className="space-y-2">
<div className="min-h-[40px] md:min-h-[56px] flex items-center justify-center">
  <div className="text-4xl md:text-5xl font-bold text-gold">10+</div>
</div>
                <div className="text-sm md:text-base text-muted-foreground">years of collective experience</div>
              </div>
<div className="space-y-2">
  <div className="min-h-[40px] md:min-h-[56px] flex items-center justify-center">
    <div className="flex flex-nowrap gap-2 md:gap-3 items-center justify-center">
      <div className="w-9 h-9 md:w-10 md:h-10 rounded-full border-2 border-gold/40 overflow-hidden flex-shrink-0 p-0.5 md:p-1">
        <img src={usFlag} alt="USA flag" className="w-full h-full object-cover" loading="lazy" />
                    </div>
                    <div className="w-9 h-9 md:w-10 md:h-10 rounded-full border-2 border-gold/40 overflow-hidden flex-shrink-0">
                      <img src={caFlag} alt="Canada flag" className="w-full h-full object-cover" loading="lazy" />
                    </div>
                    <div className="w-9 h-9 md:w-10 md:h-10 rounded-full border-2 border-gold/40 overflow-hidden flex-shrink-0">
                      <img src={gbFlag} alt="United Kingdom flag" className="w-full h-full object-cover" loading="lazy" />
                    </div>
                    <div className="w-9 h-9 md:w-10 md:h-10 rounded-full border-2 border-gold/40 overflow-hidden flex-shrink-0">
<img src={cnFlag} alt="China flag" className="w-full h-full object-cover object-left" loading="lazy" />
                    </div>
                    <div className="w-9 h-9 md:w-10 md:h-10 rounded-full border-2 border-gold/40 overflow-hidden flex-shrink-0">
                      <img src={krFlag} alt="South Korea flag" className="w-full h-full object-cover" loading="lazy" />
                    </div>
                  </div>
                </div>
                <div className="text-sm md:text-base text-muted-foreground">cross-continental expertise</div>
              </div>
            </div>
          </div>

          {/* Team Grid */}
          <div className="grid md:grid-cols-2 gap-8">
            {teamMembers.map((member, index) => (
              <Dialog key={index}>
                <DialogTrigger asChild>
                  <Card 
                    className="group p-8 hover:shadow-2xl transition-all duration-300 border-border/50 bg-card/50 backdrop-blur-sm hover:border-gold/30 hover:scale-[1.02] cursor-pointer"
                  >
                    <div className="flex flex-col items-center text-center space-y-6">
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-gold/20 rounded-full blur-xl group-hover:blur-2xl transition-all duration-300 opacity-0 group-hover:opacity-100"></div>
                        <img
                          src={member.photo}
                          alt={member.name}
                          className="relative w-48 h-48 rounded-full object-cover border-4 border-primary/40 group-hover:border-primary/70 transition-all duration-300 shadow-lg"
                        />
                      </div>
                      <div className="space-y-3 w-full">
                        <h2 className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors">{member.name}</h2>
                        <p className="text-base font-medium text-gold">{member.title}</p>
                        <div className="space-y-2 text-sm">
                          <p className="text-muted-foreground">
                            <span className="font-semibold text-gold">Hometown:</span> {member.hometown}
                          </p>
                          <p className="text-muted-foreground">
                            <span className="font-semibold text-gold">Education:</span> {member.education}
                          </p>
                          <p className="text-muted-foreground">
                            <span className="font-semibold text-gold">Languages:</span> {member.languages}
                          </p>
                        </div>
                        <p className="text-xs text-primary/70 mt-4">Click to learn more</p>
                      </div>
                    </div>
                  </Card>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <div className="flex flex-col items-center text-center space-y-4 mb-6">
                      <img
                        src={member.photo}
                        alt={member.name}
                        className="w-32 h-32 rounded-full object-cover border-4 border-primary/40 shadow-lg"
                      />
                      <div>
                        <DialogTitle className="text-2xl font-bold text-primary">{member.name}</DialogTitle>
                        <p className="text-base font-medium text-gold mt-1">{member.title}</p>
                      </div>
                    </div>
                  </DialogHeader>
                  <div className="space-y-6 text-sm">
                    <div>
                      <h3 className="font-semibold text-gold text-base mb-2">Basic Info</h3>
                      <div className="space-y-2">
                        <p className="text-muted-foreground">
                          <span className="font-semibold text-foreground">Hometown:</span> {member.hometown}
                        </p>
                        <p className="text-muted-foreground">
                          <span className="font-semibold text-foreground">Education:</span> {member.education}
                        </p>
                        <p className="text-muted-foreground">
                          <span className="font-semibold text-foreground">Languages:</span> {member.languages}
                        </p>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gold text-base mb-2">Strengths & Specializations</h3>
                      <p className="text-muted-foreground">{member.strengths}</p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gold text-base mb-2">Challenges Overcome</h3>
                      <p className="text-muted-foreground">{member.challenges}</p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gold text-base mb-2">Key Lessons</h3>
                      <p className="text-muted-foreground italic">{member.lessons}</p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gold text-base mb-2">Advice for Applicants</h3>
                      <p className="text-muted-foreground italic font-medium">{member.advice}</p>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Team;
