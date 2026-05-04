const SESSION_INVALID_EVENT = "epatri:session-invalid";

export function emitSessionInvalid() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(SESSION_INVALID_EVENT));
  }
}

export function getSessionInvalidEventName() {
  return SESSION_INVALID_EVENT;
}
