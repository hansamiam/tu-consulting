import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";

const LanguageSwitcher = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isRussian = location.pathname.startsWith('/ru');

  const switchLanguage = () => {
    if (isRussian) {
      navigate('/');
    } else {
      navigate('/ru');
    }
  };

  return (
    <button
      onClick={switchLanguage}
      className="fixed top-6 right-6 z-50 text-xs text-primary-foreground/50 hover:text-gold transition-colors duration-200 font-light tracking-wide"
    >
      {isRussian ? 'EN' : 'RU'}
    </button>
  );
};

export default LanguageSwitcher;
