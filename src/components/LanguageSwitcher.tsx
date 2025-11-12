import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";

const LanguageSwitcher = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isRussian = location.pathname.includes('/ru');

  const switchLanguage = () => {
    if (isRussian) {
      // Remove /ru from the path
      const newPath = location.pathname.replace('/ru', '');
      navigate(newPath || '/');
    } else {
      // Add /ru to the path
      if (location.pathname === '/') {
        navigate('/ru');
      } else {
        navigate(`${location.pathname}/ru`);
      }
    }
  };

  return (
    <Button
      onClick={switchLanguage}
      variant="outline"
      size="sm"
      className="rounded-full border-gold/50 text-primary-foreground bg-background/30 hover:bg-background/50"
      aria-label={isRussian ? 'Switch to English' : 'Переключить на русский'}
    >
      {isRussian ? 'EN' : 'RU'}
    </Button>
  );
};

export default LanguageSwitcher;
