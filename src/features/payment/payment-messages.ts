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

// Сервер возвращает разные причины отказа: истёкшая сессия, отклонение
// «Точки», уже активный Premium «Навсегда». Пока страница показывала на все
// случаи один текст, отличить сбой эквайринга от ошибки ученика было нельзя.
// Русский текст сервера показываем как есть — так же, как приложение;
// внутренние английские сообщения заменяем общим текстом со статусом ответа.
export function createPaymentErrorMessage(error: unknown): string {
  const apiError = asPaymentApiError(error);
  if (!apiError.status) return "Платёжный сервис временно недоступен. Проверьте связь и попробуйте ещё раз.";
  if (apiError.status === 401) return "Сессия входа истекла. Запросите код на почту ещё раз.";
  if (/[\u0400-\u04FF]/.test(apiError.message)) return apiError.message;
  if (apiError.status === 429) return "Слишком много попыток подряд. Подождите минуту и попробуйте ещё раз.";
  return `Не получилось создать оплату (ошибка ${apiError.status}). Попробуйте ещё раз через минуту или напишите в поддержку.`;
}
