(function () {
  const storageKey = "theme";
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const icons = {
    light:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="6.35" y2="6.35"/><line x1="17.65" y1="17.65" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/><line x1="6.35" y1="17.65" x2="4.93" y2="19.07"/><line x1="19.07" y1="4.93" x2="17.65" y2="6.35"/></svg>',
    dark:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>'
  };

  function readSavedTheme() {
    try {
      return localStorage.getItem(storageKey);
    } catch (e) {
      return null;
    }
  }

  function writeSavedTheme(theme) {
    try {
      localStorage.setItem(storageKey, theme);
    } catch (e) {
      // Keep the UI usable when storage is unavailable.
    }
  }

  function getSavedTheme() {
    const saved = readSavedTheme();
    return saved === "light" || saved === "dark" ? saved : null;
  }

  function getSystemTheme() {
    return media.matches ? "dark" : "light";
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    document.querySelectorAll(".theme-btn").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.theme === theme);
    });
  }

  function renderThemeButtons() {
    const isEnglish = document.documentElement.lang.toLowerCase().startsWith("en");
    const labels = isEnglish
      ? { light: "Light mode", dark: "Dark mode" }
      : { light: "亮色模式", dark: "暗色模式" };

    document.querySelectorAll(".theme-switch").forEach((switcher) => {
      if (switcher.querySelector(".theme-btn")) return;

      ["light", "dark"].forEach((theme) => {
        const button = document.createElement("button");
        button.className = "theme-btn";
        button.dataset.theme = theme;
        button.type = "button";
        button.setAttribute("aria-label", labels[theme]);
        button.innerHTML = icons[theme];
        switcher.append(button);
      });
    });
  }

  function syncTheme() {
    applyTheme(getSavedTheme() || getSystemTheme());
  }

  function initThemeButtons() {
    document.querySelectorAll(".theme-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const theme = btn.dataset.theme;
        if (theme !== "light" && theme !== "dark") return;
        writeSavedTheme(theme);
        applyTheme(theme);
      });
    });
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

  renderThemeButtons();
  syncTheme();
  initThemeButtons();
})();
