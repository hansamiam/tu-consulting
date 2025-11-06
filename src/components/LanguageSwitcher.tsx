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
    <button
      onClick={switchLanguage}
      className="text-sm text-primary-foreground/60 hover:text-gold transition-colors duration-200 tracking-wider font-medium"
    >
      {isRussian ? 'EN' : 'RU'}
    </button>
  );
};

export default LanguageSwitcher;
