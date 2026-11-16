const loginPanel = document.querySelector('#login-panel');
const dashboard = document.querySelector('#dashboard');
const loginForm = document.querySelector('#login-form');
const loginStatus = document.querySelector('#login-status');
const dashboardStatus = document.querySelector('#dashboard-status');
const productList = document.querySelector('#product-list');
const productDialog = document.querySelector('#product-dialog');
const productForm = document.querySelector('#product-form');
const formStatus = document.querySelector('#form-status');
const imagePreview = document.querySelector('#image-preview');
let products = [];

async function api(url, options = {}) {
  const response = await fetch(url, { credentials: 'same-origin', ...options, headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) } });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'The request could not be completed.');
  return result;
}

function setStatus(target, message, isError = false) {
  target.textContent = message;
  target.classList.toggle('error', isError);
}

function money(amount) {
  if (amount === null || amount === undefined || amount === '') return 'Custom quote';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

function showDashboard(items) {
  products = items;
  loginPanel.hidden = true;
  dashboard.hidden = false;
  document.querySelector('#logout-button').hidden = false;
  renderProducts();
}

function makeProductCard(product) {
  const card = document.createElement('article');
  card.className = 'product-row';
  const imageWrap = document.createElement('div');
  imageWrap.className = 'product-row-image';
  if (product.image) {
    const img = document.createElement('img');
    img.src = product.image;
    img.alt = product.name;
    imageWrap.append(img);
  } else {
    const noImage = document.createElement('span');
    noImage.className = 'no-image';
    noImage.textContent = '♡';
    imageWrap.append(noImage);
  }

  const body = document.createElement('div');
  body.className = 'product-row-body';
  const category = document.createElement('p');
  category.className = 'product-row-category';
  category.textContent = product.category || 'PORTRAIT';
  const title = document.createElement('h2');
  title.textContent = product.name;
  const description = document.createElement('p');
  description.className = 'product-row-description';
  description.textContent = product.description || 'No description added.';
  const metrics = document.createElement('div');
  metrics.className = 'product-metrics';
  const price = document.createElement('span');
  price.className = 'metric';
  price.innerHTML = 'PRICE';
  const priceValue = document.createElement('b');
  priceValue.textContent = money(product.price);
  price.append(priceValue);
  const stock = document.createElement('span');
  stock.className = 'metric';
  stock.innerHTML = 'STOCK';
  const stockValue = document.createElement('b');
  stockValue.textContent = product.stock === null ? 'Made to order' : String(product.stock);
  stock.append(stockValue);
  metrics.append(price, stock);
  const state = document.createElement('p');
  state.className = `product-state${product.active === false ? ' off' : ''}`;
  state.textContent = product.active === false ? 'HIDDEN FROM WEBSITE' : (product.stock === 0 ? 'OUT OF STOCK' : 'LIVE ON WEBSITE');
  const actions = document.createElement('div');
  actions.className = 'product-actions';
  const edit = document.createElement('button');
  edit.type = 'button';
  edit.textContent = 'Edit product';
  edit.addEventListener('click', () => openEditor(product));
  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'delete-product';
  remove.textContent = 'Delete';
  remove.addEventListener('click', async () => {
    if (!window.confirm(`Delete “${product.name}”? This removes it from the catalogue.`)) return;
    try {
      await api(`/api/admin/products/${encodeURIComponent(product.id)}`, { method: 'DELETE' });
      await refreshProducts();
      setStatus(dashboardStatus, 'Product deleted.');
    } catch (error) { setStatus(dashboardStatus, error.message, true); }
  });
  actions.append(edit, remove);
  body.append(category, title, description, metrics, state, actions);
  card.append(imageWrap, body);
  return card;
}

function renderProducts() {
  productList.replaceChildren(...products.map(makeProductCard));
}

async function refreshProducts() {
  products = await api('/api/admin/products');
  renderProducts();
}

function openEditor(product = null) {
  productForm.reset();
  productForm.elements.id.value = product?.id || '';
  productForm.elements.name.value = product?.name || '';
  productForm.elements.category.value = product?.category || '';
  productForm.elements.description.value = product?.description || '';
  productForm.elements.price.value = product?.price ?? '';
  productForm.elements.stock.value = product?.stock ?? '';
  productForm.elements.image.value = product?.image || '';
  productForm.elements.active.checked = product?.active !== false;
  productForm.elements.imageFile.value = '';
  document.querySelector('#form-title').textContent = product ? 'Edit product' : 'Add a product';
  setStatus(formStatus, '');
  if (product?.image) showPreview(product.image);
  else imagePreview.hidden = true;
  productDialog.showModal();
}

function showPreview(src) {
  imagePreview.querySelector('img').src = src;
  imagePreview.hidden = false;
}

function fileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read the selected image.'));
    reader.readAsDataURL(file);
  });
}

document.querySelector('#new-product-button').addEventListener('click', () => openEditor());
document.querySelector('#dialog-close').addEventListener('click', () => productDialog.close());
document.querySelector('#cancel-button').addEventListener('click', () => productDialog.close());
productDialog.addEventListener('click', (event) => { if (event.target === productDialog) productDialog.close(); });
productForm.elements.imageFile.addEventListener('change', async () => {
  const file = productForm.elements.imageFile.files[0];
  if (!file) return;
  if (file.size > 8 * 1024 * 1024) {
    productForm.elements.imageFile.value = '';
    setStatus(formStatus, 'Image is too large. Choose a file under 8 MB.', true);
    return;
  }
  try { showPreview(await fileAsDataUrl(file)); }
  catch (error) { setStatus(formStatus, error.message, true); }
});

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = loginForm.querySelector('button');
  button.disabled = true;
  setStatus(loginStatus, 'Signing in...');
  try {
    await api('/api/admin/login', { method: 'POST', body: JSON.stringify({ password: loginForm.elements.password.value }) });
    loginForm.elements.password.value = '';
    showDashboard(await api('/api/admin/products'));
  } catch (error) { setStatus(loginStatus, error.message, true); }
  finally { button.disabled = false; }
});

productForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!productForm.reportValidity()) return;
  const submit = productForm.querySelector('[type="submit"]');
  submit.disabled = true;
  setStatus(formStatus, 'Saving product...');
  try {
    const file = productForm.elements.imageFile.files[0];
    const payload = {
      id: productForm.elements.id.value || undefined,
      name: productForm.elements.name.value,
      category: productForm.elements.category.value,
      description: productForm.elements.description.value,
      price: productForm.elements.price.value,
      stock: productForm.elements.stock.value,
      image: productForm.elements.image.value,
      active: productForm.elements.active.checked,
    };
    if (file) payload.imageData = await fileAsDataUrl(file);
    await api('/api/admin/products', { method: 'POST', body: JSON.stringify(payload) });
    await refreshProducts();
    productDialog.close();
    setStatus(dashboardStatus, 'Product saved. The storefront has been updated.');
  } catch (error) { setStatus(formStatus, error.message, true); }
  finally { submit.disabled = false; }
});

document.querySelector('#logout-button').addEventListener('click', async () => {
  await api('/api/admin/logout', { method: 'POST', body: '{}' }).catch(() => {});
  dashboard.hidden = true;
  loginPanel.hidden = false;
  document.querySelector('#logout-button').hidden = true;
});

api('/api/admin/products').then(showDashboard).catch((error) => {
  loginPanel.hidden = false;
  if (!String(error.message).includes('sign in')) setStatus(loginStatus, error.message, true);
});

