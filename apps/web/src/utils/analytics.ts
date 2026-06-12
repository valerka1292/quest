export function trackEvent(name: string, data?: Record<string, any>) {
  try {
    if ((window as any).gtag) {
      (window as any).gtag('event', name, data);
    }
  } catch {}
}
