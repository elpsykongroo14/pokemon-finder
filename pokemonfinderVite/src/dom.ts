//shared, null safe DOM lookup helpers.
//pulled out of comparemode.ts once favorites.ts and team.ts needed the exact same logic
//
//both helpers turn a silent `null` (the honest answer typescript's DOM gives, since it cant see index.html) into a loud failure
//at module load time rather than a confusing crash the first time a user clicks a button that was never found.

export function requireElement<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) {
    throw new Error(`Expected element #${id} to exist in the DOM`);
  }
  return el as T;
}

export function requireQuery<T extends HTMLElement>(
  selector: string,
  root: ParentNode = document,
): T {
  const el = root.querySelector<T>(selector);
  if (!el) {
    throw new Error(`Expected ${selector} to exist in the DOM`);
  }
  return el;
}
