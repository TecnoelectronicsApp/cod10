import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./translations/en";
import es from "./translations/es";
import de from "./translations/de";
import fr from "./translations/fr";
import km from "./translations/km";
import zh from "./translations/zh";
i18n.use(initReactI18next).init({
  resources: {
    en,
    es,
    de,
    fr,
    km,
    zh,
  },
  lng: localStorage.getItem("enatega-language") || "es",
  fallbackLng: "es",
  debug: false,
  interpolation: {
    escapeValue: false, // not needed for react!!
  },
});

export default i18n;
