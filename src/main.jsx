import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "../buy-vs-rent.jsx";
import { LangProvider } from "./i18n";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <LangProvider>
      <App />
    </LangProvider>
  </StrictMode>
);
