import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import IndexRu from "./pages/IndexRu";
import Team from "./pages/Team";
import TeamRu from "./pages/TeamRu";
import Offerings from "./pages/Offerings";
import OfferingsRu from "./pages/OfferingsRu";
import FAQ from "./pages/FAQ";
import FAQRu from "./pages/FAQRu";
import WhyTU from "./pages/WhyTU";
import WhyTURu from "./pages/WhyTURu";
import ThankYou from "./pages/ThankYou";
import ThankYouRu from "./pages/ThankYouRu";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import PrivacyPolicyRu from "./pages/PrivacyPolicyRu";
import PublicOffer from "./pages/PublicOffer";
import PublicOfferRu from "./pages/PublicOfferRu";
import RefundPolicy from "./pages/RefundPolicy";
import RefundPolicyRu from "./pages/RefundPolicyRu";
import PaymentInfo from "./pages/PaymentInfo";
import PaymentInfoRu from "./pages/PaymentInfoRu";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/ru" element={<IndexRu />} />
          <Route path="/team" element={<Team />} />
          <Route path="/team/ru" element={<TeamRu />} />
          <Route path="/offerings" element={<Offerings />} />
          <Route path="/offerings/ru" element={<OfferingsRu />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/faq/ru" element={<FAQRu />} />
          <Route path="/why-tu" element={<WhyTU />} />
          <Route path="/why-tu/ru" element={<WhyTURu />} />
          <Route path="/thank-you" element={<ThankYou />} />
          <Route path="/thank-you/ru" element={<ThankYouRu />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/privacy-policy/ru" element={<PrivacyPolicyRu />} />
          <Route path="/public-offer" element={<PublicOffer />} />
          <Route path="/public-offer/ru" element={<PublicOfferRu />} />
          <Route path="/refund-policy" element={<RefundPolicy />} />
          <Route path="/refund-policy/ru" element={<RefundPolicyRu />} />
          <Route path="/payment-info" element={<PaymentInfo />} />
          <Route path="/payment-info/ru" element={<PaymentInfoRu />} />
          {/* Legacy routes for backward compatibility */}
          <Route path="/why-us" element={<WhyTU />} />
          <Route path="/why-us/ru" element={<WhyTURu />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
