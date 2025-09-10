import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
// Service worker disabled to prevent aggressive caching

const rootElement = document.getElementById("root")!;

const root = createRoot(rootElement);

root.render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Unregister any previously installed service workers and clear caches
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .getRegistrations()
      .then((registrations) => {
        for (const registration of registrations) {
          registration.unregister();
        }
      })
      .catch(() => {
        // noop
      });

    if (typeof caches !== "undefined") {
      caches
        .keys()
        .then((keys) => {
          for (const key of keys) {
            caches.delete(key);
          }
        })
        .catch(() => {
          // noop
        });
    }
  });
}
