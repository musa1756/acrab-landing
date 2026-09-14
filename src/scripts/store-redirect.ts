import { storeTarget } from "./store-redirect-model";

const target = storeTarget(navigator.userAgent || "", navigator.maxTouchPoints);

// replace keeps the redirect page out of browser history.
if (target) window.location.replace(target);
