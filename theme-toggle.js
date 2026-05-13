(function () {
  const storageKey = "theme";
  const media = window.matchMedia("(prefers-color-scheme: dark)");

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

  syncTheme();
  initThemeButtons();
})();
