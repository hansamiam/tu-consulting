import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Mail, Check, Loader2 } from "lucide-react";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { productBySlug } from "@/lib/productCatalog";

/**
 * Rendered on a TU product page when the product is in "draft" status
 * and the visitor isn't an admin. Email captures persist to
 * localStorage as a stopgap until the TU schema gets a leads/audience
 * table (same approach as PickYourTen — see that file for the swap-
 * in point comment).
 */
interface Props {
  slug: string;
}

export const ComingSoonWall = ({ slug }: Props) => {
  const product = productBySlug(slug);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("loading");
    // TODO: swap to a real audience table when one lands on TU.
    try {
      const key = `tu-coming-soon-${slug}`;
      const existing = JSON.parse(localStorage.getItem(key) ?? "[]") as string[];
      const next = Array.from(new Set([...existing, email.trim().toLowerCase()]));
      localStorage.setItem(key, JSON.stringify(next));
    } catch { /* private window — still acknowledge */ }
    await new Promise((r) => setTimeout(r, 400));
    setStatus("done");
    setEmail("");
  };

  if (!product) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navigation language="en" variant="overlay" />
        <main className="flex-1 pt-28 pb-16 px-6">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="font-heading text-2xl text-foreground mb-2">Not found</h1>
            <p className="text-muted-foreground">This guide isn't in our catalogue.</p>
            <Link to="/" className="inline-flex items-center gap-1.5 mt-6 text-sm text-gold-dark hover:underline">
              <ArrowLeft className="w-4 h-4" /> Back home
            </Link>
          </div>
        </main>
        <Footer language="en" variant="dark" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation language="en" variant="overlay" />
      <main className="flex-1 pt-28 pb-16 px-6">
        <div className="max-w-2xl mx-auto">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" /> Back home
          </Link>

          <header className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <span className="h-px w-10 bg-gold-dark/40" aria-hidden />
              <p className="text-[10px] font-bold tracking-[0.28em] uppercase text-gold-dark">
                {product.pill ? `TopUni · ${product.pill} · Coming soon` : "TopUni · Coming soon"}
              </p>
              <span className="h-px flex-1 bg-gold-dark/40" aria-hidden />
            </div>
            <h1 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-3 leading-[1.05] tracking-tight">
              {product.title}.
            </h1>
            <p className="font-heading italic text-base text-muted-foreground leading-relaxed max-w-xl">
              {product.blurb}
            </p>

            <div className="mt-6 grid grid-cols-3 gap-3">
              <div className="border-t border-foreground pt-2">
                <p className="text-[10px] tracking-widest uppercase text-muted-foreground">Format</p>
                <p className="font-heading font-bold text-foreground text-sm">{product.format}</p>
              </div>
              <div className="border-t border-foreground pt-2">
                <p className="text-[10px] tracking-widest uppercase text-muted-foreground">Price</p>
                <p className="font-heading font-bold text-foreground text-sm">{product.pricing}</p>
              </div>
              <div className="border-t border-foreground pt-2">
                <p className="text-[10px] tracking-widest uppercase text-muted-foreground">Status</p>
                <p className="font-heading font-bold text-foreground text-sm">In review</p>
              </div>
            </div>
          </header>

          <section className="rounded-2xl border border-gold-dark/30 bg-gold/5 p-6">
            {status === "done" ? (
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-gold-dark mt-1 shrink-0" />
                <div>
                  <p className="font-heading font-bold text-foreground mb-1">
                    You're on the list.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    We'll email you the day this lands. No newsletter spam.
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={submit}>
                <div className="flex items-center gap-2 mb-1.5">
                  <Mail className="w-4 h-4 text-gold-dark" />
                  <h2 className="font-heading font-bold text-foreground text-base">
                    Be first to hear when it ships
                  </h2>
                </div>
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                  This guide is still being vetted by the team. Drop your
                  email and we'll send the launch link the day it goes live.
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    type="email"
                    required
                    autoComplete="email"
                    inputMode="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={status === "loading"}
                    className="flex-1"
                  />
                  <Button type="submit" disabled={status === "loading"}>
                    {status === "loading" ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Notify me"
                    )}
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground mt-3">
                  Unsubscribe anytime. We only email about THIS guide unless
                  you opt into the broader list.
                </p>
              </form>
            )}
          </section>

          <div className="mt-10 text-center">
            <Link to="/resources" className="text-sm text-gold-dark hover:underline font-medium">
              See what's already live in the catalogue
            </Link>
          </div>
        </div>
      </main>
      <Footer language="en" variant="dark" />
    </div>
  );
};

export default ComingSoonWall;
