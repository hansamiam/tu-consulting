import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle, Home } from "lucide-react";
import Navigation from "@/components/Navigation";

const ThankYou = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const consultationType = searchParams.get("type") || "consultation";

  useEffect(() => {
    // Load Calendly widget
    const head = document.querySelector("head");
    const script = document.createElement("script");
    script.setAttribute("src", "https://assets.calendly.com/assets/external/widget.js");
    script.setAttribute("type", "text/javascript");
    script.setAttribute("async", "true");
    head?.appendChild(script);

    return () => {
      // Cleanup
      head?.removeChild(script);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary via-primary to-primary-dark">
      <Navigation language="en" />
      
      <div className="container mx-auto px-4 py-12 md:py-20">
        <div className="max-w-4xl mx-auto">
          {/* Success Message */}
          <div className="text-center mb-8 md:mb-12">
            <CheckCircle className="w-16 h-16 md:w-20 md:h-20 text-gold mx-auto mb-4 md:mb-6" />
            <h1 className="text-3xl md:text-5xl font-bold text-gold mb-4">
              Payment Confirmed!
            </h1>
            <p className="text-lg md:text-xl text-primary-foreground/90 mb-2">
              Thank you for your payment. We've received your receipt and are excited to work with you.
            </p>
            <p className="text-base md:text-lg text-primary-foreground/80">
              Now, let's schedule your {consultationType === "package" ? "first session" : "consultation"}:
            </p>
          </div>

          {/* Calendly Inline Widget */}
          <div className="bg-white rounded-lg shadow-xl p-2 mb-8">
            <div 
              className="calendly-inline-widget" 
              data-url="https://calendly.com/topuniconsulting"
              style={{ minWidth: "320px", height: "700px" }}
            />
          </div>

          {/* Navigation */}
          <div className="text-center">
            <Button
              onClick={() => navigate("/")}
              variant="outline"
              className="border-gold text-gold hover:bg-gold hover:text-primary"
            >
              <Home className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </div>

          {/* Additional Info */}
          <div className="mt-12 p-6 bg-gold/10 border border-gold/20 rounded-lg">
            <h3 className="text-xl font-semibold text-gold mb-3">What's Next?</h3>
            <ul className="space-y-2 text-primary-foreground/90">
              <li className="flex items-start gap-2">
                <span className="text-gold mt-1">•</span>
                <span>You'll receive a confirmation email from Calendly with your booking details</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gold mt-1">•</span>
                <span>We'll send you a reminder 24 hours before your session</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gold mt-1">•</span>
                <span>Prepare any questions or materials you'd like to discuss</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gold mt-1">•</span>
                <span>If you need to reschedule, you can do so directly through the Calendly confirmation email</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThankYou;
