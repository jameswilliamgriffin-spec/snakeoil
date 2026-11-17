// Targeted per-pair kerning for the display type (table in src/kerning.config.js).
//
// It walks each target element in reading order and treats every glyph as a unit:
//   • a letter inside plain text, or
//   • a per-letter span the animations already made (.ch from the reveals, .roll__c from the
//     letter-roll hover).
// When two neighbouring glyphs on the same line form a pair in the table, the FIRST glyph gets
// margin-right in em, so the gap scales with the type. A plain-text letter is wrapped in an
// inline <span class="kern">; an existing letter span just gets the margin. Nothing else moves,
// and the global tracking is never touched.
//
// Accessibility: every target heading already carries its readable text on an aria-label or in
// visually hidden copy, with the visible letters aria-hidden. Where a target has no such label,
// the wrap is a bare inline span inside the word, so the text, selection, copy and line wrapping
// are unchanged.

const GLYPH = '.ch, .roll__c';
const SKIP = '.sr-only, .fraktur, [data-kern-skip], script, style';

const caseOf = new WeakMap();
function render(ch, el) {
  let tt = caseOf.get(el);
  if (tt === undefined) {
    tt = getComputedStyle(el).textTransform;
    caseOf.set(el, tt);
  }
  return tt === 'uppercase' ? ch.toUpperCase() : tt === 'lowercase' ? ch.toLowerCase() : ch;
}

// Glyphs only pair when they share a line: the nearest block-level ancestor.
function lineOf(el, root) {
  for (let n = el; n && n !== root; n = n.parentElement) {
    if (n.matches(GLYPH)) continue;
    const d = getComputedStyle(n).display;
    if (!d.startsWith('inline') && d !== 'contents') return n;
  }
  return root;
}

function units(root) {
  const out = [];
  const walk = node => {
    for (const child of node.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        const parent = child.parentElement;
        const line = lineOf(parent, root);
        [...child.nodeValue].forEach((ch, i) => out.push({ text: child, i, char: render(ch, parent), line }));
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        if (child.matches(SKIP)) {
          out.push(null); // a skipped run breaks the sequence
        } else if (child.matches(GLYPH)) {
          out.push({ el: child, char: render(child.textContent, child), line: lineOf(child, root) });
        } else if (child.tagName === 'BR') {
          out.push(null);
        } else {
          walk(child);
        }
      }
    }
  };
  walk(root);
  return out;
}

/** Apply the pair table to one element. Returns how many pairs were adjusted. */
export function kernElement(root, table) {
  if (root.dataset.kerned) return 0;
  root.dataset.kerned = '';
  const seq = units(root);
  const wraps = new Map(); // text node -> Map(index -> em)
  let count = 0;
  for (let k = 0; k < seq.length - 1; k++) {
    const a = seq[k], b = seq[k + 1];
    if (!a || !b || a.line !== b.line) continue;
    const em = table[a.char + b.char];
    if (!em) continue;
    count++;
    if (a.el) {
      a.el.style.marginRight = `${em}em`;
      a.el.classList.add('kern');
    } else {
      if (!wraps.has(a.text)) wraps.set(a.text, new Map());
      wraps.get(a.text).set(a.i, em);
    }
  }
  // rebuild the touched text nodes: plain runs stay text, kerned letters become spans
  for (const [node, marks] of wraps) {
    const chars = [...node.nodeValue];
    const frag = document.createDocumentFragment();
    let run = '';
    chars.forEach((ch, i) => {
      if (!marks.has(i)) return void (run += ch);
      if (run) frag.append(run), (run = '');
      const s = document.createElement('span');
      s.className = 'kern';
      s.style.marginRight = `${marks.get(i)}em`;
      s.textContent = ch;
      frag.append(s);
    });
    if (run) frag.append(run);
    node.replaceWith(frag);
  }
  return count;
}

/** Kern every element matching `selectors`. Run after the text has been split for animation. */
export function applyKerning(table, selectors, scope = document) {
  let total = 0;
  scope.querySelectorAll(selectors.join(',')).forEach(el => {
    // a target nested inside another target is handled by the outer one
    if (el.parentElement?.closest(selectors.join(','))) return;
    total += kernElement(el, table);
  });
  return total;
}
