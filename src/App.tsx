import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider, QueryCache } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
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
const ProviderHub          = lazy(() => import("./pages/ProviderHub"));
const FundersIndex         = lazy(() => import("./pages/FundersIndex"));
// ScholarshipDetail page is currently hidden — /scholarships/:id redirects to
// the in-app dialog via ScholarshipDetailRedirect below. Keep the file in the
// tree for the next polish pass; this import was removed to drop dead bundle.
const EssayCritique        = lazy(() => import("./pages/EssayCritique"));
const Refer                = lazy(() => import("./pages/Refer"));
const Admin                = lazy(() => import("./pages/Admin"));
const FunnelDashboard      = lazy(() => import("./pages/FunnelDashboard"));
const AdminInsights        = lazy(() => import("./pages/AdminInsights"));
const Academy              = lazy(() => import("./pages/Academy"));
const AcademyLive          = lazy(() => import("./pages/AcademyLive"));
const CountryGuide         = lazy(() => import("./pages/CountryGuide"));
const NotFound             = lazy(() => import("./pages/NotFound"));
const PaymentCanceled      = lazy(() => import("./pages/PaymentCanceled"));
const Unsubscribe          = lazy(() => import("./pages/Unsubscribe"));
const Pricing              = lazy(() => import("./pages/Pricing"));
const AuthCallback         = lazy(() => import("./pages/AuthCallback"));
const AuthResetPassword    = lazy(() => import("./pages/AuthResetPassword"));
const Account              = lazy(() => import("./pages/Account"));
const AdminSources         = lazy(() => import("./pages/admin/Sources"));
const AdminQueue           = lazy(() => import("./pages/admin/ScholarshipQueue"));
const AdminSubmissions     = lazy(() => import("./pages/admin/Submissions"));
const AdminUniversities    = lazy(() => import("./pages/admin/Universities"));
const AdminScholarshipVerification = lazy(() => import("./pages/admin/ScholarshipVerification"));
const AdminAnalyticsFunnel       = lazy(() => import("./pages/admin/AnalyticsFunnel"));
const AdminWaitlist              = lazy(() => import("./pages/admin/Waitlist"));
const AdminAcademy               = lazy(() => import("./pages/admin/Academy"));
const AdminPartnerInquiries      = lazy(() => import("./pages/admin/PartnerInquiries"));
const SubmitScholarship    = lazy(() => import("./pages/SubmitScholarship"));

/* Pulls :id out of the legacy /scholarships/:id path and bounces the
   visitor into Discover with the scholarship pre-opened in the
   ExpandedScholarshipDialog. Preserves shareable URLs without the
   detail page's chaotic visual state. */
function ScholarshipDetailRedirect({ lang }: { lang: "en" | "ru" }) {
  const { id } = useParams<{ id: string }>();
  const base = lang === "ru" ? "/discover/ru" : "/discover";
  const target = id ? `${base}?scholarship=${encodeURIComponent(id)}` : base;
  return <Navigate to={target} replace />;
}

/* Query client with sane defaults + a single place to surface query
   failures. Before this, a failed background query was silent — no
   retry, no toast, no log. `retry: 1` rides out transient network
   blips; `staleTime` 5min cuts refetch storms on route changes; the
   QueryCache onError gives one consistent error toast instead of
   every component reinventing its own failure handling. */
