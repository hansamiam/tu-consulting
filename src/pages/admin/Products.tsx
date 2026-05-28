import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, Eye, Check, MailCheck, Clock, Code, ShieldAlert, BookOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PRODUCT_CATALOG, productStatus, type ProductCatalogEntry } from "@/lib/productCatalog";
import { useAuth } from "@/contexts/AuthContext";
import { isAdminUser, isAdminBypass } from "@/lib/adminMode";

/**
 * /admin/products — TopUni's catalogue source-of-truth view.
 * Mirrors LF's /app/admin/products. Lists each product with status +
 * route + waitlist count (from localStorage for now; swap to a real
 * audience table when TU ships one).
 */
const AdminProducts = () => {
  const { user } = useAuth();
  const isAdmin = isAdminUser(user as { email?: string | null } | null) || isAdminBypass();

  const [waitlistCounts, setWaitlistCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!isAdmin) return;
    const counts: Record<string, number> = {};
    for (const p of PRODUCT_CATALOG) {
      try {
        const raw = localStorage.getItem(`tu-coming-soon-${p.slug}`);
        const arr = raw ? (JSON.parse(raw) as string[]) : [];
        counts[p.slug] = arr.length;
      } catch {
        counts[p.slug] = 0;
      }
    }
    setWaitlistCounts(counts);
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="px-4 py-12 sm:p-12 max-w-md mx-auto">
        <Card className="border-border/60">
          <CardContent className="p-8 text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <ShieldAlert className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <h1 className="font-heading text-lg font-bold">Admins only</h1>
              <p className="text-sm text-muted-foreground">
                This view is restricted to TopUni admins.
              </p>
            </div>
            <Link to="/" className="text-sm text-gold-dark hover:underline">Back home</Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="px-4 py-5 sm:p-6 max-w-5xl mx-auto space-y-6">
      <header>
        <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-gold-dark" /> Field Guides catalogue
        </h1>
        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
          Vet each product before publishing. The public site shows a "Coming
          Soon" wall for any product still in draft.
        </p>
      </header>

      <Card className="border-border/60 bg-muted/20">
        <CardContent className="p-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Code className="w-3.5 h-3.5" /> How to publish
          </p>
          <p className="text-sm text-foreground leading-relaxed">
            <strong>Permanent:</strong> edit{" "}
            <code className="px-1 py-0.5 rounded bg-card text-[12px]">src/lib/productCatalog.ts</code>{" "}
            → change <code className="px-1 py-0.5 rounded bg-card text-[12px]">status: "draft"</code> →{" "}
            <code className="px-1 py-0.5 rounded bg-card text-[12px]">"published"</code> for the slug → commit + push.
          </p>
          <p className="text-sm text-foreground leading-relaxed">
            <strong>Env override:</strong> set{" "}
            <code className="px-1 py-0.5 rounded bg-card text-[12px]">VITE_PUBLISHED_PRODUCTS=slug1,slug2</code>{" "}
            in Vercel → redeploy.
          </p>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {PRODUCT_CATALOG.map((p) => {
          const status = productStatus(p.slug);
          return <Row key={p.slug} product={p} status={status} waitlist={waitlistCounts[p.slug] ?? 0} />;
        })}
      </div>
    </div>
  );
};

const Row = ({
  product,
  status,
  waitlist,
}: {
  product: ProductCatalogEntry;
  status: "draft" | "published";
  waitlist: number;
}) => (
  <Card className="border-border/60">
    <CardContent className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <h3 className="font-heading font-bold text-foreground text-base sm:text-lg leading-tight">
              {product.title}
            </h3>
            {status === "published" ? (
              <Badge variant="outline" className="bg-emerald-100 text-emerald-900 border-emerald-300 inline-flex items-center gap-1 text-[10px]">
                <Check className="w-3 h-3" /> PUBLISHED
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-amber-100 text-amber-900 border-amber-300 inline-flex items-center gap-1 text-[10px]">
                <Clock className="w-3 h-3" /> DRAFT
              </Badge>
            )}
            {product.pill && (
              <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-gold/15 text-gold-dark">
                {product.pill}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground leading-snug mb-2">
            {product.blurb}
          </p>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
            <span><strong className="text-foreground">{product.format}</strong></span>
            <span>·</span>
            <span><strong className="text-foreground">{product.pricing}</strong></span>
            <span>·</span>
            <span className="font-mono">{product.route}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            to={product.route}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-gold-dark hover:underline"
          >
            <Eye className="w-3.5 h-3.5" /> Preview
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-border/40 grid grid-cols-2 gap-3 text-xs">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground inline-flex items-center gap-1">
            <MailCheck className="w-3 h-3" /> Waitlist (browser-local)
          </p>
          <p className="font-heading font-bold text-foreground tabular-nums mt-0.5">
            {waitlist}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Slug</p>
          <p className="font-mono text-foreground mt-0.5 text-[11px]">{product.slug}</p>
        </div>
      </div>
    </CardContent>
  </Card>
);

export default AdminProducts;
