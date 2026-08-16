const shareIcons = {
  linkedin:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.94 8.5A1.56 1.56 0 1 1 6.9 5.38a1.56 1.56 0 0 1 .04 3.12ZM5.5 9.8h2.8V18H5.5V9.8Zm4.56 0h2.68v1.12h.04c.37-.7 1.29-1.44 2.66-1.44 2.84 0 3.36 1.87 3.36 4.3V18H16V14.2c0-.9-.02-2.07-1.26-2.07-1.26 0-1.46.99-1.46 2V18h-2.82V9.8Z"/></svg>',
  whatsapp:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12.04 4.5a7.34 7.34 0 0 0-6.33 11.05L4.5 19.5l4.07-1.17A7.34 7.34 0 1 0 12.04 4.5Zm0 13.18c-1.16 0-2.3-.3-3.3-.89l-.24-.14-2.42.7.71-2.36-.16-.24a5.86 5.86 0 1 1 5.41 2.93Zm3.21-4.39c-.18-.09-1.07-.53-1.24-.58-.16-.06-.28-.09-.4.09-.12.18-.46.58-.56.7-.1.12-.2.13-.37.05-.18-.09-.73-.27-1.38-.87-.5-.44-.84-.99-.94-1.16-.1-.18-.01-.27.07-.36.08-.08.18-.2.27-.3.09-.1.12-.18.18-.3.06-.12.03-.22-.01-.3-.05-.09-.4-.97-.55-1.33-.15-.35-.3-.3-.4-.3h-.34c-.12 0-.3.05-.46.22-.16.18-.61.59-.61 1.43 0 .84.62 1.65.7 1.76.09.12 1.21 1.86 2.95 2.61 1.73.75 1.73.5 2.04.47.3-.04 1.07-.44 1.22-.87.15-.43.15-.8.11-.87-.04-.08-.16-.12-.34-.21Z"/></svg>',
  x:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.78 4.5h2.52l-5.5 6.29L21 19.5h-4.86l-3.8-4.97-4.35 4.97H5.46l5.88-6.72L5 4.5h4.98l3.44 4.54L17.78 4.5Zm-.88 13.48h1.4L9.22 5.94H7.72l9.18 12.04Z"/></svg>'
};

document.addEventListener('DOMContentLoaded', () => {
  const sections = document.querySelectorAll('.share-section');
  const isEnglish = document.documentElement.lang.toLowerCase().startsWith('en');
  const shareLabel = isEnglish ? 'Share on' : '分享到';

  function renderShareMenu(section) {
    if (section.querySelector('.share-menu')) return;

    const menu = document.createElement('div');
    menu.className = 'share-menu';

    ['linkedin', 'whatsapp', 'x'].forEach((type) => {
      const label = type === 'x' ? 'X' : type.charAt(0).toUpperCase() + type.slice(1);
      const link = document.createElement('a');
      link.className = 'share-link';
      link.href = '#';
      link.target = '_blank';
      link.rel = 'noreferrer';
      link.dataset.shareLink = type;
      link.setAttribute('aria-label', `${shareLabel} ${label}`);
      link.title = label;
      link.innerHTML = shareIcons[type];
      menu.append(link);
    });

    section.append(menu);
  }

  sections.forEach((section) => {
    renderShareMenu(section);
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
