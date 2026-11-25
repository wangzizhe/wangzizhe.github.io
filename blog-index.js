(function () {
  const heroText = document.querySelector(".hero-text");
  if (!heroText || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const copy = heroText.querySelector(".hero-copy");
  const typingText = heroText.querySelector(".hero-typing");
  if (!copy || !typingText) return;

  const text = copy.textContent;
  let timeout = null;

  function finishTyping() {
    if (timeout !== null) window.clearTimeout(timeout);
    timeout = null;
    heroText.classList.remove("typing");
    typingText.textContent = "";
  }

  function typeWriter(index = 0) {
    if (index >= text.length) return finishTyping();
    typingText.textContent += text.charAt(index);
    timeout = window.setTimeout(() => typeWriter(index + 1), 20);
  }

  heroText.classList.add("typing");
  timeout = window.setTimeout(typeWriter, 350);

  window.addEventListener("pagehide", finishTyping, { once: true });
})();
