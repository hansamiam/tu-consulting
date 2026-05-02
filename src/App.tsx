import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AuthProvider } from "./contexts/AuthContext";
import { rememberReferralFromUrl } from "./lib/referralCapture";

/* ─── Eager: only the homepage ───────────────────────────────────────
   Everything else is route-split via React.lazy below so the initial
   bundle covers just the entry point + framework. Cuts the cold-load
   payload by ~70% and means each new page added in the future doesn't
   bloat the homepage's TTI.

   Each lazy() call becomes its own Vite chunk — verified in build
   output. The Suspense fallback below renders for the few hundred ms
   while the chunk fetches. */
import Index from "./pages/Index";

const IndexRu              = lazy(() => import("./pages/IndexRu"));
const Team                 = lazy(() => import("./pages/Team"));
const TeamRu               = lazy(() => import("./pages/TeamRu"));
const Offerings            = lazy(() => import("./pages/Offerings"));
const OfferingsRu          = lazy(() => import("./pages/OfferingsRu"));
const FAQ                  = lazy(() => import("./pages/FAQ"));
const FAQRu                = lazy(() => import("./pages/FAQRu"));
const WhyTU                = lazy(() => import("./pages/WhyTU"));
const WhyTURu              = lazy(() => import("./pages/WhyTURu"));
const Blog                 = lazy(() => import("./pages/Blog"));
const BlogRu               = lazy(() => import("./pages/BlogRu"));
const BlogArticle          = lazy(() => import("./pages/BlogArticle"));
const ThankYou             = lazy(() => import("./pages/ThankYou"));
const ThankYouRu           = lazy(() => import("./pages/ThankYouRu"));
const PrivacyPolicy        = lazy(() => import("./pages/PrivacyPolicy"));
const PrivacyPolicyRu      = lazy(() => import("./pages/PrivacyPolicyRu"));
const PublicOffer          = lazy(() => import("./pages/PublicOffer"));
const PublicOfferRu        = lazy(() => import("./pages/PublicOfferRu"));
const RefundPolicy         = lazy(() => import("./pages/RefundPolicy"));
const RefundPolicyRu       = lazy(() => import("./pages/RefundPolicyRu"));
const PaymentInfo          = lazy(() => import("./pages/PaymentInfo"));
const PaymentInfoRu        = lazy(() => import("./pages/PaymentInfoRu"));
const TopUniAI             = lazy(() => import("./pages/TopUniAI"));
const TopUniAIRu           = lazy(() => import("./pages/TopUniAIRu"));
const TopUniAIPartners     = lazy(() => import("./pages/TopUniAIPartners"));
const TopUniAIPartnersRu   = lazy(() => import("./pages/TopUniAIPartnersRu"));
const Discover             = lazy(() => import("./pages/Discover"));
const DiscoverApp          = lazy(() => import("./pages/DiscoverApp"));
const SharedBrief          = lazy(() => import("./pages/SharedBrief"));
const Pipeline             = lazy(() => import("./pages/Pipeline"));
const ScholarshipsByFilter = lazy(() => import("./pages/ScholarshipsByFilter"));
const ScholarshipDetail    = lazy(() => import("./pages/ScholarshipDetail"));
const EssayCritique        = lazy(() => import("./pages/EssayCritique"));
const AIMatch              = lazy(() => import("./pages/AIMatch"));
const Calendar             = lazy(() => import("./pages/Calendar"));
const Refer                = lazy(() => import("./pages/Refer"));
const Admin                = lazy(() => import("./pages/Admin"));
const FunnelDashboard      = lazy(() => import("./pages/FunnelDashboard"));
const AdminInsights        = lazy(() => import("./pages/AdminInsights"));
const Academy              = lazy(() => import("./pages/Academy"));
const CountryGuide         = lazy(() => import("./pages/CountryGuide"));
const NotFound             = lazy(() => import("./pages/NotFound"));
const PaymentCanceled      = lazy(() => import("./pages/PaymentCanceled"));
const Unsubscribe          = lazy(() => import("./pages/Unsubscribe"));
const Pricing              = lazy(() => import("./pages/Pricing"));
const AuthCallback         = lazy(() => import("./pages/AuthCallback"));
const Account              = lazy(() => import("./pages/Account"));
const AdminSources         = lazy(() => import("./pages/admin/Sources"));
const AdminQueue           = lazy(() => import("./pages/admin/ScholarshipQueue"));
const SubmitScholarship    = lazy(() => import("./pages/SubmitScholarship"));

const queryClient = new QueryClient();

/* Captures ?ref=CODE on any landing — runs once on mount. The actual
   referral registration happens in AuthCallback after the user signs
   up; this just persists the code so it survives the magic-link round
   trip. */
const ReferralCaptor = () => {
  useEffect(() => { rememberReferralFromUrl(); }, []);
  return null;
};

/* Suspense fallback — minimal centred spinner. Shown for the brief
   moment a route's chunk is downloading. Keeps the navy/gold language
   so it doesn't feel like a generic loading state. */
