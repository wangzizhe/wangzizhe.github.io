(function () {
  const storageKey = "theme";
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  let unsavedTheme = null;
  const icons = {
    light:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4" fill="currentColor"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="6.35" y2="6.35"/><line x1="17.65" y1="17.65" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/><line x1="6.35" y1="17.65" x2="4.93" y2="19.07"/><line x1="19.07" y1="4.93" x2="17.65" y2="6.35"/></svg>',
    dark:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>'
  };
  const isEnglish = document.documentElement.lang.toLowerCase().startsWith("en");
  const labels = isEnglish
    ? { light: "Light mode", dark: "Dark mode" }
    : { light: "亮色模式", dark: "暗色模式" };
  const buttons = Array.from(document.querySelectorAll(".theme-switch"), (switcher) => {
    const button = document.createElement("button");
    button.className = "theme-btn";
    button.type = "button";
    button.addEventListener("click", () => {
      const theme = button.dataset.theme;
      writeSavedTheme(theme);
      applyTheme(theme, true);
    });
    switcher.append(button);
    return button;
  });

  function writeSavedTheme(theme) {
    try {
      localStorage.setItem(storageKey, theme);
      unsavedTheme = null;
    } catch (e) {
      unsavedTheme = theme;
    }
  }

  function getSavedTheme() {
    if (unsavedTheme) return unsavedTheme;
    try {
      const saved = localStorage.getItem(storageKey);
      return saved === "light" || saved === "dark" ? saved : null;
    } catch (e) {
      return null;
    }
  }

  function getSystemTheme() {
    return media.matches ? "dark" : "light";
  }

  function applyTheme(theme, animate = false) {
    document.documentElement.setAttribute("data-theme", theme);
    const nextTheme = theme === "dark" ? "light" : "dark";
    buttons.forEach((button) => {
      if (button.dataset.theme === nextTheme) return;
      const previousIcon = animate ? button.querySelector("svg")?.cloneNode(true) : null;
      button.dataset.theme = nextTheme;
      button.setAttribute("aria-label", labels[nextTheme]);
      button.innerHTML = icons[nextTheme];
      if (previousIcon && !window.matchMedia("(prefers-reduced-motion: reduce)").matches && previousIcon.animate) {
        const incomingIcon = button.querySelector("svg");
        previousIcon.classList.add("theme-icon-outgoing");
        previousIcon.setAttribute("aria-hidden", "true");
        button.append(previousIcon);
        const timing = { duration: 200, easing: "ease-out" };
        incomingIcon.animate([
          { transform: "translateY(-120%)", opacity: 0 },
          { transform: "translateY(0)", opacity: 1 }
        ], timing);
        const exit = previousIcon.animate([
          { transform: "translateY(0)", opacity: 1 },
          { transform: "translateY(120%)", opacity: 0 }
        ], timing);
        exit.onfinish = exit.oncancel = () => previousIcon.remove();
      }
    });
  }

  function syncTheme() {
    applyTheme(getSavedTheme() || getSystemTheme());
  }

  if (media.addEventListener) {
    media.addEventListener("change", () => {
      if (!getSavedTheme()) syncTheme();
    });
  } else if (media.addListener) {
    media.addListener(() => {
      if (!getSavedTheme()) syncTheme();
    });
  }

  window.addEventListener("pageshow", (event) => {
    if (event.persisted) syncTheme();
  });

  window.addEventListener("storage", (event) => {
    if (event.key === storageKey || event.key === null) syncTheme();
  });

  syncTheme();
})();
