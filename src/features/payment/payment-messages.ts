import { asPaymentApiError } from "./payment-api";
import type { PromoCodeStatus } from "./payment-model";

const PROMO_REJECTION_MESSAGES: Record<Exclude<PromoCodeStatus, "ok">, string> = {
  invalid: "Такого промокода нет. Проверьте код.",
  expired: "Срок действия этого промокода истёк или лимит исчерпан.",
  own: "Этот промокод нельзя применить: он ваш или на этом телефоне уже входили в аккаунт его владельца.",
  not_eligible: "У вас уже был Premium, а промокод действует только на первую покупку.",
};

export function promoCodeErrorMessage(status: Exclude<PromoCodeStatus, "ok">): string {
  return PROMO_REJECTION_MESSAGES[status];
}

export function checkPromoErrorMessage(error: unknown): string {
  const apiError = asPaymentApiError(error);
  if (!apiError.status) return "Не удалось проверить промокод. Проверьте связь и попробуйте ещё раз.";
  if (apiError.status === 429) return "Слишком много проверок подряд. Подождите минуту и попробуйте ещё раз.";
  if (/[\u0400-\u04FF]/.test(apiError.message)) return apiError.message;
  return "Не удалось проверить промокод. Попробуйте ещё раз через минуту.";
}

export function sendCodeErrorMessage(error: unknown): string {
  const apiError = asPaymentApiError(error);
  if (apiError.code === "otp_disabled" || apiError.status === 422) {
    return "Аккаунта Acrab с такой почтой нет. Проверьте адрес или сначала создайте аккаунт в приложении.";
  }
  if (apiError.status === 429) return "Слишком много запросов подряд. Подождите минуту и попробуйте ещё раз.";
  if (apiError.status && apiError.status >= 500) {
    return "Не можем отправить письмо: сбой на нашей стороне, ваша почта ни при чём. Попробуйте позже или напишите в поддержку, контакты есть на странице «Помощь».";
  }
  if (apiError.status === 400) return "Проверьте, что адрес введён без опечаток и лишних пробелов.";
  return "Не получилось отправить код. Проверьте связь и попробуйте ещё раз.";
}

export function verifyCodeErrorMessage(error: unknown): string {
  const apiError = asPaymentApiError(error);
  if (!apiError.status) return "Не удалось связаться с сервером. Проверьте связь и попробуйте ещё раз.";
  if (apiError.status === 429) return "Слишком много попыток. Подождите минуту и попробуйте ещё раз.";
  if (apiError.status >= 500) {
    return "Не можем проверить код: сбой на нашей стороне. Попробуйте позже или напишите в поддержку, контакты есть на странице «Помощь».";
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