const RouteFallback = () => (
  <div className="min-h-[50vh] flex items-center justify-center" aria-busy="true">
    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ErrorBoundary>
        <AuthProvider>
        <ReferralCaptor />
        <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/ru" element={<IndexRu />} />
          <Route path="/team" element={<Team />} />
          <Route path="/team/ru" element={<TeamRu />} />
          <Route path="/offerings" element={<Offerings />} />
          <Route path="/offerings/ru" element={<OfferingsRu />} />
          <Route path="/faq" element={<WhyTU />} />
          <Route path="/faq/ru" element={<WhyTURu />} />
          <Route path="/why-tu" element={<WhyTU />} />
          <Route path="/why-tu/ru" element={<WhyTURu />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/ru" element={<BlogRu />} />
          <Route path="/blog/:id" element={<BlogArticle language="en" />} />
          <Route path="/blog/:id/ru" element={<BlogArticle language="ru" />} />
          <Route path="/thank-you" element={<ThankYou />} />
          <Route path="/thank-you/ru" element={<ThankYouRu />} />
          <Route path="/payment-canceled" element={<PaymentCanceled language="en" />} />
          <Route path="/payment-canceled/ru" element={<PaymentCanceled language="ru" />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/privacy-policy/ru" element={<PrivacyPolicyRu />} />
          <Route path="/public-offer" element={<PublicOffer />} />
          <Route path="/public-offer/ru" element={<PublicOfferRu />} />
          <Route path="/refund-policy" element={<RefundPolicy />} />
          <Route path="/refund-policy/ru" element={<RefundPolicyRu />} />
          <Route path="/payment-info" element={<PaymentInfo />} />
          <Route path="/payment-info/ru" element={<PaymentInfoRu />} />
          <Route path="/topuni-ai" element={<TopUniAI />} />
          <Route path="/topuni-ai/ru" element={<TopUniAIRu />} />
          <Route path="/topuni-ai/partners" element={<TopUniAIPartners />} />
          <Route path="/topuni-ai/partners/ru" element={<TopUniAIPartnersRu />} />
          {/* Discover = scholarship decision engine. /scholarships kept as alias. */}
          <Route path="/discover" element={<Discover language="en" />} />
          <Route path="/discover/ru" element={<Discover language="ru" />} />
          <Route path="/discover/app" element={<DiscoverApp language="en" />} />
          <Route path="/discover/ru/app" element={<DiscoverApp language="ru" />} />
          <Route path="/scholarships" element={<Discover language="en" />} />
          <Route path="/scholarships/ru" element={<Discover language="ru" />} />
          {/* Public shareable AI strategy brief — viral / SEO surface */}
          <Route path="/brief/:slug" element={<SharedBrief />} />
          {/* Application mission-control — kanban of saved scholarships */}
          <Route path="/pipeline"     element={<Pipeline language="en" />} />
          <Route path="/pipeline/ru"  element={<Pipeline language="ru" />} />
          {/* Deadline calendar — paired with pipeline for time-based view */}
          <Route path="/calendar"     element={<Calendar language="en" />} />
          <Route path="/calendar/ru"  element={<Calendar language="ru" />} />
          {/* Referral hub — share your code, see your referrals */}
          <Route path="/refer"        element={<Refer language="en" />} />
          <Route path="/refer/ru"     element={<Refer language="ru" />} />
          {/* Public scholarship submission queue — anyone can suggest */}
          <Route path="/submit"       element={<SubmitScholarship language="en" />} />
          <Route path="/submit/ru"    element={<SubmitScholarship language="ru" />} />
          {/* Programmatic SEO landing pages — country / field / theme */}
          <Route path="/scholarships/by-country/:country" element={<ScholarshipsByFilter mode="country" />} />
          <Route path="/scholarships/by-field/:field"     element={<ScholarshipsByFilter mode="field" />} />
          <Route path="/scholarships/theme/:theme"        element={<ScholarshipsByFilter mode="theme" />} />
          {/* Per-scholarship detail page — also indexable, ~190 SEO surfaces */}
          <Route path="/scholarships/:id"                 element={<ScholarshipDetail />} />
          {/* Essay critique — premium-gated reader-perspective AI feedback */}
          <Route path="/essay"                            element={<EssayCritique language="en" />} />
          <Route path="/essay/ru"                         element={<EssayCritique language="ru" />} />
          {/* Fast AI scholarship matcher — type a sentence, get matches */}
          <Route path="/match"                            element={<AIMatch language="en" />} />
          <Route path="/match/ru"                         element={<AIMatch language="ru" />} />

          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/funnel" element={<FunnelDashboard />} />
          <Route path="/admin/insights" element={<AdminInsights />} />
          <Route path="/admin/sources" element={<AdminSources />} />
          <Route path="/admin/queue" element={<AdminQueue />} />
          <Route path="/academy" element={<Academy />} />
          <Route path="/blog/guide/:slug" element={<CountryGuide language="en" />} />
          <Route path="/blog/guide/:slug/ru" element={<CountryGuide language="ru" />} />
          {/* /prep/* routes removed — Prep is spinning off as its own product */}
          {/* Legacy routes for backward compatibility */}
          <Route path="/why-us" element={<WhyTU />} />
          <Route path="/why-us/ru" element={<WhyTURu />} />
          <Route path="/unsubscribe" element={<Unsubscribe />} />
          <Route path="/pricing" element={<Pricing language="en" />} />
          <Route path="/pricing/ru" element={<Pricing language="ru" />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/account" element={<Account language="en" />} />
          <Route path="/account/ru" element={<Account language="ru" />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
        </AuthProvider>
        </ErrorBoundary>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
