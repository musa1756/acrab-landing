import { trackGoal } from "./analytics-goals";
import { renderQrSvg } from "./qr-svg";
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
} else {
  // На компьютере показываем QR-код текущей ссылки (со всеми UTM, click_id, slug и promo),
  // кнопку копирования и быструю отправку в Telegram.
  const qrSection = document.querySelector<HTMLElement>("[data-get-qr]");
  const qrSlot = document.querySelector<HTMLElement>("[data-get-qr-slot]");
  const copyBtn = document.querySelector<HTMLButtonElement>("[data-get-copy]");
  const tgLink = document.querySelector<HTMLAnchorElement>("[data-get-tg]");
  const status = document.querySelector<HTMLElement>("[data-get-status]");

  const shareUrl = window.location.href;

  if (qrSection && qrSlot) {
    try {
      qrSlot.innerHTML = renderQrSvg(shareUrl, {
        ariaLabel: "QR-код ссылки на скачивание приложения Acrab",
      });
      qrSection.hidden = false;
      trackGoal("qr_shown");
    } catch {
      // Если URL превышает лимит QR (редчайший случай), оставляем кнопки магазинов ниже.
    }
  }

  if (tgLink) {
    const tg = new URL("https://t.me/share/url");
    tg.searchParams.set("url", shareUrl);
    tg.searchParams.set("text", "Скачать Acrab — приложение для изучения арабского языка");
    tgLink.href = tg.toString();
  }

  let statusTimer = 0;
  const setStatus = (msg: string) => {
    if (!status) return;
    window.clearTimeout(statusTimer);
    status.textContent = msg;
    if (msg) statusTimer = window.setTimeout(() => { status.textContent = ""; }, 2600);
  };

  copyBtn?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setStatus("Ссылка скопирована — откройте её на телефоне.");
      return;
    } catch {
      // Fallback без clipboard API
    }
    setStatus("Скопируйте адрес из строки браузера.");
  });
}
