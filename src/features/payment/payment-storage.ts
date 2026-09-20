import { decodeCheckoutSession, decodePendingCheckout, type CheckoutSession, type PendingCheckout } from "./payment-model";

// sessionStorage живёт только в этой вкладке и очищается с её закрытием:
// достаточно, чтобы пережить переход на страницу банка и обратно, и не
// оставляет токен входа в браузере надолго. Любой отказ хранилища (приватный
// режим, запрет site data) молча превращается в «ничего не сохранено».
const SESSION_KEY = "acrab.checkout.session";
const PENDING_KEY = "acrab.checkout.pending";

function read(key: string): unknown {
  try {
    const raw = window.sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) as unknown : null;
  } catch { return null; }
}

function write(key: string, value: unknown): void {
  try { window.sessionStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable */ }
}

function remove(key: string): void {
  try { window.sessionStorage.removeItem(key); } catch { /* storage unavailable */ }
}

export function readCheckoutSession(): CheckoutSession | null {
  const session = decodeCheckoutSession(read(SESSION_KEY));
  if (!session) remove(SESSION_KEY);
  return session;
}
export function writeCheckoutSession(session: CheckoutSession): void { write(SESSION_KEY, session); }
export function clearCheckoutSession(): void { remove(SESSION_KEY); }

export function readPendingCheckout(): PendingCheckout | null {
  const pending = decodePendingCheckout(read(PENDING_KEY));
  if (!pending) remove(PENDING_KEY);
  return pending;
}
export function writePendingCheckout(pending: PendingCheckout): void { write(PENDING_KEY, pending); }
export function clearPendingCheckout(): void { remove(PENDING_KEY); }
