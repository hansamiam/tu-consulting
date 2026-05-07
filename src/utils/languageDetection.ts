export const detectUserLanguage = (): string => {
  // Check browser language. \`userLanguage\` is the IE-era fallback;
  // standard \`navigator.language\` is universally supported now but
  // we keep the fallback in a typed shape for the rare legacy UA.
  const nav = navigator as Navigator & { userLanguage?: string };
  const browserLang = navigator.language || nav.userLanguage;

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
