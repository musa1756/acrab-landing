import { captureTrafficAttribution, sendSiteVisitOnce, sendStoreClickBeacon } from "./traffic-attribution";
import { resolveStoreRedirect } from "./store-redirect-model";

const { attribution } = captureTrafficAttribution();
const resolved = resolveStoreRedirect(navigator.userAgent || "", navigator.maxTouchPoints, {
  search: window.location.search,
  attribution,
});

// Отправляем beacon до window.location.replace, чтобы визиты и клики на /get/ не терялись.
if (resolved) {
  sendSiteVisitOnce(attribution, window.location.pathname);
  sendStoreClickBeacon(resolved.store, attribution, window.location.pathname);
  // replace keeps the redirect page out of browser history.
  window.location.replace(resolved.url);
}
