document.addEventListener('DOMContentLoaded', () => {
  const sections = document.querySelectorAll('.share-section');

  sections.forEach((section) => {
    const linkButtons = section.querySelectorAll('[data-share-link]');
    const title = document.querySelector('.post-header h1')?.textContent?.trim() || document.title;
    const url = window.location.href;

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
  });
});
