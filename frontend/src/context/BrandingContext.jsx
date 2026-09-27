// src/context/BrandingContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import { getCompanySettings } from "../services/settingsService";
import { assetUrl } from "../services/uploadService";
import { applyBranding, applyStoredBranding } from "../hooks/useBranding";

const BrandingContext = createContext({
  companyName: null,
  logoUrl: null, // raw path from server, e.g. "/uploads/logos/abc.png"
  logoFullUrl: null, // resolved with ORIGIN prefix, ready for <img src>
  settings: null,
  loading: true,
  reload: () => {},
});

export function BrandingProvider({ children }) {
  const [state, setState] = useState({
    companyName: null,
    logoUrl: null,
    logoFullUrl: null,
    settings: null,
    loading: true,
  });

  const load = async () => {
    try {
      setState((s) => ({ ...s, loading: true }));
      const res = await getCompanySettings();
      const data = res?.data?.data || {};

      const b = data.branding || {};
      const company = data.companyId || data.company || null;

      // apply CSS branding vars (unchanged from before)
      if (b.primaryColor) {
        applyBranding(b.primaryColor, b.secondaryColor);
      }

      setState({
        companyName: company?.legalName || company?.tradeName || null,
        logoUrl: b.logoUrl || null,
        logoFullUrl: b.logoUrl ? assetUrl(b.logoUrl) : null,
        settings: data,
        loading: false,
      });
    } catch {
      setState((s) => ({ ...s, loading: false }));
    }
  };

  // Paint the last-used brand colors before the fetch resolves
  useEffect(() => {
    applyStoredBranding();
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <BrandingContext.Provider value={{ ...state, reload: load }}>
      {children}
    </BrandingContext.Provider>
  );
}

export const useBranding = () => useContext(BrandingContext);
