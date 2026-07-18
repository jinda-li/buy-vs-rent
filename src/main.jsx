import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Root from "./Root.jsx";
import { LangProvider } from "./i18n";
import { ToolProvider } from "./tool";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <LangProvider>
      <ToolProvider>
        <Root />
      </ToolProvider>
    </LangProvider>
  </StrictMode>
);
