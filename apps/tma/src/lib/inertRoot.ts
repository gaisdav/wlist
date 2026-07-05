/**
 * Reference-counted `inert` toggling for the app root (`#root`).
 *
 * Modal overlays (BottomSheet, PhotoLightbox, ...) render via a portal onto
 * `document.body`, as siblings of `#root`, so marking `#root` as `inert`
 * while an overlay is open correctly excludes the overlay itself while
 * blocking assistive tech and stray Tab presses from reaching the page
 * behind it.
 *
 * Two overlays can be open at once (e.g. a BottomSheet stacked on top of
 * another). A plain boolean would let the first overlay to close remove
 * `inert` while the second is still open, so this keeps a counter and only
 * flips the actual attribute on the 0↔1 transitions.
 */
let inertDepth = 0;

export function pushInertRoot(): void {
  inertDepth += 1;
  if (inertDepth === 1) {
    document.getElementById('root')?.setAttribute('inert', '');
  }
}

export function popInertRoot(): void {
  inertDepth = Math.max(0, inertDepth - 1);
  if (inertDepth === 0) {
    document.getElementById('root')?.removeAttribute('inert');
  }
}
