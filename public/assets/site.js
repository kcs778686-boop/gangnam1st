const menuButton = document.querySelector('.menu-toggle');
const mobileMenu = document.querySelector('#mobile-menu');
function closeMenu() { if (!menuButton || !mobileMenu) return; mobileMenu.hidden = true; menuButton.setAttribute('aria-expanded', 'false'); menuButton.textContent = '메뉴'; }
menuButton?.addEventListener('click', () => { const opening = mobileMenu.hidden; mobileMenu.hidden = !opening; menuButton.setAttribute('aria-expanded', String(opening)); menuButton.textContent = opening ? '닫기' : '메뉴'; });
document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !mobileMenu?.hidden) { closeMenu(); menuButton?.focus(); } });
mobileMenu?.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
const filterButtons = document.querySelectorAll('[data-filter]');
const journalCards = document.querySelectorAll('[data-category]');
filterButtons.forEach(button => button.addEventListener('click', () => {
  filterButtons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  let count = 0;
  journalCards.forEach(card => { card.hidden = button.dataset.filter !== 'all' && card.dataset.category !== button.dataset.filter; if (!card.hidden) count++; });
  const status = document.querySelector('#filter-status');
  if (status) status.textContent = `${count}개의 글을 표시합니다.`;
}));
