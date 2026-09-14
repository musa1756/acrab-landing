import { useRef, useState, type ReactElement } from "react";
import { createPayment, loadPrices, PaymentApiError, requestOtp, verifyOtp } from "./payment-api";
import { createPaymentErrorMessage, sendCodeErrorMessage, verifyCodeErrorMessage } from "./payment-messages";
import { DEFAULT_PRICES, formatRub, type PaymentStep, type Plan, type Prices } from "./payment-model";

// A meta CSP cannot express frame-ancestors. This guard runs as soon as the
// payment island is evaluated and prevents checkout controls in a hostile frame.
if (typeof window !== "undefined" && window.top !== window.self) {
  window.top!.location.href = window.self.location.href;
}

type PendingAction = "send-code" | "verify-code" | "create-payment" | null;

function ErrorMessage({ message }: { message: string }): ReactElement {
  return <p className="auth-error" role="alert" hidden={!message}>{message}</p>;
}

export default function PaymentFlow(): ReactElement {
  const [step, setStep] = useState<PaymentStep>("email");
  const [email, setEmail] = useState("");
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [prices, setPrices] = useState<Prices>(DEFAULT_PRICES);
  const [personalDataConsent, setPersonalDataConsent] = useState(false);
  const [offerConsent, setOfferConsent] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [emailError, setEmailError] = useState("");
  const [codeError, setCodeError] = useState("");
  const [planError, setPlanError] = useState("");
  const emailInputRef = useRef<HTMLInputElement>(null);
  const codeInputRef = useRef<HTMLInputElement>(null);

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

  function handleChangeEmail(): void {
    setStep("email");
    setCodeError("");
    setAccessToken(null);
    setPlan(null);
    setPlanError("");
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
      setAccessToken(result.access_token);
      setStep("plan");
      setPrices(await loadPrices());
    } catch (error) {
      setCodeError(verifyCodeErrorMessage(error));
    } finally {
      setPendingAction(null);
    }
  }

  async function handlePayment(): Promise<void> {
    setPlanError("");
    if (!plan || !accessToken) return;
    if (!offerConsent) {
      setPlanError("Перед оплатой ознакомьтесь и примите условия публичной оферты.");
      return;
    }

    setPendingAction("create-payment");
    try {
      const paymentLink = await createPayment(accessToken, plan);
      setStep("redirect");
      window.location.href = paymentLink;
    } catch {
      setPlanError(createPaymentErrorMessage());
      setPendingAction(null);
    }
  }

  return (
    <>
      <div id="step-email" className="auth-step" data-step="email" hidden={step !== "email"}>
        <label className="auth-label" htmlFor="email-input">Почта аккаунта Acrab</label>
        <input ref={emailInputRef} id="email-input" className="auth-input" type="email" inputMode="email" autoComplete="email" placeholder="you@example.com" required value={email} onChange={(event) => setEmail(event.currentTarget.value)} />
        <label className="legal-consent">
          <input id="personal-data-consent" type="checkbox" checked={personalDataConsent} onChange={(event) => setPersonalDataConsent(event.currentTarget.checked)} />
          <span>Даю <a href="/consent" target="_blank" rel="noopener">согласие на обработку персональных данных</a> для входа и оформления Premium.</span>
        </label>
        <button id="send-code-btn" className="button button-primary auth-submit" type="button" disabled={pendingAction !== null} onClick={handleSendCode}>Получить код</button>
        <ErrorMessage message={emailError} />
      </div>

      <div id="step-code" className="auth-step" data-step="code" hidden={step !== "code"}>
        <p className="auth-hint">Код отправлен на <strong>{email}</strong>.</p>
        <label className="auth-label" htmlFor="code-input">Код из письма</label>
        <input ref={codeInputRef} id="code-input" className="auth-input" type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6} autoComplete="one-time-code" placeholder="000000" required />
        <button id="verify-code-btn" className="button button-primary auth-submit" type="button" disabled={pendingAction !== null} onClick={handleVerifyCode}>Подтвердить</button>
        <button id="change-email-btn" className="auth-linklike" type="button" onClick={handleChangeEmail}>Изменить почту</button>
        <ErrorMessage message={codeError} />
      </div>

      <div id="step-plan" className="auth-step" data-step="plan" hidden={step !== "plan"}>
        <p className="auth-hint">Вы вошли как <strong>{email}</strong>.</p>
        <div className="plan-picker" role="group" aria-label="Выбор тарифа">
          <button className={`plan-option${plan === "annual" ? " is-selected" : ""}`} type="button" data-plan="annual" aria-pressed={plan === "annual"} onClick={() => setPlan("annual")}>
            <span className="plan-option-top"><span>Год</span><span className="plan-option-badge">Выгоднее</span></span>
            <span className="plan-option-price" id="price-annual">{formatRub(prices.annual)}</span>
            <span className="plan-option-note">за год</span>
          </button>
          <button className={`plan-option${plan === "monthly" ? " is-selected" : ""}`} type="button" data-plan="monthly" aria-pressed={plan === "monthly"} onClick={() => setPlan("monthly")}>
            <span className="plan-option-top"><span>Месяц</span></span>
            <span className="plan-option-price" id="price-monthly">{formatRub(prices.monthly)}</span>
            <span className="plan-option-note">в месяц</span>
          </button>
        </div>
        <label className="legal-consent">
          <input id="offer-consent" type="checkbox" checked={offerConsent} onChange={(event) => setOfferConsent(event.currentTarget.checked)} />
          <span>Я ознакомился и принимаю условия <a href="/offer" target="_blank" rel="noopener">публичной оферты</a>.</span>
        </label>
        <button id="pay-btn" className="button button-primary auth-submit" type="button" disabled={plan === null || pendingAction !== null} onClick={handlePayment}>Оплатить</button>
        <p className="checkout-legal-note">Переходя к оплате, вы принимаете условия <a href="/offer" target="_blank" rel="noopener">Публичной оферты</a> и подтверждаете, что ознакомились с <a href="/privacy" target="_blank" rel="noopener">Политикой конфиденциальности</a>.</p>
        <ErrorMessage message={planError} />
      </div>

      <div id="step-redirect" className="auth-step" data-step="redirect" hidden={step !== "redirect"}>
        <p className="auth-hint">Открываем защищённую страницу оплаты «Точки»…</p>
      </div>
    </>
  );
}
