type LoggedPayload = {
  feature: string;
  input: unknown;
  timestamp: string;
};

const SESSION_LOG_KEY = "golden_analytics_input_log";

declare global {
  interface Window {
    __GOLDEN_ANALYTICS_INPUT_LOG__?: LoggedPayload[];
  }
}

export function logIntelligentComponentInput(
  feature: string,
  input: unknown,
): void {
  const payload: LoggedPayload = {
    feature,
    input,
    timestamp: new Date().toISOString(),
  };

  console.info("INTELLIGENT_COMPONENT_INPUT", payload);

  try {
    const existingRaw = window.sessionStorage.getItem(SESSION_LOG_KEY);
    const existing = existingRaw
      ? (JSON.parse(existingRaw) as LoggedPayload[])
      : [];

    window.sessionStorage.setItem(
      SESSION_LOG_KEY,
      JSON.stringify([...existing, payload]),
    );
  } catch {
    // Console logging above is the minimum governance trail for this POC.
  }

  try {
    if (
      Object.isExtensible(window) ||
      "__GOLDEN_ANALYTICS_INPUT_LOG__" in window
    ) {
      window.__GOLDEN_ANALYTICS_INPUT_LOG__ = [
        ...(window.__GOLDEN_ANALYTICS_INPUT_LOG__ ?? []),
        payload,
      ];
    }
  } catch {
    // Some browser automation contexts expose a non-extensible window proxy.
  }
}
