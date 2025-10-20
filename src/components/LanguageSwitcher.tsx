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
    <div className="fixed top-6 right-6 z-50">
      <Button
        variant="outline"
        size="sm"
        onClick={switchLanguage}
        className="bg-background/80 backdrop-blur-sm border-gold/30 text-foreground hover:bg-gold/10 hover:text-gold transition-all duration-200"
      >
        {isRussian ? '🇬🇧 English' : '🇷🇺 Русский'}
      </Button>
    </div>
  );
};

export default LanguageSwitcher;
