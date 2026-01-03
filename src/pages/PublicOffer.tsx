import Navigation from "@/components/Navigation";
import { ScrollProgress } from "@/components/ScrollProgress";
import { ScrollReveal } from "@/components/ScrollReveal";
import { Link } from "react-router-dom";

const PublicOffer = () => {
  return (
    <div className="min-h-screen bg-background">
      <ScrollProgress />
      <Navigation language="en" />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <ScrollReveal>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-8">
              Public Offer Agreement
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
                  This document constitutes an official public offer (proposal) of Top Uni Consulting (hereinafter referred to as "the Company", "Contractor", or "we") to enter into an agreement for the provision of educational consulting services (hereinafter referred to as "Services") on the terms set forth below.
                </p>
                <p className="text-muted-foreground mb-4">
                  In accordance with Article 396 of the Civil Code of the Kyrgyz Republic, this document is a public offer, and upon acceptance of the terms set forth herein, the individual or legal entity accepting this offer becomes the Client (hereinafter referred to as "Client" or "you").
                </p>
                <p className="text-muted-foreground mb-4">
                  <strong>Acceptance of the offer</strong> is the complete and unconditional acceptance of the terms of this Agreement by making payment for the selected Services. The moment of acceptance is the moment of crediting funds to the Company's account.
                </p>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4">2. Definitions</h2>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li><strong>Public Offer:</strong> A proposal addressed to an indefinite number of persons containing all essential terms of the agreement</li>
                  <li><strong>Acceptance:</strong> Complete and unconditional acceptance of the terms of this Agreement</li>
                  <li><strong>Services:</strong> Educational consulting services, including but not limited to university admissions consulting, application review, essay editing, interview preparation, and strategic guidance</li>
                  <li><strong>Consultation:</strong> A scheduled session with a Company consultant, conducted in person or via video conference</li>
                  <li><strong>Package:</strong> A bundled set of Services offered at a fixed price</li>
                  <li><strong>Website:</strong> topuniconsulting.com</li>
                </ul>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4">3. Subject of the Agreement</h2>
                <p className="text-muted-foreground mb-4">
                  3.1. The Company undertakes to provide educational consulting Services to the Client, and the Client undertakes to pay for these Services in accordance with the terms of this Agreement.
                </p>
                <p className="text-muted-foreground mb-4">
                  3.2. The specific scope, content, and cost of Services are determined by the selected package or consultation type as described on the Website at the time of purchase.
                </p>
                <p className="text-muted-foreground mb-4">
                  3.3. The Company's Services include, but are not limited to:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li>Individual consultations on university selection and application strategy</li>
                  <li>Review and editing of application essays and personal statements</li>
                  <li>Guidance on extracurricular activities and profile building</li>
                  <li>Interview preparation and mock interviews</li>
                  <li>Application timeline management and deadline tracking</li>
                  <li>Financial aid and scholarship consultation</li>
                </ul>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4">4. Rights and Obligations of the Company</h2>
                <h3 className="text-xl font-medium mt-6 mb-3">4.1. The Company is obligated to:</h3>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li>Provide Services in accordance with the selected package or consultation type</li>
                  <li>Provide Services using qualified personnel with relevant experience and expertise</li>
                  <li>Maintain confidentiality of Client information in accordance with the Privacy Policy</li>
                  <li>Respond to Client inquiries within reasonable timeframes</li>
                  <li>Provide access to scheduled consultations at agreed times</li>
                  <li>Issue receipts and documentation for payments received</li>
                </ul>
                
                <h3 className="text-xl font-medium mt-6 mb-3">4.2. The Company has the right to:</h3>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li>Request from the Client all information necessary for providing Services</li>
                  <li>Reschedule consultations with at least 24 hours notice</li>
                  <li>Suspend Services if payment is not received or is disputed</li>
                  <li>Modify the terms of this Agreement with prior notice to existing Clients</li>
                  <li>Refuse service to Clients who violate the terms of this Agreement</li>
                  <li>Engage third-party specialists for certain aspects of Service delivery</li>
                </ul>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4">5. Rights and Obligations of the Client</h2>
                <h3 className="text-xl font-medium mt-6 mb-3">5.1. The Client is obligated to:</h3>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li>Provide accurate and complete information necessary for Service delivery</li>
                  <li>Make timely payments for selected Services</li>
                  <li>Attend scheduled consultations at agreed times or provide at least 24 hours notice for rescheduling</li>
                  <li>Respect the intellectual property rights of the Company and its consultants</li>
                  <li>Not share or distribute materials provided by the Company to third parties</li>
                  <li>Comply with deadlines for submitting materials for review</li>
                </ul>
                
                <h3 className="text-xl font-medium mt-6 mb-3">5.2. The Client has the right to:</h3>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li>Receive Services of the quality and scope described in the selected package</li>
                  <li>Request clarification on any aspect of the Services</li>
                  <li>Reschedule consultations with at least 24 hours notice</li>
                  <li>Request a refund in accordance with the Refund Policy</li>
                  <li>Access records of their consultations and submitted materials</li>
                  <li>Receive receipts and documentation for payments made</li>
                </ul>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4">6. Service Activation and Delivery</h2>
                <p className="text-muted-foreground mb-4">
                  6.1. Services are activated upon receipt of payment by the Company. The Client will receive confirmation of payment and service activation via email.
                </p>
                <p className="text-muted-foreground mb-4">
                  6.2. Consultations are scheduled through the Company's online booking system (Calendly) after payment confirmation.
                </p>
                <p className="text-muted-foreground mb-4">
                  6.3. Package services must be used within 12 months from the date of purchase, unless otherwise specified.
                </p>
                <p className="text-muted-foreground mb-4">
                  6.4. Individual consultations must be scheduled within 30 days of purchase and conducted within 60 days.
                </p>
                <p className="text-muted-foreground mb-4">
                  6.5. Unused services do not carry over and are non-refundable after the specified validity period.
                </p>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4">7. Payment Terms</h2>
                <p className="text-muted-foreground mb-4">
                  7.1. Prices for Services are displayed on the Website in Kyrgyzstani som (KGS) as the primary currency, with approximate USD equivalents provided for reference.
                </p>
                <p className="text-muted-foreground mb-4">
                  7.2. Payment is made through FreedomPay payment system, which accepts bank cards (Visa, Mastercard, Elkart) and bank transfers.
                </p>
                <p className="text-muted-foreground mb-4">
                  7.3. Payment is considered complete when funds are credited to the Company's account.
                </p>
                <p className="text-muted-foreground mb-4">
                  7.4. The Company reserves the right to offer promotional discounts and promo codes at its discretion.
                </p>
                <p className="text-muted-foreground mb-4">
                  7.5. All prices include applicable taxes. No additional fees will be charged unless explicitly stated.
                </p>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4">8. Disclaimer and Limitations</h2>
                <p className="text-muted-foreground mb-4">
                  8.1. <strong>No Guarantee of Admission:</strong> The Company provides consulting services to improve the quality of university applications. The Company does not and cannot guarantee admission to any university or program, as admission decisions are made solely by the educational institutions.
                </p>
                <p className="text-muted-foreground mb-4">
                  8.2. The Client acknowledges that success depends on many factors beyond the Company's control, including but not limited to: academic qualifications, university policies, competition, and application timing.
                </p>
                <p className="text-muted-foreground mb-4">
                  8.3. The Company's liability is limited to the amount paid for Services. The Company is not liable for indirect, consequential, or incidental damages.
                </p>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4">9. Modification and Termination</h2>
                <p className="text-muted-foreground mb-4">
                  9.1. The Company may modify the terms of this Agreement at any time. Changes take effect upon publication on the Website.
                </p>
                <p className="text-muted-foreground mb-4">
                  9.2. Existing Clients will be notified of material changes via email at least 14 days before changes take effect.
                </p>
                <p className="text-muted-foreground mb-4">
                  9.3. Either party may terminate the Agreement by written notice. Termination does not affect Services already paid for and delivered.
                </p>
                <p className="text-muted-foreground mb-4">
                  9.4. The Company may terminate the Agreement immediately if the Client violates its terms or engages in fraudulent activity.
                </p>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4">10. Dispute Resolution</h2>
                <p className="text-muted-foreground mb-4">
                  10.1. Any disputes arising from this Agreement shall be resolved through negotiations between the parties.
                </p>
                <p className="text-muted-foreground mb-4">
                  10.2. If a dispute cannot be resolved through negotiations within 30 days, it shall be submitted to the courts of the Kyrgyz Republic in accordance with applicable law.
                </p>
                <p className="text-muted-foreground mb-4">
                  10.3. This Agreement is governed by the laws of the Kyrgyz Republic.
                </p>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4">11. Company Details</h2>
                <ul className="list-none text-muted-foreground space-y-2">
                  <li><strong>Company Name:</strong> Top Uni Consulting</li>
                  <li><strong>Address:</strong> Bishkek, Kyrgyz Republic</li>
                  <li><strong>Email:</strong> team@topuniconsulting.com</li>
                  <li><strong>Website:</strong> topuniconsulting.com</li>
                </ul>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4">Related Documents</h2>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li><Link to="/privacy-policy" className="text-primary hover:underline">Privacy Policy</Link></li>
                  <li><Link to="/refund-policy" className="text-primary hover:underline">Refund Policy</Link></li>
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

export default PublicOffer;
