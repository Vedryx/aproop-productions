// Multiple dialogs may overlap. Only the last release restores the prior style.
let count = 0;
let previous = "";
export function lockBodyScroll() {
  if (count++ === 0) {
    previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  let released = false;
  return () => {
    if (released) return;
    released = true;
    if (--count === 0) document.body.style.overflow = previous;
  };
}
