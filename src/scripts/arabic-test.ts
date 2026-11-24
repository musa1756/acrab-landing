/**
 * Клиентский движок онлайн-теста уровня арабского языка (`/arabic-test/`).
 * Работает без React и без inline style="": все состояния переключаются классами и `[hidden]`.
 * Отправляет цели Метрики `test_start` и `test_complete`.
 */
import {
  PLACEMENT_QUESTIONS,
  PLACEMENT_SKILLS,
  evaluatePlacement,
} from "../data/placement-web";

const METRICA_ID = 113252004;

function reachGoal(goal: "test_start" | "test_complete"): void {
  const ym = (window as unknown as { ym?: (...args: unknown[]) => void }).ym;
  ym?.(METRICA_ID, "reachGoal", goal);
}

const SKILL_LABEL_BY_ID = new Map(PLACEMENT_SKILLS.map((skill) => [skill.id, skill.label]));

function initPlacementTest(root: HTMLElement): void {
  const stageEl = root.querySelector<HTMLElement>("[data-tst-stage]");
  const resultEl = root.querySelector<HTMLElement>("[data-tst-result]");
  const skillBadgeEl = root.querySelector<HTMLElement>("[data-tst-skill]");
  const counterEl = root.querySelector<HTMLElement>("[data-tst-counter]");
  const segs = Array.from(root.querySelectorAll<HTMLElement>("[data-tst-seg]"));
  const promptEl = root.querySelector<HTMLElement>("[data-tst-prompt]");
  const cueRowEl = root.querySelector<HTMLElement>("[data-tst-cue-row]");
  const cueArEl = root.querySelector<HTMLElement>("[data-tst-cue-ar]");
  const audioBtn = root.querySelector<HTMLButtonElement>("[data-tst-audio]");
  const optionsWrap = root.querySelector<HTMLElement>("[data-tst-options]");
  const feedbackEl = root.querySelector<HTMLElement>("[data-tst-feedback]");
  const feedbackTitleEl = root.querySelector<HTMLElement>("[data-tst-feedback-title]");
  const feedbackTextEl = root.querySelector<HTMLElement>("[data-tst-feedback-text]");
  const nextBtn = root.querySelector<HTMLButtonElement>("[data-tst-next]");

  const resBadgeEl = root.querySelector<HTMLElement>("[data-tst-res-badge]");
  const resTitleEl = root.querySelector<HTMLElement>("[data-tst-res-title]");
  const resScoreEl = root.querySelector<HTMLElement>("[data-tst-res-score]");
  const resSummaryEl = root.querySelector<HTMLElement>("[data-tst-res-summary]");
  const resSkillsEl = root.querySelector<HTMLElement>("[data-tst-res-skills]");
  const resStepsEl = root.querySelector<HTMLElement>("[data-tst-res-steps]");
  const resTrackEl = root.querySelector<HTMLElement>("[data-tst-res-track]");
  const resGuideLink = root.querySelector<HTMLAnchorElement>("[data-tst-res-guide]");
  const restartBtn = root.querySelector<HTMLButtonElement>("[data-tst-restart]");

  if (!stageEl || !resultEl || !promptEl || !optionsWrap || !nextBtn) return;

  let currentIndex = 0;
  let answers: (number | null)[] = Array.from({ length: PLACEMENT_QUESTIONS.length }, () => null);
  let startedGoalSent = false;
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

  function playCurrentAudio(): void {
    const question = PLACEMENT_QUESTIONS[currentIndex];
    if (!question?.audioSrc || !audioBtn) return;
    stopAudio();
    const audio = new Audio(question.audioSrc);
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

  function updateProgress(): void {
    segs.forEach((seg, index) => {
      seg.classList.remove("is-current", "is-correct", "is-wrong");
      const chosen = answers[index];
      if (chosen !== null) {
        const isRight = chosen === PLACEMENT_QUESTIONS[index]!.correctIndex;
        seg.classList.add(isRight ? "is-correct" : "is-wrong");
      } else if (index === currentIndex) {
        seg.classList.add("is-current");
      }
    });
  }

  function renderQuestion(): void {
    stopAudio();
    const question = PLACEMENT_QUESTIONS[currentIndex]!;
    const answered = answers[currentIndex];

    stageEl!.hidden = false;
    resultEl!.hidden = true;

    if (skillBadgeEl) skillBadgeEl.textContent = SKILL_LABEL_BY_ID.get(question.skill) ?? "";
    if (counterEl) counterEl.textContent = `Вопрос ${currentIndex + 1} из ${PLACEMENT_QUESTIONS.length}`;
    promptEl!.textContent = question.prompt;

    const hasCue = Boolean(question.arabicCue || question.audioSrc);
    if (cueRowEl) cueRowEl.hidden = !hasCue;
    if (cueArEl) {
      cueArEl.hidden = !question.arabicCue;
      cueArEl.textContent = question.arabicCue ?? "";
    }
    if (audioBtn) {
      audioBtn.hidden = !question.audioSrc;
      audioBtn.setAttribute("aria-label", question.audioLabel ? `Слушать: ${question.audioLabel}` : "Слушать озвучку");
    }

    optionsWrap!.textContent = "";
    question.options.forEach((option, optIndex) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = option.isArabic ? "tst-option tst-option-ar tile tile-gold" : "tst-option tile tile-gold";
      if (option.isArabic) {
        btn.lang = "ar";
        btn.dir = "rtl";
      }
      btn.textContent = option.label;
      btn.addEventListener("click", () => handleAnswer(optIndex));
      optionsWrap!.appendChild(btn);
    });

    if (feedbackEl) {
      feedbackEl.hidden = true;
      feedbackEl.classList.remove("is-correct", "is-wrong");
    }
    nextBtn!.hidden = true;
    nextBtn!.textContent = currentIndex === PLACEMENT_QUESTIONS.length - 1 ? "Показать результат" : "Следующий вопрос";

    if (answered !== null && answered !== undefined) {
      applyAnsweredState(answered);
    }
    updateProgress();
  }

  function applyAnsweredState(selectedIndex: number): void {
    const question = PLACEMENT_QUESTIONS[currentIndex]!;
    const isRight = selectedIndex === question.correctIndex;
    const buttons = Array.from(optionsWrap!.querySelectorAll<HTMLButtonElement>("button"));

    buttons.forEach((btn, idx) => {
      btn.disabled = true;
      btn.classList.remove("is-correct", "is-wrong", "is-dim");
      if (idx === question.correctIndex) {
        btn.classList.add("is-correct");
      } else if (idx === selectedIndex) {
        btn.classList.add("is-wrong");
      } else {
        btn.classList.add("is-dim");
      }
    });

    if (feedbackEl && feedbackTitleEl && feedbackTextEl) {
      feedbackEl.hidden = false;
      feedbackEl.classList.remove("is-correct", "is-wrong");
      feedbackEl.classList.add(isRight ? "is-correct" : "is-wrong");
      feedbackTitleEl.textContent = isRight ? "Верно!" : "Не совсем так";
      feedbackTextEl.textContent = question.explanation;
    }

    nextBtn!.hidden = false;
    updateProgress();
  }

  function handleAnswer(selectedIndex: number): void {
    if (answers[currentIndex] !== null) return;
    if (!startedGoalSent) {
      startedGoalSent = true;
      reachGoal("test_start");
    }
    answers[currentIndex] = selectedIndex;
    applyAnsweredState(selectedIndex);
  }

  function renderResult(): void {
    stopAudio();
    const outcome = evaluatePlacement(answers);
    reachGoal("test_complete");

    stageEl!.hidden = true;
    resultEl!.hidden = false;
    updateProgress();

    if (resBadgeEl) resBadgeEl.textContent = outcome.level.badge;
    if (resTitleEl) resTitleEl.textContent = `Ваш уровень: «${outcome.level.title}»`;
    if (resScoreEl) resScoreEl.textContent = `${outcome.correct} / ${outcome.total}`;
    if (resSummaryEl) resSummaryEl.textContent = outcome.level.summary;
    if (resTrackEl) resTrackEl.textContent = outcome.level.appTrack;

    if (resSkillsEl) {
      resSkillsEl.textContent = "";
      for (const skill of outcome.skills) {
        const card = document.createElement("div");
        card.className = "tst-skill-card tile tile-neutral";

        const name = document.createElement("span");
        name.className = "tst-skill-name";
        name.textContent = skill.label;

        const row = document.createElement("div");
        row.className = "tst-skill-row";

        const dots = document.createElement("span");
        dots.className = "tst-skill-dots";
        dots.setAttribute("aria-hidden", "true");
        for (let i = 0; i < skill.total; i++) {
          const dot = document.createElement("span");
          dot.className = i < skill.correct ? "tst-dot is-hit" : "tst-dot";
          dots.appendChild(dot);
        }

        const val = document.createElement("span");
        val.className = "tst-skill-val";
        val.textContent = `${skill.correct} из ${skill.total}`;

        row.append(dots, val);
        card.append(name, row);
        resSkillsEl.appendChild(card);
      }
    }

    if (resStepsEl) {
      resStepsEl.textContent = "";
      for (const step of outcome.level.nextSteps) {
        const li = document.createElement("li");
        li.textContent = step;
        resStepsEl.appendChild(li);
      }
    }

    if (resGuideLink) {
      resGuideLink.href = outcome.level.recommendedGuideHref;
      resGuideLink.textContent = outcome.level.recommendedGuideLabel;
    }

    resultEl!.focus({ preventScroll: true });
  }

  audioBtn?.addEventListener("click", () => {
    if (!startedGoalSent) {
      startedGoalSent = true;
      reachGoal("test_start");
    }
    if (activeAudio) stopAudio();
    else playCurrentAudio();
  });

  nextBtn.addEventListener("click", () => {
    if (currentIndex < PLACEMENT_QUESTIONS.length - 1) {
      currentIndex += 1;
      renderQuestion();
    } else {
      renderResult();
    }
  });

  restartBtn?.addEventListener("click", () => {
    currentIndex = 0;
    answers = Array.from({ length: PLACEMENT_QUESTIONS.length }, () => null);
    renderQuestion();
  });

  renderQuestion();
}

for (const root of document.querySelectorAll<HTMLElement>("[data-tst-app]")) {
  initPlacementTest(root);
}
