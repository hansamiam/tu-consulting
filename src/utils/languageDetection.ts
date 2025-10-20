export const detectUserLanguage = (): string => {
  // Check browser language
  const browserLang = navigator.language || (navigator as any).userLanguage;
  
  // Check if user's language starts with 'ru'
  if (browserLang && browserLang.toLowerCase().startsWith('ru')) {
    return 'ru';
  }
  
  return 'en';
};

export const shouldRedirectToRussian = (): boolean => {
  const currentPath = window.location.pathname;
  
  // Don't redirect if already on Russian page
  if (currentPath.startsWith('/ru')) {
    return false;
  }
  
  // Check if user's language is Russian
  const userLang = detectUserLanguage();
  
  return userLang === 'ru';
};
