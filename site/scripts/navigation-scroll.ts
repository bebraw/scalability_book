/** Reveal a link within its own list without moving the reading position. */
export function keepLinkInView(link: HTMLElement, list: HTMLElement) {
  if (list.clientHeight === 0 || list.scrollHeight <= list.clientHeight) return;
  const bounds = link.getBoundingClientRect();
  const top = list.getBoundingClientRect().top + list.clientTop;
  const bottom = top + list.clientHeight;
  if (bounds.top < top) list.scrollTop += bounds.top - top;
  else if (bounds.bottom > bottom) list.scrollTop += bounds.bottom - bottom;
}
