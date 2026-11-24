import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent, type ReactElement } from "react";
import { checkPromoCode, createPayment, loadPricing, loadSubscription, PaymentApiError, requestOtp, verifyOtp } from "./payment-api";
import { checkPromoErrorMessage, createPaymentErrorMessage, promoCodeErrorMessage, sendCodeErrorMessage, verifyCodeErrorMessage } from "./payment-messages";
import {
  DEFAULT_PRICING,
  DEFAULT_PROMO_DISCOUNT_PERCENT,
  effectivePlanAmount,
  formatRub,
  hasLifetimeUpgrade,
  isActiveLifetimePremium,
  isPendingCheckoutActive,
  isValidPromoCodeFormat,
  normalizePromoCodeInput,
  pendingCheckoutDeadline,
  planAmount,
  PLAN_ORDER,
  sessionExpiry,
  type AppliedPromo,
  type PaymentStep,
  type PendingCheckout,
  type Plan,
  type Pricing,
  type SubscriptionRow,
} from "./payment-model";
import { PHOSPHOR, type PhosphorName } from "../../lib/phosphor";
import { clearCheckoutSession, clearPendingCheckout, readCheckoutSession, readPendingCheckout, writeCheckoutSession, writePendingCheckout } from "./payment-storage";
import { trackGoal } from "../../scripts/analytics-goals";
import { captureTrafficAttribution, readTrafficAttribution, toPaymentAttribution } from "../../scripts/traffic-attribution";

// A meta CSP cannot express frame-ancestors. This guard runs as soon as the
// payment island is evaluated and prevents checkout controls in a hostile frame.
if (typeof window !== "undefined" && window.top !== window.self) {
  window.top!.location.href = window.self.location.href;
}

type PendingAction = "send-code" | "verify-code" | "check-promo" | "create-payment" | "open-checkout" | null;

const PLAN_TITLE: Record<Plan, string> = { annual: "Год", monthly: "Месяц", lifetime: "Навсегда" };
const PLAN_NOTE: Record<Plan, string> = { annual: "за год", monthly: "в месяц", lifetime: "разовый платёж" };
const PLAN_ACCUSATIVE: Record<Plan, string> = { annual: "«Год»", monthly: "«Месяц»", lifetime: "«Навсегда»" };

// Значок Phosphor (тот же набор, что у Icon.astro): остров рисует его сам, в приложении
// такие значки стоят в плашках и на кнопках. Декоративный, для чтения с экрана скрыт.
function Icon({ name }: { name: PhosphorName }): ReactElement {
  return <svg viewBox="0 0 256 256" fill="currentColor" focusable="false" aria-hidden="true" dangerouslySetInnerHTML={{ __html: PHOSPHOR[name] }} />;
}

// StatusBanner приложения: карточка с рамкой, значок слева и текст. Ошибка — плашка,
// пустая скрыта; role="alert" остаётся на самом тексте ошибки.
function ErrorMessage({ message }: { message: string }): ReactElement {
  return (
    <div className="banner" hidden={!message}>
      <span className="banner-icon"><Icon name="warning" /></span>
      <p className="banner-title" role="alert">{message}</p>
    </div>
  );
}

