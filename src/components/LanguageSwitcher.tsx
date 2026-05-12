import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";

// Russian routes always end with `/ru` (e.g. /pricing/ru, /blog/:id/ru,
// /scholarships/by-country/:country/ru). The previous includes('/ru')
// + replace('/ru', '') pair matched ANYWHERE in the path, so a user
// visiting /scholarships/by-country/russia or /by-field/russian-studies
// was (a) flagged as on the Russian site even though they weren't, and
// (b) had their URL mangled to /scholarships/by-country/ssia on switch.
// Anchor to the path boundary instead.
const RU_PATH_RE = /\/ru$/;

const LanguageSwitcher = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isRussian = RU_PATH_RE.test(location.pathname);

  const switchLanguage = () => {
    if (isRussian) {
      const newPath = location.pathname.replace(RU_PATH_RE, "");
      navigate(newPath || "/");
    } else if (location.pathname === "/") {
      navigate("/ru");
    } else {
      navigate(`${location.pathname}/ru`);
    }
  };

  return (
    <Button
      onClick={switchLanguage}
      variant="outline"
      size="sm"
      className="rounded-full border-gold/45 text-primary bg-surface hover:bg-secondary hover:text-primary"
      aria-label={isRussian ? 'Switch to English' : 'Переключить на русский'}
    >
      {isRussian ? 'EN' : 'RU'}
    </Button>
  );
};

export default LanguageSwitcher;
