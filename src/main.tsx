import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Guard: never register SW in iframes or preview hosts
const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("preview");

if (isPreviewHost || isInIframe) {
  navigator.serviceWorker?.getRegistrations().then((registrations) => {
    registrations.forEach((r) => r.unregister());
  });
} else if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.log("SW registration failed:", err);
    });
  });
}

// A slow or failed server function must never blank the whole app.
window.addEventListener("unhandledrejection", (e) => {
  const msg = String((e.reason as Error)?.message ?? e.reason ?? "");
  if (/Edge function|FunctionsHttpError|FunctionsFetchError|IDLE_TIMEOUT/i.test(msg) || (e.reason as any)?.name?.startsWith?.("Functions")) {
    console.warn("Server function failed:", msg);
    e.preventDefault();
  }
});

createRoot(document.getElementById("root")!).render(<App />);