function formatDeadline(pending: PendingCheckout): string {
  return new Date(pendingCheckoutDeadline(pending)).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

export default function PaymentFlow(): ReactElement {
  const [step, setStep] = useState<PaymentStep>("email");
  const [email, setEmail] = useState("");
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [plan, setPlan] = useState<Plan | null>("annual");
  const [pricing, setPricing] = useState<Pricing>(DEFAULT_PRICING);
  const [subscription, setSubscription] = useState<SubscriptionRow | null>(null);
  const [pending, setPending] = useState<PendingCheckout | null>(null);
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<AppliedPromo | null>(null);
  const [promoError, setPromoError] = useState("");
  const [personalDataConsent, setPersonalDataConsent] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [emailError, setEmailError] = useState("");
  const [codeError, setCodeError] = useState("");
  const [planError, setPlanError] = useState("");
  const emailInputRef = useRef<HTMLInputElement>(null);
  const codeInputRef = useRef<HTMLInputElement>(null);

  // Premium «Навсегда» не продлевают и не покупают дважды: сервер отклоняет
  // такую оплату, поэтому кнопки тарифов для этого аккаунта не показываем.
  const lifetimeActive = isActiveLifetimePremium(subscription);
  const lifetimeUpgrade = hasLifetimeUpgrade(pricing, subscription);

  async function verifyPromoSilently(code: string, token: string | null): Promise<void> {
    if (!isValidPromoCodeFormat(code)) return;
    try {
      const result = await checkPromoCode(code, token);
      if (result.status === "ok") {
        setAppliedPromo({
          code: result.code,
          discountPercent: result.discountPercent ?? DEFAULT_PROMO_DISCOUNT_PERCENT,
          kind: result.kind ?? "blogger",
        });
        setPromoInput(result.code);
        setPromoError("");
      } else {
        setAppliedPromo(null);
        setPromoError(promoCodeErrorMessage(result.status));
      }
    } catch {
      // При фоновой автопроверке из ?promo= оставляем код в поле, чтобы можно было нажать «Применить».
    }
  }

  async function loadAccount(token: string, promoToRevalidate?: string | null): Promise<void> {
    const [nextPricing, nextSubscription] = await Promise.all([loadPricing(), loadSubscription(token)]);
    setPricing(nextPricing);
    setSubscription(nextSubscription);

    if (isActiveLifetimePremium(nextSubscription) || hasLifetimeUpgrade(nextPricing, nextSubscription)) {
      setAppliedPromo(null);
      setPromoError("");
      return;
    }

    if (promoToRevalidate) {
      await verifyPromoSilently(promoToRevalidate, token);
    }
  }

  // Вернувшись со страницы банка, человек сразу видит тарифы: вход и ссылка
  // «Точки» пережили переход в sessionStorage. Как в приложении, оплату можно
  // создавать заново сколько угодно раз; прошлая ссылка остаётся доступной,
  // пока не истекла. Возврат через bfcache восстанавливает страницу вместе с
  // занятой кнопкой — pageshow её отпускает.
  useEffect(() => {
    const { attribution } = captureTrafficAttribution();
    const urlPromo = new URLSearchParams(window.location.search).get("promo");
    const initialPromo = normalizePromoCodeInput(urlPromo || attribution.promo || "");
    if (initialPromo) {
      setPromoInput(initialPromo);
    }

    const session = readCheckoutSession();
    if (session) {
      setEmail(session.email);
      setAccessToken(session.accessToken);
      setStep("plan");
      void loadAccount(session.accessToken, initialPromo || null);
    } else {
      // Тарифы видны до входа: цены публичные, подписка читается после кода.
      void loadPricing().then(setPricing);
      if (initialPromo && isValidPromoCodeFormat(initialPromo)) {
        void verifyPromoSilently(initialPromo, null);
      }
    }
    const storedPending = readPendingCheckout();
    if (storedPending) {
      setPending(storedPending);
      setPlan(storedPending.plan);
    }
    const onPageShow = (event: PageTransitionEvent): void => {
      if (event.persisted) {
        setPendingAction(null);
        setPending(readPendingCheckout());
      }
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  function handlePromoInputChange(event: ChangeEvent<HTMLInputElement>): void {
    const next = normalizePromoCodeInput(event.currentTarget.value);
    if (appliedPromo) setAppliedPromo(null);
    setPromoInput(next);
    setPromoError("");
  }

  async function handleApplyPromo(): Promise<void> {
    const code = normalizePromoCodeInput(promoInput);
    if (!isValidPromoCodeFormat(code) || pendingAction !== null || lifetimeUpgrade) return;
    setPromoError("");
    setPlanError("");
    setPendingAction("check-promo");
    try {
      const result = await checkPromoCode(code, accessToken);
      if (result.status === "ok") {
        setAppliedPromo({
          code: result.code,
          discountPercent: result.discountPercent ?? DEFAULT_PROMO_DISCOUNT_PERCENT,
          kind: result.kind ?? "blogger",
        });
        setPromoInput(result.code);
        clearPendingCheckout();
        setPending(null);
        trackGoal("buy_promo_apply", { status: "ok", kind: result.kind ?? "blogger" });
      } else {
        setAppliedPromo(null);
        setPromoError(promoCodeErrorMessage(result.status));
        trackGoal("buy_promo_apply", { status: result.status });
      }
    } catch (error) {
      setPromoError(checkPromoErrorMessage(error));
    } finally {
      setPendingAction(null);
    }
  }

  function handlePromoKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === "Enter") {
      event.preventDefault();
      void handleApplyPromo();
    }
  }

  function handleClearPromo(): void {
    setAppliedPromo(null);
    setPromoInput("");
    setPromoError("");
    clearPendingCheckout();
    setPending(null);
  }

  async function handleSendCode(): Promise<void> {
    const normalizedEmail = email.trim();
    setEmailError("");
    if (!normalizedEmail) {
      setEmailError("Введите почту.");
      return;
    }
    if (!personalDataConsent) {
      setEmailError("Для отправки кода нужно дать отдельное согласие на обработку персональных данных.");
      return;
    }

    // The button is outside a form, so invoke native type=email validation explicitly.
    const emailInput = emailInputRef.current;
    if (emailInput) {
      emailInput.value = normalizedEmail;
      if (!emailInput.checkValidity()) {
        setEmailError("Проверьте, что адрес введён без опечаток и лишних пробелов.");
        return;
      }
    }

    setEmail(normalizedEmail);
    setPendingAction("send-code");
    try {
      await requestOtp(normalizedEmail);
      trackGoal("buy_otp_send");
      setStep("code");
    } catch (error) {
      setEmailError(sendCodeErrorMessage(error));
    } finally {
      setPendingAction(null);
    }
  }

  function resetAccount(): void {
    clearCheckoutSession();
    clearPendingCheckout();
    setAccessToken(null);
    setPlan("annual");
    setPlanError("");
    setCodeError("");
    setAppliedPromo(null);
    setPromoError("");
    setSubscription(null);
    setPending(null);
    setStep("email");
  }

  async function handleVerifyCode(): Promise<void> {
    const code = codeInputRef.current?.value.trim() || "";
    setCodeError("");
    if (!code) {
      setCodeError("Введите код из письма.");
      return;
    }
    if (!email) {
      setCodeError("Сначала укажите почту аккаунта Acrab.");
      setStep("email");
      return;
    }

    setPendingAction("verify-code");
    try {
      const result = await verifyOtp(email, code);
      if (!result || typeof result.access_token !== "string") {
        throw new PaymentApiError("Missing access_token", 500);
      }
      const token = result.access_token;
      writeCheckoutSession({ email, accessToken: token, expiresAt: sessionExpiry(result) });
      setAccessToken(token);
      setStep("plan");
      trackGoal("buy_otp_verify");
      await loadAccount(token, appliedPromo?.code ?? null);
    } catch (error) {
      setCodeError(verifyCodeErrorMessage(error));
    } finally {
      setPendingAction(null);
    }
  }

  function openCheckout(link: string, selectedPlan?: Plan | null): void {
    setPendingAction("open-checkout");
    trackGoal("buy_pay_redirect", selectedPlan ? { plan: selectedPlan } : undefined);
    window.location.assign(link);
  }

  async function handlePayment(): Promise<void> {
    setPlanError("");
    if (!plan || !accessToken) return;

    setPendingAction("create-payment");
    try {
      const promoCode = !lifetimeUpgrade && appliedPromo ? appliedPromo.code : null;
      const attribution = toPaymentAttribution(readTrafficAttribution());
      const created = await createPayment(accessToken, plan, { promoCode, attribution });
      const nextPending: PendingCheckout = { plan, paymentLink: created.paymentLink, createdAt: Date.now(), expiresAt: created.expiresAt };
      writePendingCheckout(nextPending);
      setPending(nextPending);
      openCheckout(created.paymentLink, plan);
    } catch (error) {
      const message = createPaymentErrorMessage(error);
      setPendingAction(null);
      if (error instanceof PaymentApiError && error.status === 401) {
        // Токен входа истёк: назад к почте, как просит текст ошибки.
        resetAccount();
        setEmailError(message);
        return;
      }
      if (error instanceof PaymentApiError && error.status === 422) {
        setAppliedPromo(null);
        setPlanError(message);
        return;
      }
      setPlanError(message);
    }
  }

  function handleOpenPending(): void {
    if (!pending || !isPendingCheckoutActive(pending)) {
      clearPendingCheckout();
      setPending(null);
      return;
    }
    setPlanError("");
    openCheckout(pending.paymentLink, pending.plan);
  }

  const busy = pendingAction !== null;

  // Тарифы стоят выше входа и видны всегда: выбрать можно до почты, а
  // подтверждение почты нужно только чтобы нажать «Оплатить». Для аккаунта с
  // активным «Навсегда» выбор убирается после входа.
  const picker = lifetimeActive ? null : (
    <div className="plan-picker" role="group" aria-label="Выбор тарифа">
      {PLAN_ORDER.map((option) => {
        const baseAmount = planAmount(option, pricing, subscription);
        const displayAmount = effectivePlanAmount(option, pricing, subscription, appliedPromo);
        const hasDiscount = displayAmount < baseAmount;
        return (
          <button
            key={option}
            className={`tile plan-option${plan === option ? " is-selected" : ""}`}
            type="button"
            data-plan={option}
            aria-pressed={plan === option}
            onClick={() => {
              setPlan(option);
              trackGoal("buy_plan_select", { plan: option });
            }}
          >
            <span className="plan-crown"><Icon name="crown" /></span>
            <span className="plan-copy">
              <span className="plan-title">{PLAN_TITLE[option]}</span>
              {option === "annual" ? <span className="badge plan-badge">Выгоднее</span> : null}
              {hasDiscount ? <span className="plan-price-old">{formatRub(baseAmount)}</span> : null}
              <span className="plan-price" id={`price-${option}`}>{formatRub(displayAmount)}</span>
              <span className="plan-note">{option === "lifetime" && lifetimeUpgrade ? "переход с года" : PLAN_NOTE[option]}</span>
              {option === "annual" ? <span className="plan-note">{`≈ ${formatRub(displayAmount / 12)}/мес`}</span> : null}
            </span>
          </button>
        );
      })}
    </div>
  );

  const promoBlock = lifetimeActive ? null : lifetimeUpgrade ? (
    <p id="promo-upgrade-hint" className="promo-upgrade-hint">
      Промокод не суммируется с льготным переходом на «Навсегда» за {formatRub(planAmount("lifetime", pricing, subscription))}.
    </p>
  ) : (
    <div className={`promo-card${appliedPromo ? " is-applied" : ""}`} id="promo-card">
      <label className="auth-label promo-label" htmlFor="promo-input">Промокод</label>
      <div className="promo-row">
        <input
          id="promo-input"
          className={`auth-input promo-input${promoInput ? " has-value" : ""}`}
          type="text"
          inputMode="text"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          maxLength={20}
          placeholder="Промокод"
          value={promoInput}
          disabled={busy}
          onChange={handlePromoInputChange}
          onKeyDown={handlePromoKeyDown}
        />
        <button
          id="apply-promo-btn"
          className="btn btn-compact promo-btn"
          type="button"
          disabled={busy || appliedPromo !== null || !isValidPromoCodeFormat(promoInput)}
          onClick={handleApplyPromo}
        >
          {pendingAction === "check-promo" ? "Проверяем…" : appliedPromo ? "Применено" : "Применить"}
        </button>
      </div>
      {appliedPromo ? (
        <p id="promo-applied-note" className="promo-status">
          <span>Промокод <strong>{appliedPromo.code}</strong> применён — скидка {appliedPromo.discountPercent}%.</span>
          <button id="clear-promo-btn" className="auth-linklike auth-linklike-inline" type="button" disabled={busy} onClick={handleClearPromo}>Убрать</button>
        </p>
      ) : null}
      {promoError ? <p id="promo-error" className="promo-error" role="alert">{promoError}</p> : null}
    </div>
  );

  return (
    <>
      {picker}
      {promoBlock}

      <div id="step-email" className="auth-step" data-step="email" hidden={step !== "email"}>
        <p className="auth-hint">Чтобы оплатить{plan ? ` тариф ${PLAN_ACCUSATIVE[plan]}` : ""}, подтвердите почту аккаунта Acrab: Premium привязывается к нему.</p>
        <label className="auth-label" htmlFor="email-input">Почта аккаунта Acrab</label>
        <input ref={emailInputRef} id="email-input" className="auth-input" type="email" inputMode="email" autoComplete="email" placeholder="you@example.com" required value={email} onChange={(event) => setEmail(event.currentTarget.value)} />
        <label className="legal-consent">
          <input id="personal-data-consent" type="checkbox" checked={personalDataConsent} onChange={(event) => setPersonalDataConsent(event.currentTarget.checked)} />
          <span>Даю <a href="/consent/" target="_blank" rel="noopener">согласие на обработку персональных данных</a> для входа и оформления Premium.</span>
        </label>
        <button id="send-code-btn" className="btn btn-block" type="button" disabled={busy} onClick={handleSendCode}>Получить код</button>
        <p className="auth-account-note">Ещё нет аккаунта Acrab? Сначала <a href="/get/">установите приложение</a> и привяжите почту в Профиле — старт бесплатный.</p>
        <ErrorMessage message={emailError} />
      </div>

      <div id="step-code" className="auth-step" data-step="code" hidden={step !== "code"}>
        <p className="auth-hint">Код отправлен на <strong>{email}</strong>.</p>
        <label className="auth-label" htmlFor="code-input">Код из письма</label>
        <input ref={codeInputRef} id="code-input" className="auth-input" type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6} autoComplete="one-time-code" placeholder="000000" required />
        <button id="verify-code-btn" className="btn btn-block" type="button" disabled={busy} onClick={handleVerifyCode}>Подтвердить</button>
        <button id="change-email-btn" className="auth-linklike" type="button" onClick={resetAccount}>Изменить почту</button>
        <ErrorMessage message={codeError} />
      </div>

      <div id="step-plan" className="auth-step" data-step="plan" hidden={step !== "plan"}>
        <p className="auth-hint">Вы вошли как <strong>{email}</strong>. <button id="change-account-btn" className="auth-linklike auth-linklike-inline" type="button" onClick={resetAccount}>Другая почта</button></p>
        {lifetimeActive
          ? <div className="banner"><span className="banner-icon"><Icon name="check-circle" /></span><p className="banner-title" id="lifetime-active-note">Premium «Навсегда» уже активирован для этого аккаунта. Оплачивать ничего не нужно.</p></div>
          : (
            <>
              {lifetimeUpgrade ? <div className="banner"><span className="banner-icon"><Icon name="info" /></span><p className="banner-title" id="lifetime-upgrade-note">У вас действует годовой Premium: переход на «Навсегда» стоит {formatRub(planAmount("lifetime", pricing, subscription))} вместо {formatRub(pricing.prices.lifetime)}.</p></div> : null}
              {plan ? null : <p className="auth-hint" id="plan-required-note">Выберите тариф выше, чтобы оплатить.</p>}
              {pending
                ? (
                  <div id="pending-checkout" className="banner pending-checkout">
                    <span className="banner-icon"><Icon name="info" /></span>
                    <div className="banner-copy">
                      <p className="banner-message">Ссылка на оплату {PLAN_ACCUSATIVE[pending.plan]} создана и действует до {formatDeadline(pending)}. Если вы закрыли страницу банка, Premium ещё не активирован: можно вернуться к той же ссылке или создать новую.</p>
                      <button id="open-pending-btn" className="auth-linklike" type="button" disabled={busy} onClick={handleOpenPending}>Открыть страницу оплаты снова</button>
                    </div>
                  </div>
                )
                : null}
              <button id="pay-btn" className="btn btn-outline-premium btn-block" type="button" disabled={plan === null || busy} onClick={handlePayment}>
                <Icon name="crown" />
                {pendingAction === "create-payment" ? "Создаём оплату…" : pendingAction === "open-checkout" ? "Открываем страницу банка…" : "Оплатить"}
              </button>
              <p className="checkout-legal-note">Нажимая «Оплатить», вы принимаете условия <a href="/offer/" target="_blank" rel="noopener">Публичной оферты</a>, подтверждаете, что ознакомились с <a href="/privacy/" target="_blank" rel="noopener">Политикой конфиденциальности</a>, и даёте <a href="/consent/" target="_blank" rel="noopener">согласие на обработку персональных данных</a>.</p>
            </>
          )}
        <ErrorMessage message={planError} />
      </div>
    </>
  );
}
