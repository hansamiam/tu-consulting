import Navigation from "@/components/Navigation";
import { ScrollProgress } from "@/components/ScrollProgress";
import { ScrollReveal } from "@/components/ScrollReveal";
import { Link } from "react-router-dom";

const RefundPolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <ScrollProgress />
      <Navigation language="en" />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <ScrollReveal>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-8">
              Refund Policy
            </h1>
            <p className="text-muted-foreground mb-8">
              Last updated: January 2025
            </p>
          </ScrollReveal>

          <div className="prose prose-lg max-w-none text-foreground">
            <ScrollReveal>
              <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4">1. General Provisions</h2>
                <p className="text-muted-foreground mb-4">
                  This Refund Policy outlines the terms and conditions under which Top Uni Consulting (hereinafter referred to as "the Company", "we", "us", or "our") provides refunds for our educational consulting services. This policy is governed by the laws of the Kyrgyz Republic, including the Law "On Protection of Consumer Rights".
                </p>
                <p className="text-muted-foreground mb-4">
                  By purchasing our services, you agree to the terms of this Refund Policy. We encourage you to read this policy carefully before making a purchase.
                </p>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4">2. Individual Consultations</h2>
                
                <h3 className="text-xl font-medium mt-6 mb-3">2.1 Full Refund Conditions</h3>
                <p className="text-muted-foreground mb-4">
                  A full refund for individual consultations will be provided in the following cases:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li><strong>Cancellation before scheduling:</strong> If you request a refund before scheduling your consultation, you are entitled to a full refund minus any payment processing fees (typically 2-3%).</li>
                  <li><strong>Cancellation with 48+ hours notice:</strong> If you cancel a scheduled consultation at least 48 hours before the scheduled time, you are entitled to a full refund minus processing fees.</li>
                  <li><strong>Company cancellation:</strong> If the Company cancels a consultation for any reason, you are entitled to a full refund or rescheduling at your choice.</li>
                  <li><strong>Technical issues on our end:</strong> If a consultation cannot be conducted due to technical issues on the Company's side that cannot be resolved within 15 minutes, you are entitled to a full refund or rescheduling.</li>
                </ul>

                <h3 className="text-xl font-medium mt-6 mb-3">2.2 Partial Refund Conditions</h3>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li><strong>Cancellation with 24-48 hours notice:</strong> If you cancel between 24 and 48 hours before the scheduled consultation, you are entitled to a 50% refund.</li>
                </ul>

                <h3 className="text-xl font-medium mt-6 mb-3">2.3 No Refund Conditions</h3>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li>Cancellation with less than 24 hours notice</li>
                  <li>No-show without prior notice</li>
                  <li>Consultation has been conducted (completed services)</li>
                  <li>Technical issues on the client's side (internet, equipment, etc.)</li>
                </ul>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4">3. Service Packages</h2>
                
                <h3 className="text-xl font-medium mt-6 mb-3">3.1 Full Refund Conditions</h3>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li><strong>Within 7 days of purchase, before first consultation:</strong> If you request a refund within 7 calendar days of purchasing a package AND before your first consultation has been scheduled, you are entitled to a full refund minus payment processing fees.</li>
                </ul>

                <h3 className="text-xl font-medium mt-6 mb-3">3.2 Partial Refund Conditions</h3>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li><strong>After first consultation but within 14 days:</strong> If you request a refund after the first consultation but within 14 days of purchase, you may receive a refund for unused services, calculated as follows:
                    <br /><br />
                    <em>Refund Amount = (Total Package Price - Value of Completed Services) × 0.80</em>
                    <br /><br />
                    A 20% administrative fee is deducted from the remaining balance.
                  </li>
                  <li><strong>Service quality issues:</strong> If you believe the quality of services does not meet the standards described, you may file a complaint within 7 days of the relevant service. We will investigate and may offer a partial refund or credit at our discretion.</li>
                </ul>

                <h3 className="text-xl font-medium mt-6 mb-3">3.3 No Refund Conditions</h3>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li>More than 14 days have passed since purchase</li>
                  <li>More than 50% of package services have been used</li>
                  <li>Package validity period has expired (12 months)</li>
                  <li>Promotional or discounted packages (unless otherwise stated)</li>
                  <li>Client has violated the terms of service</li>
                </ul>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4">4. Special Circumstances</h2>
                
                <h3 className="text-xl font-medium mt-6 mb-3">4.1 Medical Emergencies</h3>
                <p className="text-muted-foreground mb-4">
                  In cases of documented medical emergencies affecting you or an immediate family member, we may provide a full or partial refund regardless of the standard policy. Documentation (such as a doctor's note) may be required.
                </p>

                <h3 className="text-xl font-medium mt-6 mb-3">4.2 Force Majeure</h3>
                <p className="text-muted-foreground mb-4">
                  In cases of force majeure events (natural disasters, war, government actions, pandemic restrictions) that prevent service delivery, refunds will be handled on a case-by-case basis with consideration for both parties' interests.
                </p>

                <h3 className="text-xl font-medium mt-6 mb-3">4.3 Service Unavailability</h3>
                <p className="text-muted-foreground mb-4">
                  If we are unable to provide scheduled services due to consultant unavailability or business closure, you will receive a full refund for any undelivered services.
                </p>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4">5. Refund Process</h2>
                
                <h3 className="text-xl font-medium mt-6 mb-3">5.1 How to Request a Refund</h3>
                <p className="text-muted-foreground mb-4">
                  To request a refund, please follow these steps:
                </p>
                <ol className="list-decimal pl-6 text-muted-foreground space-y-2">
                  <li>Send an email to <strong>topuniconsulting@gmail.com</strong> with the subject line "Refund Request"</li>
                  <li>Include in your email:
                    <ul className="list-disc pl-6 mt-2 space-y-1">
                      <li>Your full name</li>
                      <li>Date of purchase</li>
                      <li>Service/package purchased</li>
                      <li>Reason for refund request</li>
                      <li>Payment receipt or transaction ID</li>
                    </ul>
                  </li>
                  <li>We will acknowledge your request within 3 business days</li>
                  <li>A decision will be communicated within 10 business days of receiving all required information</li>
                </ol>

                <h3 className="text-xl font-medium mt-6 mb-3">5.2 Processing Time</h3>
                <p className="text-muted-foreground mb-4">
                  Once a refund is approved:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li><strong>Bank card payments (via FreedomPay):</strong> Refunds will be processed within 5-10 business days. The funds will be returned to the original payment card. Actual receipt of funds depends on your bank and may take an additional 5-14 business days.</li>
                  <li><strong>Bank transfers:</strong> Refunds will be processed within 5-10 business days to the originating bank account.</li>
                  <li><strong>Other payment methods:</strong> Processing time may vary. We will inform you of the expected timeline.</li>
                </ul>

                <h3 className="text-xl font-medium mt-6 mb-3">5.3 Processing Fees</h3>
                <p className="text-muted-foreground mb-4">
                  Payment processing fees (charged by FreedomPay and banks) are non-refundable unless the refund is due to an error on our part or Company cancellation. These fees typically range from 2-3% of the transaction amount.
                </p>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4">6. Disputes</h2>
                <p className="text-muted-foreground mb-4">
                  If you disagree with our refund decision, you may:
                </p>
                <ol className="list-decimal pl-6 text-muted-foreground space-y-2">
                  <li><strong>Request a review:</strong> Send a detailed explanation to topuniconsulting@gmail.com. A senior member of our team will review your case within 14 business days.</li>
                  <li><strong>Formal complaint:</strong> If still unsatisfied, you may file a formal complaint with consumer protection authorities in the Kyrgyz Republic.</li>
                  <li><strong>Legal recourse:</strong> As a last resort, disputes may be resolved through the courts of the Kyrgyz Republic in accordance with applicable law.</li>
                </ol>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4">7. Alternative Remedies</h2>
                <p className="text-muted-foreground mb-4">
                  In some cases, instead of a refund, we may offer:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li><strong>Service credit:</strong> Credit toward future services with extended validity</li>
                  <li><strong>Service exchange:</strong> Exchange for a different service of equal or lesser value</li>
                  <li><strong>Rescheduling:</strong> Rescheduling of consultations to a more convenient time</li>
                  <li><strong>Additional services:</strong> Complimentary additional services to address quality concerns</li>
                </ul>
                <p className="text-muted-foreground mt-4">
                  These alternatives will be offered at our discretion and require your agreement.
                </p>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4">8. Changes to This Policy</h2>
                <p className="text-muted-foreground mb-4">
                  We reserve the right to modify this Refund Policy at any time. Changes will be effective upon posting to our website. The policy in effect at the time of your purchase will apply to that transaction.
                </p>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4">9. Contact Information</h2>
                <p className="text-muted-foreground mb-4">
                  For refund requests or questions about this policy, please contact us:
                </p>
                <ul className="list-none text-muted-foreground space-y-2">
                  <li><strong>Email:</strong> topuniconsulting@gmail.com</li>
                  <li><strong>Address:</strong> Bishkek, Kyrgyz Republic</li>
                </ul>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4">Related Documents</h2>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li><Link to="/privacy-policy" className="text-primary hover:underline">Privacy Policy</Link></li>
                  <li><Link to="/public-offer" className="text-primary hover:underline">Public Offer Agreement</Link></li>
                  <li><Link to="/payment-info" className="text-primary hover:underline">Payment by Card Information</Link></li>
                </ul>
              </section>
            </ScrollReveal>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-muted/30 border-t border-border py-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-muted-foreground mb-2">
            Led by consultants from Yale, Harvard, Cambridge, and Tsinghua
          </p>
          <p className="text-muted-foreground text-sm">
            © 2025 Top Uni Consulting | All Rights Reserved
          </p>
        </div>
      </footer>
    </div>
  );
};

export default RefundPolicy;
