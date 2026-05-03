import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "../buy-vs-rent.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
