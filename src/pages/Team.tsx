import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import aigulPhoto from "@/assets/aigul.jpeg";
import joshPhoto from "@/assets/josh.jpg";
import nurzadaPhoto from "@/assets/nurzada.jpg";
import samuelPhoto from "@/assets/samuel.jpg";
import heroImage from "@/assets/hero-campus.jpg";

const Team = () => {
  const navigate = useNavigate();

  const teamMembers = [
    {
      name: "Samuel Han",
      photo: samuelPhoto,
      hometown: "Toronto, Canada",
      education: "Yale University",
      languages: "English, Korean (bilingual); Russian, Chinese (conversational)"
    },
    {
      name: "Nurzada Abdivalieva",
      photo: nurzadaPhoto,
      hometown: "Bishkek, Kyrgyzstan",
      education: "American University of Central Asia | KDI School | University of Cambridge | Tsinghua University",
      languages: "Russian (native), Kyrgyz (native), English (advanced)"
    },
    {
      name: "Josh Hughes",
      photo: joshPhoto,
      hometown: "North Augusta, South Carolina, USA",
      education: "University of South Carolina | Harvard University",
      languages: "English (native), Russian (advanced), Kyrgyz (lower intermediate)"
    },
    {
      name: "Aigul Abdoubaetova",
      photo: aigulPhoto,
      hometown: "Bishkek, Kyrgyzstan",
      education: "University of Oregon",
      languages: "English (fluent), Kyrgyz (native), Russian (fluent)"
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
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-primary/80 to-gold bg-clip-text text-transparent mb-2">
                Our Team
              </h1>
              <div className="h-1 w-24 bg-gradient-to-r from-primary to-gold mx-auto rounded-full"></div>
            </div>
            
            {/* Stats Section */}
            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <div className="space-y-2">
                <div className="text-4xl md:text-5xl font-bold text-gold">$500K+</div>
                <div className="text-sm md:text-base text-muted-foreground">in scholarships secured</div>
              </div>
              <div className="space-y-2">
                <div className="text-4xl md:text-5xl font-bold text-gold">10+</div>
                <div className="text-sm md:text-base text-muted-foreground">years of collective experience</div>
              </div>
              <div className="space-y-3">
                <div className="flex gap-4 justify-center items-center flex-wrap">
                  {/* USA - Stars and Stripes simplified */}
                  <svg className="w-8 h-8 text-gold opacity-70 hover:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 4h18v2H3zm0 4h18v2H3zm0 4h18v2H3zm0 4h18v2H3zm0 4h18v2H3zM3 4h8v10H3z"/>
                    <circle cx="5" cy="6" r="0.5"/>
                    <circle cx="7" cy="6" r="0.5"/>
                    <circle cx="9" cy="6" r="0.5"/>
                    <circle cx="5" cy="8" r="0.5"/>
                    <circle cx="7" cy="8" r="0.5"/>
                    <circle cx="9" cy="8" r="0.5"/>
                    <circle cx="5" cy="10" r="0.5"/>
                    <circle cx="7" cy="10" r="0.5"/>
                    <circle cx="9" cy="10" r="0.5"/>
                  </svg>
                  
                  {/* Canada - Maple Leaf */}
                  <svg className="w-8 h-8 text-gold opacity-70 hover:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l1.5 4.5h4.5l-3.75 2.75 1.5 4.5L12 11l-3.75 2.75 1.5-4.5L6 6.5h4.5L12 2zm0 11v9m-3-3h6"/>
                  </svg>
                  
                  {/* UK - Union Jack simplified */}
                  <svg className="w-8 h-8 text-gold opacity-70 hover:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 4h18v16H3V4zm0 0l18 16M21 4L3 20M3 12h18M12 4v16"/>
                  </svg>
                  
                  {/* China - Star */}
                  <svg className="w-8 h-8 text-gold opacity-70 hover:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l2.4 7.2h7.6l-6 4.8 2.4 7.2-6-4.8-6 4.8 2.4-7.2-6-4.8h7.6z"/>
                  </svg>
                  
                  {/* South Korea - Yin Yang simplified */}
                  <svg className="w-8 h-8 text-gold opacity-70 hover:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M12 4a8 8 0 0 0 0 16 4 4 0 0 1 0-8 4 4 0 0 0 0-8z"/>
                  </svg>
                </div>
                <div className="text-sm md:text-base text-muted-foreground">cross-continental expertise</div>
              </div>
            </div>
          </div>

          {/* Team Grid */}
          <div className="grid md:grid-cols-2 gap-8">
            {teamMembers.map((member, index) => (
              <Card 
                key={index} 
                className="group p-8 hover:shadow-2xl transition-all duration-300 border-border/50 bg-card/50 backdrop-blur-sm hover:border-gold/30 hover:scale-[1.02]"
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
                    <div className="space-y-2 text-sm">
                      <p className="text-muted-foreground">
                        <span className="font-semibold text-gold">From:</span> {member.hometown}
                      </p>
                      <p className="text-muted-foreground">
                        <span className="font-semibold text-gold">Education:</span> {member.education}
                      </p>
                      <p className="text-muted-foreground">
                        <span className="font-semibold text-gold">Languages:</span> {member.languages}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Team;
