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

      <div ref={contentRef} />

      <Footer language="en" />
    </div>
  );
};

export default Academy;
