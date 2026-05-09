import heroImage from "@/assets/hero-campus.jpg";

// Two-layer fixed backdrop: greyscale Ivy-League campus image with a
// cream gradient wash on top. Lifted verbatim from the Index hero so
// every page reads with the same color-stripped silhouette underneath.
//
// Page content needs `relative z-10` to float above this. The component
// itself is fully self-contained — drop it once near the top of the
// page tree and forget about it.
export const CampusBackdrop = () => (
  <>
    <div
      className="fixed inset-0 z-0 bg-cover bg-center pointer-events-none"
      style={{
        backgroundImage: `url(${heroImage})`,
        filter: "grayscale(1) contrast(1.05) brightness(0.96)",
      }}
      aria-hidden="true"
    />
    <div
      className="fixed inset-0 z-0 pointer-events-none"
      style={{
        backgroundImage: `linear-gradient(180deg,
          hsl(var(--background) / 0.84) 0%,
          hsl(var(--background) / 0.90) 35%,
          hsl(var(--background) / 0.92) 70%,
          hsl(var(--background) / 0.88) 100%)`,
      }}
      aria-hidden="true"
    />
  </>
);
