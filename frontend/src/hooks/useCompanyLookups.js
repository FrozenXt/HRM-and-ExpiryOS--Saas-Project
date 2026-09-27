import { useEffect, useState } from "react";
import { getPlans, getCurrencies } from "../services/lookupService";

// country name -> backend country enum (IN | NP | US | other) + currency code.
export const COUNTRIES = [
  { name: "Nepal", code: "NP", currency: "NPR" },
  { name: "India", code: "IN", currency: "INR" },
  { name: "Bangladesh", code: "other", currency: "BDT" },
  { name: "Sri Lanka", code: "other", currency: "LKR" },
  { name: "Pakistan", code: "other", currency: "PKR" },
  { name: "United States", code: "US", currency: "USD" },
  { name: "United Kingdom", code: "other", currency: "GBP" },
  { name: "United Arab Emirates", code: "other", currency: "AED" },
  { name: "Australia", code: "other", currency: "AUD" },
];

// Adjust these if your plan / currency fields are named differently.
const planMax = (p) =>
  Number(p.maxEmployees ?? p.employeeLimit ?? p.limit ?? 0);
export const planLabel = (p) => p.name;
export const currencyLabel = (c) => `${c.code} — ${c.name}`;

export function useCompanyLookups() {
  const [plans, setPlans] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([getPlans(), getCurrencies()])
      .then(([p, c]) => {
        setPlans(p);
        setCurrencies(c);
      })
      .catch((err) => setError(err.response?.data?.message || err.message))
      .finally(() => setLoading(false));
  }, []);

  // Currency _id for a country name, or "" if not found.
  const currencyIdForCountry = (countryName) => {
    const country = COUNTRIES.find((c) => c.name === countryName);
    return currencies.find((c) => c.code === country?.currency)?._id || "";
  };

  // Smallest plan whose employee cap fits the limit (0 / no cap = unlimited).
  const planIdForLimit = (limit) => {
    const n = Number(limit);
    if (!n) return "";
    const sorted = [...plans].sort((a, b) => planMax(a) - planMax(b));
    const fit =
      sorted.find((p) => planMax(p) >= n) ||
      sorted.find((p) => planMax(p) === 0) || // unlimited plan
      sorted[sorted.length - 1];
    return fit?._id || "";
  };

  return {
    plans,
    currencies,
    loading,
    error,
    currencyIdForCountry,
    planIdForLimit,
  };
}
