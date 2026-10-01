/**
 * Устаревшая страница из кэша браузера перезагружается один раз. Номер сборки
 * страницы — `<html data-build>`, текущий — `/build.txt` (запрос мимо кэша).
 * Перезагрузка заново спрашивает сервер о самой странице, и он отдаёт новую.
 * Одна попытка на номер: если старое пришло и после неё, страница остаётся как
 * есть, без петли.
 */
const ATTEMPT_KEY = "acrab.fresh-page.reloaded";

async function checkFreshness(): Promise<void> {
  const pageBuild = document.documentElement.dataset.build;
  if (!pageBuild) return;
  let latest: string;
  try {
    const response = await fetch("/build.txt", { cache: "no-store" });
    if (!response.ok) return;
    latest = (await response.text()).trim();
  } catch {
    return;
  }
  if (!/^[0-9a-f]{12}$/.test(latest) || latest === pageBuild) return;
  try {
    if (sessionStorage.getItem(ATTEMPT_KEY) === latest) return;
    sessionStorage.setItem(ATTEMPT_KEY, latest);
  } catch {
    return;
  }
  location.reload();
}

void checkFreshness();
// Страница, восстановленная кнопкой «Назад», скрипт заново не выполняет.
window.addEventListener("pageshow", (event) => {
  if (event.persisted) void checkFreshness();
});
