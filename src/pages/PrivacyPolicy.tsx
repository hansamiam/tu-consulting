import Navigation from "@/components/Navigation";
import { ScrollProgress } from "@/components/ScrollProgress";
import { ScrollReveal } from "@/components/ScrollReveal";
import { Link } from "react-router-dom";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <ScrollProgress />
      <Navigation language="en" />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <ScrollReveal>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-8">
              Privacy Policy
            </h1>
            <p className="text-muted-foreground mb-8">
              Last updated: {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </p>
          </ScrollReveal>

          <div className="prose prose-lg max-w-none text-foreground">
            <ScrollReveal>
              <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
                <p className="text-muted-foreground mb-4">
                  Top Uni Consulting (hereinafter referred to as "the Company", "we", "us", or "our") is committed to protecting the privacy and personal data of our clients and website visitors. This Privacy Policy explains how we collect, use, store, and protect your personal information in accordance with the laws of the Kyrgyz Republic, including the Law of the Kyrgyz Republic "On Personal Data" dated April 14, 2008 No. 58.
                </p>
                <p className="text-muted-foreground mb-4">
                  By using our website and services, you consent to the collection and processing of your personal data as described in this Privacy Policy.
                </p>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4">2. Data Controller</h2>
                <p className="text-muted-foreground mb-4">
                  The data controller responsible for your personal data is:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li><strong>Company Name:</strong> Top Uni Consulting</li>
                  <li><strong>Address:</strong> Bishkek, Kyrgyz Republic</li>
                  <li><strong>Email:</strong> topuniconsulting@gmail.com</li>
                  <li><strong>Website:</strong> topuniconsulting.com</li>
                </ul>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4">3. Personal Data We Collect</h2>
                <p className="text-muted-foreground mb-4">
                  We collect the following categories of personal data:
                </p>
                
                <h3 className="text-xl font-medium mt-6 mb-3">3.1 Information You Provide Directly</h3>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li><strong>Contact Information:</strong> Full name, email address, phone number, mailing address</li>
                  <li><strong>Educational Information:</strong> Current school/university, grade level, academic records, standardized test scores (SAT, ACT, IELTS, TOEFL, etc.)</li>
                  <li><strong>Application Materials:</strong> Personal essays, statements of purpose, resumes, extracurricular activities, achievements, and recommendations</li>
                  <li><strong>Payment Information:</strong> Transaction records, payment receipts (note: actual payment card details are processed securely by FreedomPay and are never stored on our servers)</li>
                  <li><strong>Consultation Records:</strong> Notes from consultations, communication history, service preferences</li>
                </ul>

                <h3 className="text-xl font-medium mt-6 mb-3">3.2 Information Collected Automatically</h3>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li><strong>Device Information:</strong> IP address, browser type, operating system, device identifiers</li>
                  <li><strong>Usage Data:</strong> Pages visited, time spent on site, referral sources, click patterns</li>
                  <li><strong>Cookies and Tracking:</strong> Session cookies, analytics data (see Section 8 for cookie policy)</li>
                </ul>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4">4. Purpose and Legal Basis for Processing</h2>
                <p className="text-muted-foreground mb-4">
                  We process your personal data for the following purposes:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li><strong>Service Delivery:</strong> To provide university admissions consulting services, including application review, essay editing, interview preparation, and strategic guidance</li>
                  <li><strong>Communication:</strong> To respond to inquiries, schedule consultations, send service updates, and provide customer support</li>
                  <li><strong>Payment Processing:</strong> To process payments for services through our payment partner FreedomPay</li>
                  <li><strong>Legal Compliance:</strong> To comply with applicable laws, regulations, and legal processes of the Kyrgyz Republic</li>
                  <li><strong>Service Improvement:</strong> To analyze usage patterns and improve our website and services</li>
                  <li><strong>Marketing (with consent):</strong> To send promotional materials about our services, with your explicit consent</li>
                </ul>
                <p className="text-muted-foreground mt-4">
                  The legal basis for processing includes: your consent, performance of a contract, legitimate interests, and legal obligations under Kyrgyz law.
                </p>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4">5. Data Storage and Security</h2>
                <p className="text-muted-foreground mb-4">
                  We implement robust security measures to protect your personal data:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li><strong>Encryption:</strong> All data transmitted between your browser and our servers is encrypted using SSL/TLS (256-bit encryption)</li>
                  <li><strong>Secure Storage:</strong> Personal data is stored on secure servers with restricted access controls</li>
                  <li><strong>Access Controls:</strong> Only authorized personnel with a legitimate need have access to personal data</li>
                  <li><strong>Payment Security:</strong> Payment card data is processed exclusively by FreedomPay using PCI DSS-compliant systems; we never store card numbers, CVV codes, or other sensitive payment information</li>
                  <li><strong>Regular Audits:</strong> We conduct regular security reviews and updates to our systems</li>
                </ul>
                
                <h3 className="text-xl font-medium mt-6 mb-3">Data Retention</h3>
                <p className="text-muted-foreground mb-4">
                  We retain your personal data for as long as necessary to fulfill the purposes outlined in this policy, typically:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li>Active client data: Duration of service engagement plus 3 years</li>
                  <li>Financial records: 5 years as required by Kyrgyz tax law</li>
                  <li>Marketing consent records: Until consent is withdrawn</li>
                  <li>Website analytics: 26 months</li>
                </ul>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4">6. Your Rights</h2>
                <p className="text-muted-foreground mb-4">
                  Under the laws of the Kyrgyz Republic, you have the following rights regarding your personal data:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li><strong>Right of Access:</strong> Request information about what personal data we hold about you</li>
                  <li><strong>Right to Rectification:</strong> Request correction of inaccurate or incomplete data</li>
                  <li><strong>Right to Erasure:</strong> Request deletion of your personal data (subject to legal retention requirements)</li>
                  <li><strong>Right to Restrict Processing:</strong> Request limitation of how we use your data</li>
                  <li><strong>Right to Object:</strong> Object to processing of your data for certain purposes</li>
                  <li><strong>Right to Withdraw Consent:</strong> Withdraw previously given consent at any time</li>
                  <li><strong>Right to Complain:</strong> File a complaint with the relevant data protection authority in the Kyrgyz Republic</li>
                </ul>
                <p className="text-muted-foreground mt-4">
                  To exercise any of these rights, please contact us at <strong>topuniconsulting@gmail.com</strong>. We will respond to your request within 30 days.
                </p>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4">7. Data Sharing and Disclosure</h2>
                <p className="text-muted-foreground mb-4">
                  We do not sell your personal data. We may share your information only in the following circumstances:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li><strong>Service Providers:</strong> With trusted third parties who assist in operating our business (e.g., FreedomPay for payment processing, calendar services for scheduling)</li>
                  <li><strong>Legal Requirements:</strong> When required by law, court order, or government authority in the Kyrgyz Republic</li>
                  <li><strong>With Your Consent:</strong> When you have explicitly authorized us to share information (e.g., with universities during the application process)</li>
                  <li><strong>Business Transfers:</strong> In connection with any merger, acquisition, or sale of company assets</li>
                </ul>
                <p className="text-muted-foreground mt-4">
                  All service providers are contractually obligated to protect your data and use it only for the specified purposes.
                </p>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4">8. Cookies and Tracking Technologies</h2>
                <p className="text-muted-foreground mb-4">
                  Our website uses cookies and similar technologies to enhance your experience:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li><strong>Essential Cookies:</strong> Required for basic website functionality</li>
                  <li><strong>Analytics Cookies:</strong> Help us understand how visitors use our site</li>
                  <li><strong>Preference Cookies:</strong> Remember your settings and preferences (e.g., language selection)</li>
                </ul>
                <p className="text-muted-foreground mt-4">
                  You can control cookie settings through your browser preferences. Note that disabling certain cookies may affect website functionality.
                </p>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4">9. Children's Privacy</h2>
                <p className="text-muted-foreground mb-4">
                  Our services are intended for individuals aged 14 and older. For clients under 18, we require parental or guardian consent before collecting personal data. Parents/guardians may review, modify, or request deletion of their child's information by contacting us.
                </p>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4">10. International Data Transfers</h2>
                <p className="text-muted-foreground mb-4">
                  As part of our university consulting services, some of your data may be processed or shared internationally (e.g., with universities abroad at your request). In such cases, we ensure appropriate safeguards are in place to protect your data in accordance with Kyrgyz law.
                </p>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4">11. Changes to This Policy</h2>
                <p className="text-muted-foreground mb-4">
                  We may update this Privacy Policy from time to time. Any changes will be posted on this page with an updated "Last updated" date. Significant changes will be communicated via email or website notification. Continued use of our services after changes constitutes acceptance of the updated policy.
                </p>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4">12. Contact Us</h2>
                <p className="text-muted-foreground mb-4">
                  If you have questions about this Privacy Policy or wish to exercise your data rights, please contact us:
                </p>
                <ul className="list-none text-muted-foreground space-y-2">
                  <li><strong>Email:</strong> team@topuniconsulting.com</li>
                  <li><strong>Address:</strong> Bishkek, Kyrgyz Republic</li>
                </ul>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4">Related Documents</h2>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li><Link to="/public-offer" className="text-primary hover:underline">Public Offer Agreement</Link></li>
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
            © {new Date().getFullYear()} Top Uni Consulting | All Rights Reserved
          </p>
        </div>
      </footer>
    </div>
  );
};

export default PrivacyPolicy;
