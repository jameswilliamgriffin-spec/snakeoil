// ─────────────────────────────────────────────────────────────────────────────
// Display kerning: extra space added after the FIRST letter of a pair, in em.
// The global tracking (-0.08em) is untouched; these only open pairs that fuse.
//
// Keys match the rendered text, so uppercase pairs ("HE") work with
// text-transform: uppercase. Add lowercase keys ("il") for lowercase display text.
// Later entries win, so tweak a single pair by adding it at the bottom.
//
// Numbers come from scripts/kerning-audit.mjs, which measures the ink gap of every
// pair at -0.08em straight from the font outlines:
//   node scripts/kerning-audit.mjs            all pairs in the site's display copy
//   node scripts/kerning-audit.mjs HE LL      specific pairs
// ─────────────────────────────────────────────────────────────────────────────

/** Every combination of the letters in `lefts` and `rights`, set to `em`. */
const pairs = (lefts, rights, em) => Object.fromEntries([...lefts].flatMap(a => [...rights].map(b => [a + b, em])));

// Letters by the shape of the side that faces the neighbour.
const STEM_RIGHT = 'HIMNU'; // flat vertical stem on the right
const STEM_LEFT = 'BDEFHIKLMNPR'; // flat vertical stem on the left

export const KERNING = {
  // Stem against stem (H|E, I|L, N|K, M|E…). They touch along the full cap height
  // and read as one block. Measured overlap -0.010em → about +0.02em of air.
  ...pairs(STEM_RIGHT, STEM_LEFT, 0.03),

  // E's arms against a stem (E|L, E|N, E|R…). Touch along 40% of the height.
  ...pairs('E', STEM_LEFT, 0.03),

  // L's foot runs into the next stem (L|L, L|I, L|E…). Overlap -0.029em.
  ...pairs('L', STEM_LEFT, 0.04),

  // T's bar / F's arm runs into the next stem (T|H, T|E, F|I, F|F…). Overlap -0.033em.
  ...pairs('TF', STEM_LEFT, 0.035),
  // …and a stem runs into T's bar from the left (I|T, N|T, H|T…).
  ...pairs(STEM_RIGHT + 'E', 'T', 0.035),

  // R and K kick their leg into the next stem (R|I, R|E, K|E…). Overlap -0.047em at the foot.
  ...pairs('RK', STEM_LEFT, 0.03),

  // A's feet against a stem, either side (A|K, A|N, N|A…). Overlap -0.040em at the foot.
  ...pairs('A', STEM_LEFT, 0.02),
  ...pairs(STEM_RIGHT, 'A', 0.02),

  // V/W's top corners against a stem (V|E, W|H…). Overlap -0.040em.
  ...pairs('VW', STEM_LEFT, 0.02),

  // One-offs seen in the site's own copy.
  FT: 0.06, // AFTER, SHIFT: F's arm and T's bar sit at the same height and merge into one bar (-0.055em)
  RT: 0.02, // BARTENDER: R's leg tucks under T's bar
  LA: 0.035, // LAST: L's foot slides under A
  LO: 0.015, // HELLO: L's foot nearly meets the O
  'O@': 0.025, // HELLO@: @ overlaps the O
  '@S': 0.035, // @SNAKEOIL: @ overlaps the S
};

// Which elements get kerned: the tight display styles only, never body copy.
export const KERNING_TARGETS = ['.display', '.fit', '.drink__name', '.swap__name', '.menu__word', '.stack--lg'];
