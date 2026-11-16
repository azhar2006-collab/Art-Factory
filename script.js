const menuToggle = document.querySelector('.menu-toggle');
const siteNav = document.querySelector('.site-nav');

window.setTimeout(() => {
  document.documentElement.classList.remove('is-loading');
}, 2000);

menuToggle.addEventListener('click', () => {
  const isOpen = menuToggle.getAttribute('aria-expanded') === 'true';
  menuToggle.setAttribute('aria-expanded', String(!isOpen));
  menuToggle.setAttribute('aria-label', isOpen ? 'Open navigation' : 'Close navigation');
  siteNav.classList.toggle('open', !isOpen);
});

siteNav.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    siteNav.classList.remove('open');
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Open navigation');
  });
});

const filterButtons = [...document.querySelectorAll('.filter-button')];
const artworkCards = [...document.querySelectorAll('.artwork-card')];
const galleryCount = document.querySelector('.gallery-count b');
let activeFilter = 'all';

function applyFilter(filter) {
  activeFilter = filter;
  filterButtons.forEach((button) => {
    const isActive = button.dataset.filter === filter;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });

  let visibleCount = 0;
  artworkCards.forEach((card) => {
    const matches = filter === 'all' || card.dataset.category.split(' ').includes(filter);
    card.hidden = !matches;
    if (matches) visibleCount += 1;
  });
  galleryCount.textContent = String(visibleCount).padStart(2, '0');
}

filterButtons.forEach((button) => {
  button.addEventListener('click', () => applyFilter(button.dataset.filter));
});

document.querySelectorAll('[data-filter-link]').forEach((link) => {
  link.addEventListener('click', () => {
    const requested = link.dataset.filterLink;
    const filter = requested === 'charcoal' ? 'pencil' : requested;
    const matchingButton = filterButtons.find((button) => button.dataset.filter === filter);
    if (matchingButton) applyFilter(filter);
  });
});

const lightbox = document.querySelector('#lightbox');
const lightboxImage = lightbox.querySelector('img');
const lightboxCaption = lightbox.querySelector('figcaption');
const lightboxCounter = lightbox.querySelector('.lightbox-counter');
let currentArtwork = 0;

function visibleArtwork() {
  return artworkCards.filter((card) => !card.hidden);
}

function showArtwork(index) {
  const visible = visibleArtwork();
  if (!visible.length) return;
  currentArtwork = (index + visible.length) % visible.length;
  const card = visible[currentArtwork];
  const image = card.querySelector('img');
  lightboxImage.src = card.dataset.image;
  lightboxImage.alt = image.alt;
  lightboxCaption.textContent = card.dataset.title;
  lightboxCounter.textContent = `${String(currentArtwork + 1).padStart(2, '0')} / ${String(visible.length).padStart(2, '0')}`;
}

artworkCards.forEach((card) => {
  card.addEventListener('click', () => {
    showArtwork(visibleArtwork().indexOf(card));
    lightbox.showModal();
  });
});

lightbox.querySelector('.lightbox-close').addEventListener('click', () => lightbox.close());
lightbox.querySelector('.lightbox-prev').addEventListener('click', () => showArtwork(currentArtwork - 1));
lightbox.querySelector('.lightbox-next').addEventListener('click', () => showArtwork(currentArtwork + 1));
lightbox.addEventListener('click', (event) => {
  if (event.target === lightbox) lightbox.close();
});
lightbox.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowRight') showArtwork(currentArtwork + 1);
  if (event.key === 'ArrowLeft') showArtwork(currentArtwork - 1);
});

const form = document.querySelector('#contact-form');
const feedback = document.querySelector('#form-feedback');

