// src/context/BrandingContext.jsx
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { getCompanySettings } from "../services/settingsService";
import { assetUrl } from "../services/uploadService";
import { currentUserId, getCurrentUser } from "../utils/auth";
import {
  applyEffectiveBranding,
  applyStoredBranding,
  cacheCompanyBranding,
  resetBranding,
} from "../hooks/useBranding";

const EMPTY = {
  companyName: null,
  logoUrl: null, // raw path from server, e.g. "/uploads/logos/abc.png"
  logoFullUrl: null, // resolved with ORIGIN prefix, ready for <img src>
  settings: null,
  loading: true,
};

const BrandingContext = createContext({ ...EMPTY, reload: () => {} });

export function BrandingProvider({ children }) {
  const [state, setState] = useState(EMPTY);
  const requestId = useRef(0); // lets us ignore a response that arrives after the user changed
  const userIdRef = useRef(currentUserId());

  const load = useCallback(async () => {
    const mine = ++requestId.current;
    const me = getCurrentUser();

    if (!me) {
      setState({ ...EMPTY, loading: false });
      return;
    }

    try {
      setState((s) => ({ ...s, loading: true }));
      const res = await getCompanySettings();
      if (mine !== requestId.current) return; // a different user is logged in now

      const data = res?.data?.data || {};
      const b = data.branding || {};
      const company = data.companyId || data.company || null;
      const companyId = String(company?._id || me.companyId || "") || null;

      // Company default is cached; the user's personal choice (if any) wins.
      cacheCompanyBranding(companyId, b);
      applyEffectiveBranding(b, currentUserId());

      // Tell ThemeContext the company's default light/dark.
      window.dispatchEvent(
        new CustomEvent("company-branding-loaded", {
          detail: { defaultTheme: b.defaultTheme || null },
        }),
      );

      setState({
        companyName: company?.legalName || company?.tradeName || null,
        logoUrl: b.logoUrl || null,
        logoFullUrl: b.logoUrl ? assetUrl(b.logoUrl) : null,
        settings: data,
        loading: false,
      });
    } catch {
      if (mine === requestId.current) {
        setState((s) => ({ ...s, loading: false }));
      }
    }
  }, []);

  useEffect(() => {
    // Paint this user's last-used colors before the fetch resolves.
    applyStoredBranding();
    load();

    // Login / logout: drop the previous user's look and load the new one.
    const onSessionChanged = () => {
      // Wait a tick so the token and user are both saved.
      setTimeout(() => {
        const id = currentUserId();
        if (id === userIdRef.current) return; // same user, nothing to do
        userIdRef.current = id;
        requestId.current++; // ignore any in-flight response for the old user
        resetBranding();
        if (id) {
          setState(EMPTY);
          applyStoredBranding();
          load();
        } else {
          setState({ ...EMPTY, loading: false });
        }
      }, 0);
    };

    window.addEventListener("session-changed", onSessionChanged);
    return () =>
      window.removeEventListener("session-changed", onSessionChanged);
  }, [load]);

  return (
    <BrandingContext.Provider value={{ ...state, reload: load }}>
      {children}
    </BrandingContext.Provider>
  );
}

export const useBranding = () => useContext(BrandingContext);
