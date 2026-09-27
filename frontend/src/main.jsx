// src/main.jsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { ThemeProvider } from "./context/ThemeContext";
import { applyStoredBranding } from "./hooks/useBranding";
import "./index.css";
import { BrandingProvider } from "./context/BrandingContext";

applyStoredBranding(); // restores whatever the last-used company's cache holds

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ThemeProvider>
      <BrandingProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </BrandingProvider>
    </ThemeProvider>
  </StrictMode>,
);
