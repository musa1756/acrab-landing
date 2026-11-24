/**
 * Клиентский скрипт компактного 4-шагового мини-тренажёра (`AlphabetMiniQuiz.astro`).
 * Без React и без inline style="". Отправляет цели Метрики `mini_quiz_start` и `mini_quiz_complete`.
 */
import { MINI_QUIZ_STEPS, miniQuizSummary } from "../data/mini-quiz-web";

const METRICA_ID = 113252004;

function reachGoal(goal: "mini_quiz_start" | "mini_quiz_complete"): void {
  const ym = (window as unknown as { ym?: (...args: unknown[]) => void }).ym;
  ym?.(METRICA_ID, "reachGoal", goal);
}

function initMiniQuiz(root: HTMLElement): void {
  const badgeEl = root.querySelector<HTMLElement>("[data-mqz-badge]");
  const segs = Array.from(root.querySelectorAll<HTMLElement>("[data-mqz-seg]"));
  const bodyEl = root.querySelector<HTMLElement>("[data-mqz-body]");
  const doneEl = root.querySelector<HTMLElement>("[data-mqz-done]");
  const promptEl = root.querySelector<HTMLElement>("[data-mqz-prompt]");
  const audioBtn = root.querySelector<HTMLButtonElement>("[data-mqz-audio]");
  const gridEl = root.querySelector<HTMLElement>("[data-mqz-grid]");
  const feedbackEl = root.querySelector<HTMLElement>("[data-mqz-feedback]");
  const feedbackTextEl = root.querySelector<HTMLElement>("[data-mqz-feedback-text]");
  const nextBtn = root.querySelector<HTMLButtonElement>("[data-mqz-next]");
  const doneScoreEl = root.querySelector<HTMLElement>("[data-mqz-score]");
  const doneTextEl = root.querySelector<HTMLElement>("[data-mqz-done-text]");
  const retryBtn = root.querySelector<HTMLButtonElement>("[data-mqz-retry]");

  if (!bodyEl || !doneEl || !promptEl || !gridEl || !nextBtn) return;

  let index = 0;
  let results: (boolean | null)[] = Array.from({ length: MINI_QUIZ_STEPS.length }, () => null);
  let started = false;
  let activeAudio: HTMLAudioElement | null = null;

  function stopAudio(): void {
    if (activeAudio) {
      activeAudio.pause();
      activeAudio = null;
    }
    if (audioBtn) {
      audioBtn.classList.remove("is-playing");
      audioBtn.setAttribute("aria-pressed", "false");
    }
  }

  function playAudio(): void {
    const step = MINI_QUIZ_STEPS[index];
    if (!step?.audioSrc || !audioBtn) return;
    stopAudio();
    const audio = new Audio(step.audioSrc);
    activeAudio = audio;
    audioBtn.classList.add("is-playing");
    audioBtn.setAttribute("aria-pressed", "true");
    const finish = () => {
      if (activeAudio !== audio) return;
      stopAudio();
    };
    audio.addEventListener("ended", finish);
    audio.addEventListener("error", finish);
    audio.play().catch(finish);
  }

  function updateBar(): void {
    segs.forEach((seg, segIdx) => {
      seg.classList.remove("is-current", "is-ok", "is-err");
      const val = results[segIdx];
      if (val === true) seg.classList.add("is-ok");
      else if (val === false) seg.classList.add("is-err");
      else if (segIdx === index) seg.classList.add("is-current");
    });
  }

  function renderStep(): void {
    stopAudio();
    const step = MINI_QUIZ_STEPS[index]!;

    bodyEl!.hidden = false;
    doneEl!.hidden = true;

    if (badgeEl) badgeEl.textContent = step.badge;
    promptEl!.textContent = step.prompt;

    if (audioBtn) {
      audioBtn.hidden = !step.audioSrc;
      audioBtn.setAttribute("aria-label", step.audioLabel ? `Слушать: ${step.audioLabel}` : "Слушать");
    }

    gridEl!.textContent = "";
    step.options.forEach((option, optIdx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "mqz-tile tile tile-gold";
      if (option.isArabic) {
        btn.lang = "ar";
        btn.dir = "rtl";
      }
      btn.textContent = option.label;
      btn.addEventListener("click", () => handlePick(optIdx));
      gridEl!.appendChild(btn);
    });

    if (feedbackEl) {
      feedbackEl.hidden = true;
      feedbackEl.classList.remove("is-ok", "is-err");
    }
    nextBtn!.textContent = index === MINI_QUIZ_STEPS.length - 1 ? "Итог" : "Дальше";
    updateBar();
  }

  function handlePick(chosenIndex: number): void {
    if (results[index] !== null) return;
    if (!started) {
      started = true;
      reachGoal("mini_quiz_start");
    }
    const step = MINI_QUIZ_STEPS[index]!;
    const ok = chosenIndex === step.correctIndex;
    results[index] = ok;

    const buttons = Array.from(gridEl!.querySelectorAll<HTMLButtonElement>("button"));
    buttons.forEach((btn, idx) => {
      btn.disabled = true;
      if (idx === step.correctIndex) btn.classList.add("is-ok");
      else if (idx === chosenIndex) btn.classList.add("is-err");
      else btn.classList.add("is-dim");
    });

    if (feedbackEl && feedbackTextEl) {
      feedbackEl.hidden = false;
      feedbackEl.classList.remove("is-ok", "is-err");
      feedbackEl.classList.add(ok ? "is-ok" : "is-err");
      feedbackTextEl.textContent = ok ? step.feedbackOk : step.feedbackWrong;
    }
    updateBar();
  }

  function renderDone(): void {
    stopAudio();
    const score = results.filter((val) => val === true).length;
    reachGoal("mini_quiz_complete");

    bodyEl!.hidden = true;
    doneEl!.hidden = false;
    if (badgeEl) badgeEl.textContent = "Готово!";
    if (doneScoreEl) doneScoreEl.textContent = `${score} из ${MINI_QUIZ_STEPS.length}`;
    if (doneTextEl) doneTextEl.textContent = miniQuizSummary(score, MINI_QUIZ_STEPS.length);
    updateBar();
  }

  audioBtn?.addEventListener("click", () => {
    if (!started) {
      started = true;
      reachGoal("mini_quiz_start");
    }
    if (activeAudio) stopAudio();
    else playAudio();
  });

  nextBtn.addEventListener("click", () => {
    if (index < MINI_QUIZ_STEPS.length - 1) {
      index += 1;
      renderStep();
    } else {
      renderDone();
    }
  });

  retryBtn?.addEventListener("click", () => {
    index = 0;
    results = Array.from({ length: MINI_QUIZ_STEPS.length }, () => null);
    renderStep();
  });

  renderStep();
}

for (const root of document.querySelectorAll<HTMLElement>("[data-mqz]")) {
  initMiniQuiz(root);
}
