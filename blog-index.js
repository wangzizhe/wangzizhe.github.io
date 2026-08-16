(function () {
  const heroText = document.querySelector('.hero-text[data-i18n="heroText"]');
  if (!heroText || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const text = heroText.textContent.trim();
  let timeout = null;

  function typeWriter(index = 0) {
    if (index >= text.length) {
      heroText.classList.remove("typing");
      timeout = null;
      return;
    }

    heroText.textContent += text.charAt(index);
    timeout = window.setTimeout(() => typeWriter(index + 1), 20);
  }

  heroText.textContent = "";
  heroText.classList.add("typing");
  timeout = window.setTimeout(typeWriter, 350);

  window.addEventListener("pagehide", () => {
    if (timeout) window.clearTimeout(timeout);
  }, { once: true });
})();