form.addEventListener('input', (event) => {
  event.target.removeAttribute('aria-invalid');
  feedback.classList.remove('error');
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const requiredFields = [...form.querySelectorAll('[required]')];
  let firstInvalid = null;
  requiredFields.forEach((field) => {
    const valid = field.checkValidity();
    field.setAttribute('aria-invalid', String(!valid));
    if (!valid && !firstInvalid) firstInvalid = field;
  });

  if (firstInvalid) {
    feedback.textContent = 'Please check the highlighted fields and enter a valid email address.';
    feedback.classList.add('error');
    firstInvalid.focus();
    return;
  }

  const data = new FormData(form);
  const lines = [
    'Hello The Art Factory, I would like to enquire about a custom portrait.',
    '',
    `Name: ${data.get('name')}`,
    `Email: ${data.get('email')}`,
    data.get('phone') ? `Phone: ${data.get('phone')}` : '',
    `Portrait details: ${data.get('message')}`,
  ].filter(Boolean);
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(lines.join('\n'))}`;
  feedback.textContent = 'Your enquiry is ready. Continue in WhatsApp and choose a recipient to send it.';
  feedback.classList.remove('error');
  feedback.classList.add('ready');
  window.location.assign(whatsappUrl);
});

document.querySelector('#year').textContent = new Date().getFullYear();

const orderDialog = document.querySelector('#order-dialog');
const orderBagButton = document.querySelector('.order-bag');
const orderItems = document.querySelector('#order-items');
const bagCount = document.querySelector('#bag-count');
const orderForm = document.querySelector('#order-form');
const orderSubmit = orderForm.querySelector('.order-submit');
const orderStatus = document.querySelector('#order-status');
const orderBag = new Map();

function renderOrderBag() {
  const items = [...orderBag.entries()];
  const count = items.reduce((sum, [, item]) => sum + item.quantity, 0);
  bagCount.textContent = String(count);
  orderBagButton.setAttribute('aria-label', `Open order bag, ${count} ${count === 1 ? 'item' : 'items'}`);
  orderSubmit.disabled = count === 0;
  orderItems.replaceChildren();

  if (items.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'order-empty';
    empty.textContent = 'Your bag is waiting for a portrait.';
    orderItems.append(empty);
    return;
  }

  items.forEach(([name, item]) => {
    const row = document.createElement('div');
    row.className = 'order-item';
    const img = document.createElement('img');
    img.src = item.image;
    img.alt = '';
    const detail = document.createElement('span');
    detail.className = 'order-item-name';
    detail.textContent = name;
    const quantity = document.createElement('span');
    quantity.className = 'order-quantity';
    const minus = document.createElement('button');
    minus.type = 'button';
    minus.dataset.orderAction = 'minus';
    minus.dataset.product = name;
    minus.setAttribute('aria-label', `Remove one ${name}`);
    minus.textContent = '−';
    const number = document.createElement('b');
    number.textContent = String(item.quantity);
    const plus = document.createElement('button');
    plus.type = 'button';
    plus.dataset.orderAction = 'plus';
    plus.dataset.product = name;
    plus.setAttribute('aria-label', `Add one ${name}`);
    plus.textContent = '+';
    quantity.append(minus, number, plus);
    row.append(img, detail, quantity);
    orderItems.append(row);
  });
}

document.querySelectorAll('.add-to-order').forEach((button) => {
  button.addEventListener('click', () => {
    const product = button.dataset.product;
    const image = button.closest('.product-card').querySelector('.product-image img').getAttribute('src');
    const item = orderBag.get(product) || { quantity: 0, image };
    item.quantity += 1;
    orderBag.set(product, item);
    renderOrderBag();
    const original = button.innerHTML;
    button.classList.add('added');
    button.innerHTML = 'Added to order <span>✓</span>';
    window.setTimeout(() => {
      button.classList.remove('added');
      button.innerHTML = original;
    }, 1300);
  });
});

orderBagButton.addEventListener('click', () => orderDialog.showModal());
document.querySelector('.order-close').addEventListener('click', () => orderDialog.close());
orderDialog.addEventListener('click', (event) => {
  if (event.target === orderDialog) orderDialog.close();
});
orderItems.addEventListener('click', (event) => {
  const button = event.target.closest('[data-order-action]');
  if (!button) return;
  const item = orderBag.get(button.dataset.product);
  if (!item) return;
  item.quantity += button.dataset.orderAction === 'plus' ? 1 : -1;
  if (item.quantity <= 0) orderBag.delete(button.dataset.product);
  renderOrderBag();
});

orderForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!orderForm.reportValidity()) return;
  if (orderBag.size === 0) {
    orderStatus.textContent = 'Add a portrait style to your order before continuing.';
    return;
  }
  const data = new FormData(orderForm);
  const products = [...orderBag.entries()].map(([name, item]) => `• ${name} × ${item.quantity}`);
  const message = [
    'Hello The Art Factory, I would like to place a custom portrait order.',
    '',
    ...products,
    '',
    `Name: ${data.get('name')}`,
    `Phone / WhatsApp: ${data.get('phone')}`,
    data.get('email') ? `Email: ${data.get('email')}` : '',
    data.get('notes') ? `Notes: ${data.get('notes')}` : '',
    '',
    'Please share the next steps and a quote.',
  ].filter(Boolean).join('\n');
  orderStatus.textContent = 'Your order request is ready. Choose the studio in WhatsApp to send it.';
  window.location.assign(`https://wa.me/?text=${encodeURIComponent(message)}`);
});

renderOrderBag();
