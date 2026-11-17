// Text utilities. Every split keeps the readable string on an aria-label (set in the
// markup) and only ever touches nodes that are aria-hidden, so assistive tech reads words,
// not letters.

/** Wrap each `.line` so the inner span can slide inside the line's clip. */
export function wrapLines(root) {
  const lines = [...root.querySelectorAll('.line')];
  return lines.map(line => {
    if (line.firstElementChild?.classList.contains('line__in') && line.childNodes.length === 1) return line.firstElementChild;
    const inner = document.createElement('span');
    inner.className = 'line__in';
    while (line.firstChild) inner.appendChild(line.firstChild);
    line.appendChild(inner);
    return inner;
  });
}

/** Replace text nodes inside `root` with one inline-block span per character. */
export function splitChars(root, cls = 'ch') {
  const out = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    if (!node.nodeValue.trim() && !node.nodeValue.includes(' ')) continue;
    const frag = document.createDocumentFragment();
    const glyphs = [...node.nodeValue];
    glyphs.forEach((ch, at) => {
      const s = document.createElement('span');
      s.className = ch === ' ' || ch === '\u00a0' ? `${cls} ${cls}--sp` : cls;
      s.textContent = ch === ' ' ? ' ' : ch;
      s.style.setProperty('--i', out.length);
      out.push(s);
      frag.appendChild(s);
    });
    node.parentNode.replaceChild(frag, node);
  }
  return out;
}

/** Letter-roll hover: one span per glyph, the duplicate is a text-shadow (see .roll in CSS). */
export function initRoll(root = document) {
  root.querySelectorAll('.roll').forEach(el => {
    if (el.dataset.rolled) return;
    el.dataset.rolled = '1';
    const text = el.textContent;
    const host = el.closest('a, button');
    // Glyph spans are aria-hidden, so the word has to survive somewhere: on the host's
    // aria-label when the roll is its only content, otherwise as visually-hidden text.
    let needsCopy = true;
    if (host?.hasAttribute('aria-label')) needsCopy = false;
    else if (host && host.textContent.trim() === text.trim()) {
      host.setAttribute('aria-label', text.trim());
      needsCopy = false;
    }
    el.textContent = '';
    [...text].forEach((ch, i) => {
      const c = document.createElement('span');
      c.className = ch === ' ' ? 'roll__c roll__c--sp' : 'roll__c';
      c.setAttribute('aria-hidden', 'true');
      c.style.setProperty('--i', i);
      const inner = document.createElement('i');
      inner.textContent = ch === ' ' ? ' ' : ch;
      c.appendChild(inner);
      el.appendChild(c);
    });
    if (needsCopy) {
      const sr = document.createElement('span');
      sr.className = 'sr-only';
      sr.textContent = text;
      el.appendChild(sr);
    }
  });
}
