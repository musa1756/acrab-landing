import { useEffect, useRef, useState, type ReactElement } from "react";
import { createPayment, loadPricing, loadSubscription, PaymentApiError, requestOtp, verifyOtp } from "./payment-api";
import { createPaymentErrorMessage, sendCodeErrorMessage, verifyCodeErrorMessage } from "./payment-messages";
import { DEFAULT_PRICING, formatRub, hasActiveAnnualPremium, isActiveLifetimePremium, isPendingCheckoutActive, pendingCheckoutDeadline, planAmount, PLAN_ORDER, sessionExpiry, type PaymentStep, type PendingCheckout, type Plan, type Pricing, type SubscriptionRow } from "./payment-model";
import { clearCheckoutSession, clearPendingCheckout, readCheckoutSession, readPendingCheckout, writeCheckoutSession, writePendingCheckout } from "./payment-storage";

// A meta CSP cannot express frame-ancestors. This guard runs as soon as the
// payment island is evaluated and prevents checkout controls in a hostile frame.
if (typeof window !== "undefined" && window.top !== window.self) {
  window.top!.location.href = window.self.location.href;
}

type PendingAction = "send-code" | "verify-code" | "create-payment" | "open-checkout" | null;

const PLAN_TITLE: Record<Plan, string> = { annual: "Год", monthly: "Месяц", lifetime: "Навсегда" };
const PLAN_NOTE: Record<Plan, string> = { annual: "за год", monthly: "в месяц", lifetime: "разовый платёж" };
const PLAN_ACCUSATIVE: Record<Plan, string> = { annual: "«Год»", monthly: "«Месяц»", lifetime: "«Навсегда»" };

function ErrorMessage({ message }: { message: string }): ReactElement {
  return <p className="auth-error" role="alert" hidden={!message}>{message}</p>;
}

