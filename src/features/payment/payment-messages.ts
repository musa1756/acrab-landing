import { asPaymentApiError } from "./payment-api";

export function sendCodeErrorMessage(error: unknown): string {
  const apiError = asPaymentApiError(error);
  if (apiError.code === "otp_disabled" || apiError.status === 422) {
    return "Аккаунта Acrab с такой почтой нет. Проверьте адрес или сначала заведите аккаунт в приложении.";
  }
  if (apiError.status === 429) return "Слишком много запросов подряд. Подождите минуту и попробуйте ещё раз.";
  if (apiError.status && apiError.status >= 500) {
    return "Отправка писем сейчас недоступна на нашей стороне — почта тут ни при чём. Попробуйте позже или напишите в поддержку на странице Q/A.";
  }
  if (apiError.status === 400) return "Проверьте, что адрес введён без опечаток и лишних пробелов.";
  return "Не получилось отправить код. Проверьте связь и попробуйте ещё раз.";
}

export function verifyCodeErrorMessage(error: unknown): string {
  const apiError = asPaymentApiError(error);
  if (!apiError.status) return "Не удалось связаться с сервером. Проверьте связь и попробуйте ещё раз.";
  if (apiError.status === 429) return "Слишком много попыток. Подождите минуту и попробуйте ещё раз.";
  if (apiError.status >= 500) {
    return "Проверка кода сейчас недоступна на нашей стороне. Попробуйте позже или напишите в поддержку на странице Q/A.";
  }
  return "Код неверный или истёк. Проверьте письмо и попробуйте снова.";
}

export function createPaymentErrorMessage(): string {
  return "Не получилось создать оплату. Попробуйте ещё раз через минуту или напишите в поддержку.";
}
