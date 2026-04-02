import { useRef } from "react";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { AcademyHero } from "@/components/academy/AcademyHero";
import { Info } from "lucide-react";

const Academy = () => {
  const contentRef = useRef<HTMLDivElement>(null);

  const scrollToContent = () => {
    contentRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <AcademyHero onExplore={scrollToContent} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Early Access Notice */}
        <div className="mt-8 flex items-start gap-3 p-4 bg-gold/5 border border-gold/20 rounded-xl text-sm">
          <Info className="h-5 w-5 text-gold shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-foreground">Early Preview</p>
            <p className="text-muted-foreground text-xs mt-1">
              TopUni Academy is in early development. Real workshops, templates, and case study materials will be uploaded as they are recorded and reviewed. No fabricated content will ever be published here.
            </p>
          </div>
        </div>

        {/* Placeholder sections */}
        <section ref={contentRef} className="py-16">
          <h2 className="text-2xl font-bold text-foreground mb-8">What's Coming</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: "Workshops", desc: "Live and recorded sessions from admissions professionals and accepted students.", icon: "🎓" },
              { title: "Templates & Checklists", desc: "Downloadable application materials reviewed by the TopUni team.", icon: "📋" },
              { title: "Case Studies", desc: "Real anonymized application materials from accepted students.", icon: "📂" },
              { title: "Masterclasses", desc: "In-depth sessions from guest speakers and industry experts.", icon: "🎤" },
              { title: "Community", desc: "Peer review rooms and discussion channels for applicants.", icon: "💬" },
              { title: "Learning Paths", desc: "Structured curricula guiding you through the application process.", icon: "🗺️" },
            ].map((item) => (
              <div
                key={item.title}
                className="border border-border/50 rounded-xl p-6 bg-card hover:border-gold/30 transition-all"
              >
                <div className="text-3xl mb-3">{item.icon}</div>
                <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
                <div className="mt-4 text-xs text-gold/60 font-medium">Coming Soon</div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <Footer language="en" />
    </div>
  );
};

export default Academy;