const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      console.error("[query]", error);
      toast.error(
        error instanceof Error ? error.message : "Something went wrong loading data.",
      );
    },
  }),
  defaultOptions: {
    queries: { retry: 1, staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false },
    mutations: { retry: 0 },
  },
});

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
          <Route path="/faq" element={<FAQ />} />
          <Route path="/faq/ru" element={<FAQRu />} />
          {/* /why-tu retired round 17 — folded into Journal article
              "What to look for in an admissions consultant" */}
          <Route path="/why-tu" element={<Navigate to="/blog/admissions-consultant-checklist" replace />} />
          <Route path="/why-tu/ru" element={<Navigate to="/blog/admissions-consultant-checklist/ru" replace />} />
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
          {/* /calendar consolidated into Workspace round 17 — redirects
              keep external bookmarks alive. */}
          <Route path="/calendar"     element={<Navigate to="/pipeline?tab=calendar" replace />} />
          <Route path="/calendar/ru"  element={<Navigate to="/pipeline/ru?tab=calendar" replace />} />
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
          <Route path="/scholarships/by-provider/:slug"   element={<ProviderHub language="en" />} />
          <Route path="/scholarships/by-provider/ru/:slug" element={<ProviderHub language="ru" />} />
          <Route path="/scholarships/funders"             element={<FundersIndex language="en" />} />
          <Route path="/scholarships/funders/ru"          element={<FundersIndex language="ru" />} />
          {/* Country × Field combinations — programmatic SEO catch-up
              for long-tail queries like "computer science scholarships
              in Germany". Renders as a single page with both filters
              applied. */}
          <Route path="/scholarships/in/:country/:field"  element={<ScholarshipsByFilter mode="country-field" />} />
          {/* 2026-05-18: dedicated detail page hidden — UI was a mess of
              7 accent colours + inconsistent typography + sections that
              weren't ship-ready. The in-app ExpandedScholarshipDialog on
              /discover is the single surface now; direct URLs and SEO
              backlinks still land somewhere useful via a query-param
              handoff. Leaving ScholarshipDetail.tsx in the tree
              un-routed for the next polish pass. */}
          <Route path="/scholarships/:id"                 element={<ScholarshipDetailRedirect lang="en" />} />
          <Route path="/scholarships/:id/ru"              element={<ScholarshipDetailRedirect lang="ru" />} />
          {/* Essay critique — premium-gated reader-perspective AI feedback */}
          <Route path="/essay"                            element={<EssayCritique language="en" />} />
          <Route path="/essay/ru"                         element={<EssayCritique language="ru" />} />
          {/* /match retired round 17 — Discover's match scoring + the
              brief generator already cover the standalone matcher's
              job. Redirect saves any in-the-wild bookmarks. */}
          <Route path="/match"                            element={<Navigate to="/discover" replace />} />
          <Route path="/match/ru"                         element={<Navigate to="/discover/ru" replace />} />

          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/funnel" element={<FunnelDashboard />} />
          <Route path="/admin/insights" element={<AdminInsights />} />
          <Route path="/admin/sources" element={<AdminSources />} />
          <Route path="/admin/queue" element={<AdminQueue />} />
          <Route path="/admin/submissions" element={<AdminSubmissions />} />
          <Route path="/admin/universities" element={<AdminUniversities />} />
          <Route path="/admin/scholarships-verification" element={<AdminScholarshipVerification />} />
          <Route path="/admin/analytics" element={<AdminAnalyticsFunnel />} />
          <Route path="/admin/academy" element={<AdminAcademy />} />
          <Route path="/admin/waitlist" element={<AdminWaitlist />} />
          <Route path="/admin/partner-inquiries" element={<AdminPartnerInquiries />} />
          <Route path="/academy" element={<Academy language="en" />} />
          <Route path="/academy/ru" element={<Academy language="ru" />} />
          <Route path="/academy/live" element={<AcademyLive language="en" />} />
          <Route path="/academy/live/ru" element={<AcademyLive language="ru" />} />
          <Route path="/blog/guide/:slug" element={<CountryGuide language="en" />} />
          <Route path="/blog/guide/:slug/ru" element={<CountryGuide language="ru" />} />
          {/* /prep/* routes removed — Prep is spinning off as its own product */}
          {/* Legacy routes for backward compatibility */}
          <Route path="/why-us" element={<Navigate to="/blog/admissions-consultant-checklist" replace />} />
          <Route path="/why-us/ru" element={<Navigate to="/blog/admissions-consultant-checklist/ru" replace />} />
          <Route path="/unsubscribe" element={<Unsubscribe />} />
          <Route path="/pricing" element={<Pricing language="en" />} />
          <Route path="/pricing/ru" element={<Pricing language="ru" />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/auth/reset-password" element={<AuthResetPassword language="en" />} />
          <Route path="/auth/reset-password/ru" element={<AuthResetPassword language="ru" />} />
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
