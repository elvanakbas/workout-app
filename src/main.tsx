import { StrictMode, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { AppDataProvider, useAppData } from "./state/AppDataContext";
import { CloudAuthProvider } from "./cloud/CloudAuthContext";
import App from "./App";
import "./index.css";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element #root not found in index.html");
}

/** Bridges cloud sync → AppData History refresh. */
function CloudAuthWithAppBridge({ children }: { children: ReactNode }) {
  const { reloadLogsFromStorage } = useAppData();
  return (
    <CloudAuthProvider onLogsChanged={reloadLogsFromStorage}>{children}</CloudAuthProvider>
  );
}

/**
 * HashRouter (not BrowserRouter): GitHub Pages is static hosting with no
 * server-side rewrite for client-side routes, and the app is served from a
 * project sub-path (e.g. /workout-app/), not the domain root.
 */
createRoot(rootElement).render(
  <StrictMode>
    <HashRouter>
      <AppDataProvider>
        <CloudAuthWithAppBridge>
          <App />
        </CloudAuthWithAppBridge>
      </AppDataProvider>
    </HashRouter>
  </StrictMode>
);
