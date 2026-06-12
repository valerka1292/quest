export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  ...children: (string | HTMLElement)[]
): HTMLElementTagNameMap[K] {
  const elem = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    elem.setAttribute(k, v);
  }
  for (const child of children) {
    if (typeof child === 'string') {
      elem.appendChild(document.createTextNode(child));
    } else {
      elem.appendChild(child);
    }
  }
  return elem;
}

export function div(attrs: Record<string, string> = {}, ...children: (string | HTMLElement)[]): HTMLDivElement {
  return el('div', attrs, ...children);
}

export function span(attrs: Record<string, string> = {}, ...children: (string | HTMLElement)[]): HTMLSpanElement {
  return el('span', attrs, ...children);
}

export function img(src: string, alt: string, attrs: Record<string, string> = {}): HTMLImageElement {
  return el('img', { src, alt, ...attrs });
}

export function a(href: string, attrs: Record<string, string> = {}, ...children: (string | HTMLElement)[]): HTMLAnchorElement {
  return el('a', { href, 'data-link': href, ...attrs }, ...children);
}
