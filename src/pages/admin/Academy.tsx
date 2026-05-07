/* /admin/academy — internal-only Academy hub for the founder cohort.
 *
 * The public /academy route shows the waitlist landing for everyone
 * (signed-in or not). This admin route hosts the actual Academy
 * workshop / office-hours / guide management UI that used to render
 * inside /academy when the visitor was on the founder allowlist.
 *
 * RLS on academy_workshops gates writes to founders, so this page is
 * harmless to non-founders — they'd just see an empty list.
 */
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { AcademyFounderHub } from "@/components/academy/AcademyFounderHub";

const AdminAcademy = () => (
  <div className="min-h-screen bg-background">
    <Navigation />
    <AcademyFounderHub />
    <Footer language="en" />
  </div>
);

export default AdminAcademy;
