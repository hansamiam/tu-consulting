import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import aigulPhoto from "@/assets/aigul.jpeg";
import joshPhoto from "@/assets/josh.jpg";
import nurzadaPhoto from "@/assets/nurzada.jpg";
import samuelPhoto from "@/assets/samuel.jpg";

const Team = () => {
  const navigate = useNavigate();

  const teamMembers = [
    {
      name: "Aigul Abdoubaetova",
      photo: aigulPhoto,
      hometown: "Bishkek, Kyrgyzstan",
      education: "University of Oregon - MA in International Studies (2003)",
      languages: "English (fluent), Kyrgyz (native), Russian (fluent)",
      highlights: [
        "Research Support Manager at University of Central Asia",
        "Former Head of Research and Training Unit, OSCE Academy (2019-2024)",
        "Central Asia Research Fellow, George Washington University (2019)",
        "Managed multiple international research projects including US State Department and EU Horizon 2020 initiatives"
      ]
    },
    {
      name: "Josh Hughes",
      photo: joshPhoto,
      hometown: "North Augusta, South Carolina, USA",
      education: "University of South Carolina (BA) | Harvard University (MA in Regional Studies: Russia, Eastern Europe, and Central Asia)",
      languages: "English (native), Russian (advanced), Kyrgyz (lower intermediate)",
      highlights: [
        "Foreign Language and Area Studies Fellow (2024-2026) - US Department of Education",
        "Ethnographic research experience in Kyrgyzstan (2025)",
        "Critical Language Scholarship recipient (2023) - US Department of State program",
        "Political Science and Russian specialist with deep regional expertise"
      ]
    },
    {
      name: "Nurzada Abdivalieva",
      photo: nurzadaPhoto,
      hometown: "Bishkek, Kyrgyzstan",
      education: "American University of Central Asia (BA) | KDI School (MA) | University of Cambridge (MPhil) | Tsinghua University (MA)",
      languages: "Russian (native), Kyrgyz (native), English (advanced)",
      highlights: [
        "Schwarzman Scholar - prestigious full-ride scholarship (<3% acceptance rate) for MA at Tsinghua University",
        "UCA Cambridge Trust Scholar - fully-funded MPhil in Sociology at Cambridge",
        "Global Ambassador Scholar - fully-funded MA in Public Policy at KDI School",
        "US Central Asia Education Fellowship and Capstone Finalist with DC internship"
      ]
    },
    {
      name: "Samuel Han",
      photo: samuelPhoto,
      hometown: "Toronto, Canada",
      education: "Yale University - Molecular, Cellular & Developmental Biology | East Asian Studies",
      languages: "English, Korean (fluent); Russian, Chinese (conversational)",
      highlights: [
        "Research experience at Massachusetts General Hospital and Harvard Medical School",
        "Aga Khan Foundation Canada Research & Development Fellow at University of Central Asia",
        "Participant in fully-funded programs at Tsinghua University (China) and Waseda University (Japan)",
        "Specialized in biological sciences with strong regional expertise in East Asia and Central Asia"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="gap-2"
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
          <div className="text-center mb-16 space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Our Team
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Meet the experienced professionals dedicated to guiding ambitious students to top universities worldwide
            </p>
          </div>

          {/* Team Grid */}
          <div className="grid md:grid-cols-2 gap-8">
            {teamMembers.map((member, index) => (
              <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex flex-col items-center text-center space-y-4">
                  <img
                    src={member.photo}
                    alt={member.name}
                    className="w-48 h-48 rounded-full object-cover border-4 border-primary/10"
                  />
                  <div>
                    <h2 className="text-2xl font-bold mb-2">{member.name}</h2>
                    <p className="text-sm text-muted-foreground mb-1">
                      <span className="font-semibold">From:</span> {member.hometown}
                    </p>
                    <p className="text-sm text-muted-foreground mb-1">
                      <span className="font-semibold">Education:</span> {member.education}
                    </p>
                    <p className="text-sm text-muted-foreground mb-4">
                      <span className="font-semibold">Languages:</span> {member.languages}
                    </p>
                    <ul className="text-left space-y-2 text-sm">
                      {member.highlights.map((highlight, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-primary mt-1">•</span>
                          <span>{highlight}</span>
                        </li>
                      ))}
                    </ul>
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
