const bookContents = document.querySelector<HTMLDetailsElement>(
  "[data-book-contents]",
);

if (bookContents) {
  const details = bookContents;
  const compactNav = window.matchMedia("(max-width: 48rem)");
  let userToggledCompactNav = false;

  function syncBookContents(): void {
    if (compactNav.matches) {
      if (!userToggledCompactNav) {
        details.open = false;
      }
      return;
    }

    userToggledCompactNav = false;
    details.open = true;
  }

  details.addEventListener("toggle", () => {
    if (compactNav.matches) {
      userToggledCompactNav = true;
    }
  });

  compactNav.addEventListener("change", syncBookContents);
  syncBookContents();
}
