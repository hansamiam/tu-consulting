import Navigation from "@/components/Navigation";
import { ScrollProgress } from "@/components/ScrollProgress";
import { ScrollReveal } from "@/components/ScrollReveal";
import { Link } from "react-router-dom";
import { CreditCard, Shield, Lock, AlertTriangle } from "lucide-react";

const PaymentInfo = () => {
  return (
    <div className="min-h-screen bg-background">
      <ScrollProgress />
      <Navigation language="en" />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <ScrollReveal>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-8">
              Payment by Card
            </h1>
            <p className="text-muted-foreground mb-8">
              Last updated: January 2025
            </p>
          </ScrollReveal>

          {/* Payment Methods Section */}
          <ScrollReveal>
            <section className="mb-10">
              <h2 className="text-2xl font-semibold mb-6">Accepted Payment Methods</h2>
              <div className="bg-muted/30 rounded-lg p-6 border border-border">
                <div className="flex flex-wrap items-center justify-center gap-8 mb-6">
                  {/* Visa Logo */}
                  <div className="flex flex-col items-center">
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <svg viewBox="0 0 48 48" className="h-12 w-20">
                        <path fill="#1565C0" d="M45,35c0,2.209-1.791,4-4,4H7c-2.209,0-4-1.791-4-4V13c0-2.209,1.791-4,4-4h34c2.209,0,4,1.791,4,4V35z"/>
                        <path fill="#FFF" d="M15.186 19l-2.626 7.832c0 0-.667-3.313-.733-3.729-1.495-3.411-3.701-3.221-3.701-3.221L10.726 30v-.002h3.161L18.258 19H15.186zM17.689 30L20.56 30 22.296 19 19.389 19zM38.008 19h-3.021l-4.71 11h2.852l.588-1.571h3.596L37.619 30h2.613L38.008 19zM34.513 26.328l1.563-4.157.818 4.157H34.513zM26.369 22.206c0-.606.498-1.057 1.926-1.057.928 0 1.991.674 1.991.674l.466-2.309c0 0-1.358-.515-2.691-.515-3.019 0-4.576 1.444-4.576 3.272 0 3.306 3.979 2.853 3.979 4.551 0 .291-.231.964-1.888.964-1.662 0-2.759-.609-2.759-.609l-.495 2.216c0 0 1.063.606 3.117.606 2.059 0 4.915-1.54 4.915-3.752C30.354 23.586 26.369 23.394 26.369 22.206z"/>
                        <path fill="#FFC107" d="M12.212,24.945l-0.966-4.748c0,0-0.437-1.029-1.573-1.029c-1.136,0-4.44,0-4.44,0S10.894,20.84,12.212,24.945z"/>
                      </svg>
                    </div>
                    <span className="text-sm text-muted-foreground mt-2">Visa</span>
                  </div>
                  
                  {/* Mastercard Logo */}
                  <div className="flex flex-col items-center">
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <svg viewBox="0 0 48 48" className="h-12 w-20">
                        <path fill="#3F51B5" d="M45,35c0,2.209-1.791,4-4,4H7c-2.209,0-4-1.791-4-4V13c0-2.209,1.791-4,4-4h34c2.209,0,4,1.791,4,4V35z"/>
                        <circle fill="#FFC107" cx="30" cy="24" r="10"/>
                        <circle fill="#FF3D00" cx="18" cy="24" r="10"/>
                        <path fill="#FF9800" d="M24,17.5c-2.018,2.214-3.25,5.149-3.25,8.375s1.232,6.161,3.25,8.375c2.018-2.214,3.25-5.149,3.25-8.375S26.018,19.714,24,17.5z"/>
                      </svg>
                    </div>
                    <span className="text-sm text-muted-foreground mt-2">Mastercard</span>
                  </div>
                  
                  {/* Elkart Logo */}
                  <div className="flex flex-col items-center">
                    <div className="bg-white rounded-lg p-4 shadow-sm flex items-center justify-center h-[56px] w-[80px]">
                      <span className="text-lg font-bold text-green-600">ЭЛКАРТ</span>
                    </div>
                    <span className="text-sm text-muted-foreground mt-2">Elkart</span>
                  </div>
                </div>
                <p className="text-center text-muted-foreground">
                  We accept payments through FreedomPay, supporting Visa, Mastercard, and Elkart cards issued by banks in the Kyrgyz Republic and internationally.
                </p>
              </div>
            </section>
          </ScrollReveal>

          <div className="prose prose-lg max-w-none text-foreground">
            <ScrollReveal>
              <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                  <CreditCard className="h-6 w-6" />
                  1. Payment Process
                </h2>
                <p className="text-muted-foreground mb-4">
                  To pay for our services by bank card, follow these steps:
                </p>
                <ol className="list-decimal pl-6 text-muted-foreground space-y-3">
                  <li><strong>Select your service:</strong> Choose the consultation type or service package on our Offerings page.</li>
                  <li><strong>Fill out the booking form:</strong> Provide your contact information and any required details.</li>
                  <li><strong>Proceed to payment:</strong> You will be redirected to the secure FreedomPay payment page.</li>
                  <li><strong>Enter card details:</strong> Input your card number, expiration date, and CVV code on the secure payment page.</li>
                  <li><strong>Confirm payment:</strong> Complete the 3D Secure verification if prompted by your bank.</li>
                  <li><strong>Receive confirmation:</strong> Upon successful payment, you will receive an email confirmation and can proceed to schedule your consultation.</li>
                </ol>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                  <Shield className="h-6 w-6" />
                  2. Payment Security
                </h2>
                <p className="text-muted-foreground mb-4">
                  Your payment security is our top priority. All card payments are processed through FreedomPay, a licensed payment service provider in the Kyrgyz Republic.
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li><strong>PCI DSS Compliance:</strong> FreedomPay is certified to the Payment Card Industry Data Security Standard (PCI DSS), the highest level of security for payment processing.</li>
                  <li><strong>SSL/TLS Encryption:</strong> All data transmitted during payment is encrypted using 256-bit SSL/TLS encryption.</li>
                  <li><strong>3D Secure:</strong> Additional authentication layer (Verified by Visa / Mastercard SecureCode) for enhanced protection against fraud.</li>
                  <li><strong>Tokenization:</strong> Your card details are tokenized and never stored on our servers in their original form.</li>
                </ul>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                  <Lock className="h-6 w-6" />
                  3. Data Protection
                </h2>
                <p className="text-muted-foreground mb-4">
                  We are committed to protecting your personal and financial data:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li><strong>Card Number:</strong> We never see, store, or have access to your full card number. All card data is processed directly by FreedomPay.</li>
                  <li><strong>CVV Code:</strong> Your security code is never stored anywhere and is used only for transaction verification.</li>
                  <li><strong>Transaction Records:</strong> We retain only basic transaction information (amount, date, last 4 digits of card) for accounting purposes and your records.</li>
                  <li><strong>Privacy Compliance:</strong> All data handling complies with the Law of the Kyrgyz Republic "On Personal Data".</li>
                </ul>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4">4. Consent to Data Processing</h2>
                <div className="bg-muted/50 border border-border rounded-lg p-6">
                  <p className="text-muted-foreground mb-4">
                    By making a payment on our website, you consent to:
                  </p>
                  <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                    <li>The processing of your personal data as described in our <Link to="/privacy-policy" className="text-primary hover:underline">Privacy Policy</Link></li>
                    <li>The transfer of your payment data to FreedomPay for transaction processing</li>
                    <li>The terms of our <Link to="/public-offer" className="text-primary hover:underline">Public Offer Agreement</Link></li>
                    <li>The <Link to="/refund-policy" className="text-primary hover:underline">Refund Policy</Link> applicable to your purchase</li>
                  </ul>
                </div>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-6 w-6" />
                  5. Important Security Notice
                </h2>
                <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-6">
                  <p className="text-foreground font-semibold mb-4">
                    NEVER share your sensitive banking information with anyone, including:
                  </p>
                  <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                    <li><strong>Full card number</strong> via email, messenger, or phone</li>
                    <li><strong>CVV/CVC security code</strong> (the 3-digit code on the back of your card)</li>
                    <li><strong>PIN code</strong> for your bank card</li>
                    <li><strong>Online banking login credentials</strong> (username and password)</li>
                    <li><strong>SMS verification codes</strong> from your bank</li>
                    <li><strong>3D Secure passwords</strong></li>
                  </ul>
                  <p className="text-foreground mt-4">
                    <strong>Top Uni Consulting will NEVER ask you for this information.</strong> All legitimate payments are processed exclusively through the secure FreedomPay payment page.
                  </p>
                  <p className="text-muted-foreground mt-4">
                    If you receive any request for this information claiming to be from us, please report it immediately to <strong>topuniconsulting@gmail.com</strong>.
                  </p>
                </div>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4">6. Payment Issues</h2>
                <p className="text-muted-foreground mb-4">
                  If you experience any issues during payment:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li><strong>Payment declined:</strong> Check that your card details are correct and that your card is enabled for online payments. Contact your bank if the issue persists.</li>
                  <li><strong>Double charge:</strong> If you believe you were charged twice, contact us immediately at topuniconsulting@gmail.com with your transaction details. We will investigate and process a refund if applicable.</li>
                  <li><strong>Payment confirmation not received:</strong> Check your spam folder. If you still don't see it, contact us to verify your payment status.</li>
                  <li><strong>Technical errors:</strong> Clear your browser cache and try again. If problems persist, try a different browser or device.</li>
                </ul>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4">7. Currency and Pricing</h2>
                <p className="text-muted-foreground mb-4">
                  All prices on our website are displayed in Kyrgyzstani som (KGS) as the primary currency, with approximate USD equivalents for reference. The actual charge to your card will be in KGS.
                </p>
                <p className="text-muted-foreground mb-4">
                  For cards issued outside the Kyrgyz Republic, your bank will convert the amount to your local currency at their prevailing exchange rate. Additional currency conversion fees may apply as per your bank's policies.
                </p>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4">8. Refunds</h2>
                <p className="text-muted-foreground mb-4">
                  Refunds for card payments are processed to the original payment card. Please note:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li>Refunds are processed within 5-10 business days of approval</li>
                  <li>The actual credit to your account may take additional 5-14 business days depending on your bank</li>
                  <li>For full refund terms and conditions, please refer to our <Link to="/refund-policy" className="text-primary hover:underline">Refund Policy</Link></li>
                </ul>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4">9. Contact Information</h2>
                <p className="text-muted-foreground mb-4">
                  For payment-related inquiries, please contact us:
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
                  <li><Link to="/refund-policy" className="text-primary hover:underline">Refund Policy</Link></li>
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

export default PaymentInfo;
