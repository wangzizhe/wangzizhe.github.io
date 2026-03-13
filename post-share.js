document.addEventListener('DOMContentLoaded', () => {
  const sections = document.querySelectorAll('.share-section');

  sections.forEach((section) => {
    const copyButton = section.querySelector('[data-share-copy]');
    const status = section.querySelector('[data-share-status]');
    const linkButtons = section.querySelectorAll('[data-share-link]');
    const title = document.querySelector('.post-header h1')?.textContent?.trim() || document.title;
    const url = window.location.href;
    const copySuccess = section.dataset.copySuccess || 'Link copied.';
    const copyError = section.dataset.copyError || 'Copy failed.';

    linkButtons.forEach((link) => {
      const type = link.dataset.shareLink;
      if (type === 'linkedin') {
        link.href = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
      }
      if (type === 'whatsapp') {
        link.href = `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`;
      }
      if (type === 'x') {
        link.href = `https://x.com/intent/post?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`;
      }
    });

    const setStatus = (message) => {
      if (!status) return;
      status.textContent = message;
      window.setTimeout(() => {
        if (status.textContent === message) {
          status.textContent = '';
        }
      }, 2200);
    };

    copyButton?.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(url);
        setStatus(copySuccess);
      } catch (_error) {
        setStatus(copyError);
      }
    });
  });
});
