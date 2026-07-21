import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { AppDataProvider } from "./state/AppDataContext";
import App from "./App";
import "./index.css";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element #root not found in index.html");
}

/**
 * HashRouter (not BrowserRouter): GitHub Pages is static hosting with no
 * server-side rewrite for client-side routes, and the app is served from a
 * project sub-path (e.g. /workout-app/), not the domain root. With
 * BrowserRouter, a direct load/refresh at /workout-app/workout/w1 requests a
 * URL the static host doesn't have a file for and can't rewrite, and even
 * the plain /workout-app/ root fails to match any route without a
 * `basename`. HashRouter keeps all routing state after the "#", so every
 * URL the server actually needs to serve is just /workout-app/ (or the
 * domain root in local dev) - the part after "#" is resolved entirely by
 * the browser/React Router, so direct navigation and refresh both work.
 */
createRoot(rootElement).render(
  <StrictMode>
    <HashRouter>
      <AppDataProvider>
        <App />
      </AppDataProvider>
    </HashRouter>
  </StrictMode>
);