function formatDeadline(pending: PendingCheckout): string {
  return new Date(pendingCheckoutDeadline(pending)).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

export default function PaymentFlow(): ReactElement {
  const [step, setStep] = useState<PaymentStep>("email");
  const [email, setEmail] = useState("");
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [pricing, setPricing] = useState<Pricing>(DEFAULT_PRICING);
  const [subscription, setSubscription] = useState<SubscriptionRow | null>(null);
  const [pending, setPending] = useState<PendingCheckout | null>(null);
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
  const lifetimeUpgrade = hasActiveAnnualPremium(subscription) &&
    planAmount("lifetime", pricing, subscription) < pricing.prices.lifetime;

  async function loadAccount(token: string): Promise<void> {
    const [nextPricing, nextSubscription] = await Promise.all([loadPricing(), loadSubscription(token)]);
    setPricing(nextPricing);
    setSubscription(nextSubscription);
  }

  // Вернувшись со страницы банка, человек сразу видит тарифы: вход и ссылка
  // «Точки» пережили переход в sessionStorage. Как в приложении, оплату можно
  // создавать заново сколько угодно раз; прошлая ссылка остаётся доступной,
  // пока не истекла. Возврат через bfcache восстанавливает страницу вместе с
  // занятой кнопкой — pageshow её отпускает.
  useEffect(() => {
    const session = readCheckoutSession();
    if (session) {
      setEmail(session.email);
      setAccessToken(session.accessToken);
      setStep("plan");
      void loadAccount(session.accessToken);
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
    setPlan(null);
    setPlanError("");
    setCodeError("");
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
      await loadAccount(token);
    } catch (error) {
      setCodeError(verifyCodeErrorMessage(error));
    } finally {
      setPendingAction(null);
    }
  }

  function openCheckout(link: string): void {
    setPendingAction("open-checkout");
    window.location.assign(link);
  }

  async function handlePayment(): Promise<void> {
    setPlanError("");
    if (!plan || !accessToken) return;

    setPendingAction("create-payment");
    try {
      const created = await createPayment(accessToken, plan);
      const nextPending: PendingCheckout = { plan, paymentLink: created.paymentLink, createdAt: Date.now(), expiresAt: created.expiresAt };
      writePendingCheckout(nextPending);
      setPending(nextPending);
      openCheckout(created.paymentLink);
    } catch (error) {
      const message = createPaymentErrorMessage(error);
      setPendingAction(null);
      if (error instanceof PaymentApiError && error.status === 401) {
        // Токен входа истёк: назад к почте, как просит текст ошибки.
        resetAccount();
        setEmailError(message);
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
    openCheckout(pending.paymentLink);
  }

  const busy = pendingAction !== null;

  return (
    <>
      <div id="step-email" className="auth-step" data-step="email" hidden={step !== "email"}>
        <label className="auth-label" htmlFor="email-input">Почта аккаунта Acrab</label>
        <input ref={emailInputRef} id="email-input" className="auth-input" type="email" inputMode="email" autoComplete="email" placeholder="you@example.com" required value={email} onChange={(event) => setEmail(event.currentTarget.value)} />
        <label className="legal-consent">
          <input id="personal-data-consent" type="checkbox" checked={personalDataConsent} onChange={(event) => setPersonalDataConsent(event.currentTarget.checked)} />
          <span>Даю <a href="/consent" target="_blank" rel="noopener">согласие на обработку персональных данных</a> для входа и оформления Premium.</span>
        </label>
        <button id="send-code-btn" className="button button-primary auth-submit" type="button" disabled={busy} onClick={handleSendCode}>Получить код</button>
        <ErrorMessage message={emailError} />
      </div>

      <div id="step-code" className="auth-step" data-step="code" hidden={step !== "code"}>
        <p className="auth-hint">Код отправлен на <strong>{email}</strong>.</p>
        <label className="auth-label" htmlFor="code-input">Код из письма</label>
        <input ref={codeInputRef} id="code-input" className="auth-input" type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6} autoComplete="one-time-code" placeholder="000000" required />
        <button id="verify-code-btn" className="button button-primary auth-submit" type="button" disabled={busy} onClick={handleVerifyCode}>Подтвердить</button>
        <button id="change-email-btn" className="auth-linklike" type="button" onClick={resetAccount}>Изменить почту</button>
        <ErrorMessage message={codeError} />
      </div>

      <div id="step-plan" className="auth-step" data-step="plan" hidden={step !== "plan"}>
        <p className="auth-hint">Вы вошли как <strong>{email}</strong>. <button id="change-account-btn" className="auth-linklike auth-linklike-inline" type="button" onClick={resetAccount}>Другая почта</button></p>
        {lifetimeActive
          ? <p className="auth-hint" id="lifetime-active-note">Premium «Навсегда» уже активирован для этого аккаунта. Оплачивать ничего не нужно.</p>
          : (
            <>
              {lifetimeUpgrade ? <p className="auth-hint" id="lifetime-upgrade-note">У вас действует годовой Premium: переход на «Навсегда» стоит {formatRub(planAmount("lifetime", pricing, subscription))} вместо {formatRub(pricing.prices.lifetime)}.</p> : null}
              <div className="plan-picker" role="group" aria-label="Выбор тарифа">
                {PLAN_ORDER.map((option) => (
                  <button key={option} className={`plan-option${plan === option ? " is-selected" : ""}`} type="button" data-plan={option} aria-pressed={plan === option} onClick={() => setPlan(option)}>
                    <span className="plan-option-top">
                      <span>{PLAN_TITLE[option]}</span>
                      {option === "annual" ? <span className="plan-option-badge">Выгоднее</span> : null}
                    </span>
                    <span className="plan-option-price" id={`price-${option}`}>{formatRub(planAmount(option, pricing, subscription))}</span>
                    <span className="plan-option-note">{option === "lifetime" && lifetimeUpgrade ? "переход с года" : PLAN_NOTE[option]}</span>
                  </button>
                ))}
              </div>
              {pending
                ? (
                  <div id="pending-checkout" className="pending-checkout">
                    <p className="auth-hint">Ссылка на оплату {PLAN_ACCUSATIVE[pending.plan]} создана и действует до {formatDeadline(pending)}. Если вы закрыли страницу банка, Premium ещё не активирован: можно вернуться к той же ссылке или создать новую.</p>
                    <button id="open-pending-btn" className="auth-linklike" type="button" disabled={busy} onClick={handleOpenPending}>Открыть страницу оплаты снова</button>
                  </div>
                )
                : null}
              <button id="pay-btn" className="button button-primary auth-submit" type="button" disabled={plan === null || busy} onClick={handlePayment}>
                {pendingAction === "create-payment" ? "Создаём оплату…" : pendingAction === "open-checkout" ? "Открываем страницу банка…" : "Оплатить"}
              </button>
              <p className="checkout-legal-note">Нажимая «Оплатить», вы принимаете условия <a href="/offer" target="_blank" rel="noopener">Публичной оферты</a>, подтверждаете, что ознакомились с <a href="/privacy" target="_blank" rel="noopener">Политикой конфиденциальности</a>, и даёте <a href="/consent" target="_blank" rel="noopener">согласие на обработку персональных данных</a>.</p>
            </>
          )}
        <ErrorMessage message={planError} />
      </div>
    </>
  );
}
