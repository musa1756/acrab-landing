/**
 * Интерактивный поиск и фильтр по породам на странице `/arabic-verbs/`.
 * Фильтрует уже отрендеренные статические карточки без inline-стилей (через `hidden`),
 * и отправляет обезличенную цель `verb_search` в Метрику один раз за сессию.
 */
import { normalizeArabicSearch } from "../data/verbs-web";

const METRICA_ID = 113252004;
const SEARCH_GOAL_KEY = "acrab.web.verb_search_sent";

type FilterValue = "all" | "1" | "derived";

function reachGoalOnce(goal: string): void {
  try {
    if (sessionStorage.getItem(SEARCH_GOAL_KEY) === "1") return;
    sessionStorage.setItem(SEARCH_GOAL_KEY, "1");
  } catch {
    // sessionStorage может быть недоступен в приватном режиме.
  }
  const ym = (window as unknown as { ym?: (...args: unknown[]) => void }).ym;
  ym?.(METRICA_ID, "reachGoal", goal);
}

function pluralVerbs(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} глагол`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} глагола`;
  return `${count} глаголов`;
}

function initVerbDirectory(root: HTMLElement): void {
  const input = root.querySelector<HTMLInputElement>("[data-vb-search]");
  const clearBtn = root.querySelector<HTMLButtonElement>("[data-vb-clear]");
  const filterBtns = Array.from(root.querySelectorAll<HTMLButtonElement>("[data-vb-filter]"));
  const cards = Array.from(root.querySelectorAll<HTMLElement>("[data-vb-card]"));
  const statusEl = root.querySelector<HTMLElement>("[data-vb-status]");
  const emptyEl = root.querySelector<HTMLElement>("[data-vb-empty]");
  const resetBtn = root.querySelector<HTMLButtonElement>("[data-vb-reset]");

  if (!input || cards.length === 0) return;

  let activeFilter: FilterValue = "all";
  const totalCount = cards.length;

  function applyFilter(): void {
    const rawQuery = input!.value.trim();
    const ruNeedle = rawQuery.toLowerCase().replace(/ё/g, "е");
    const arNeedle = normalizeArabicSearch(rawQuery);
    let visible = 0;

    if (clearBtn) clearBtn.hidden = rawQuery.length === 0;

    for (const card of cards) {
      const cardForm = Number(card.dataset.form ?? "1");
      const matchesForm =
        activeFilter === "all" ||
        (activeFilter === "1" && cardForm === 1) ||
        (activeFilter === "derived" && cardForm > 1);

      let matchesQuery = true;
      if (rawQuery.length > 0) {
        const ruHaystack = (card.dataset.ru ?? "").toLowerCase().replace(/ё/g, "е");
        const arHaystack = card.dataset.ar ?? "";
        matchesQuery = ruHaystack.includes(ruNeedle) || (arNeedle.length > 0 && arHaystack.includes(arNeedle));
      }

      const show = matchesForm && matchesQuery;
      card.hidden = !show;
      if (show) visible++;
    }

    if (statusEl) {
      statusEl.textContent =
        visible === totalCount ? `Показано: ${pluralVerbs(totalCount)}` : `Найдено: ${pluralVerbs(visible)} из ${totalCount}`;
    }
    if (emptyEl) emptyEl.hidden = visible > 0;
  }

  input.addEventListener("input", () => {
    if (input.value.trim().length > 0) {
      reachGoalOnce("verb_search");
    }
    applyFilter();
  });

  clearBtn?.addEventListener("click", () => {
    input.value = "";
    input.focus();
    applyFilter();
  });

  resetBtn?.addEventListener("click", () => {
    input.value = "";
    activeFilter = "all";
    for (const btn of filterBtns) {
      btn.setAttribute("aria-pressed", btn.dataset.vbFilter === "all" ? "true" : "false");
    }
    applyFilter();
    input.focus();
  });

  for (const btn of filterBtns) {
    btn.addEventListener("click", () => {
      const next = (btn.dataset.vbFilter as FilterValue | undefined) ?? "all";
      activeFilter = next;
      for (const item of filterBtns) {
        item.setAttribute("aria-pressed", item === btn ? "true" : "false");
      }
      applyFilter();
    });
  }

  applyFilter();
}

for (const root of document.querySelectorAll<HTMLElement>("[data-vb-directory]")) {
  initVerbDirectory(root);
}
