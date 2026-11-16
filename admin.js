const STORAGE_KEY = 'taf.products.v1';
const productList = document.querySelector('#product-list');
const productDialog = document.querySelector('#product-dialog');
const productForm = document.querySelector('#product-form');
const formStatus = document.querySelector('#form-status');
const dashboardStatus = document.querySelector('#dashboard-status');
const imagePreview = document.querySelector('#image-preview');
let products = [];

function status(target, message, error = false) {
  target.textContent = message;
  target.classList.toggle('error', error);
}

function saveProducts() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
    renderProducts();
    status(dashboardStatus, 'Saved in this browser. Refresh the storefront to see the changes.');
    return true;
  } catch {
    status(dashboardStatus, 'Browser storage is full. Use smaller images or remove products with large uploads.', true);
    return false;
  }
}

function money(value) {
  return value == null || value === '' ? 'Custom quote' : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
}

function productCard(product) {
  const card = document.createElement('article');
  card.className = 'product-row';
  const imageWrap = document.createElement('div');
  imageWrap.className = 'product-row-image';
  if (product.image) {
    const image = document.createElement('img');
    image.src = product.image;
    image.alt = product.name;
    imageWrap.append(image);
  } else {
    const placeholder = document.createElement('span');
    placeholder.className = 'no-image';
    placeholder.textContent = '♡';
    imageWrap.append(placeholder);
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
  price.append('PRICE');
  const priceValue = document.createElement('b');
  priceValue.textContent = money(product.price);
  price.append(priceValue);
  const stock = document.createElement('span');
  stock.className = 'metric';
  stock.append('STOCK');
  const stockValue = document.createElement('b');
  stockValue.textContent = product.stock == null ? 'Made to order' : String(product.stock);
  stock.append(stockValue);
  metrics.append(price, stock);
  const state = document.createElement('p');
  state.className = `product-state${product.active === false ? ' off' : ''}`;
  state.textContent = product.active === false ? 'HIDDEN FROM WEBSITE' : (product.stock === 0 ? 'OUT OF STOCK' : 'VISIBLE ON WEBSITE');
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
  remove.addEventListener('click', () => {
    if (!window.confirm(`Delete “${product.name}”?`)) return;
    products = products.filter((item) => item.id !== product.id);
    saveProducts();
  });
  actions.append(edit, remove);
  body.append(category, title, description, metrics, state, actions);
  card.append(imageWrap, body);
  return card;
}

function renderProducts() {
  productList.replaceChildren(...products.map(productCard));
  if (!products.length) {
    const empty = document.createElement('p');
    empty.className = 'empty-products';
    empty.textContent = 'No products yet. Add your first portrait style to begin.';
    productList.append(empty);
  }
}

function showPreview(source) {
  imagePreview.querySelector('img').src = source;
  imagePreview.hidden = false;
}

function openEditor(product = null) {
  productForm.reset();
  productForm.dataset.imageData = '';
  productForm.elements.id.value = product?.id || '';
  productForm.elements.name.value = product?.name || '';
  productForm.elements.category.value = product?.category || '';
  productForm.elements.description.value = product?.description || '';
  productForm.elements.price.value = product?.price ?? '';
  productForm.elements.stock.value = product?.stock ?? '';
  productForm.elements.image.value = product?.image && !product.image.startsWith('data:image/') ? product.image : '';
  productForm.elements.active.checked = product?.active !== false;
  productForm.elements.imageFile.value = '';
  document.querySelector('#form-title').textContent = product ? 'Edit product' : 'Add a product';
  status(formStatus, '');
  if (product?.image) showPreview(product.image);
  else imagePreview.hidden = true;
  productDialog.showModal();
}

function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that image.'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('That image could not be opened.'));
      image.onload = () => {
        const ratio = Math.min(1, 1200 / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * ratio));
        canvas.height = Math.max(1, Math.round(image.height * ratio));
        const context = canvas.getContext('2d');
        context.fillStyle = '#fff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const compressed = canvas.toDataURL('image/jpeg', 0.72);
        if (compressed.length > 900_000) reject(new Error('Image is still too large after compression. Choose a smaller image.'));
        else resolve(compressed);
      };
      image.src = reader.result;
    };
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
  if (!file.type.startsWith('image/')) {
    status(formStatus, 'Choose an image file.', true);
    productForm.elements.imageFile.value = '';
    return;
  }
  if (file.size > 8 * 1024 * 1024) {
    status(formStatus, 'Choose an image smaller than 8 MB.', true);
    productForm.elements.imageFile.value = '';
    return;
  }
  try {
    const dataUrl = await compressImage(file);
    productForm.dataset.imageData = dataUrl;
    showPreview(dataUrl);
    status(formStatus, 'Image ready. It will be saved in this browser.');
  } catch (error) {
    productForm.dataset.imageData = '';
    status(formStatus, error.message, true);
  }
});

productForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!productForm.reportValidity()) return;
  const id = productForm.elements.id.value || `portrait-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
  const existing = products.find((item) => item.id === id);
  const uploadedImage = productForm.dataset.imageData || '';
  const product = {
    id,
    name: productForm.elements.name.value.trim(),
    category: productForm.elements.category.value.trim() || 'CUSTOM PORTRAIT',
    description: productForm.elements.description.value.trim(),
    image: uploadedImage || productForm.elements.image.value.trim() || existing?.image || '',
    price: productForm.elements.price.value === '' ? null : Number(productForm.elements.price.value),
    stock: productForm.elements.stock.value === '' ? null : Number(productForm.elements.stock.value),
    active: productForm.elements.active.checked,
  };
  if (!product.image) {
    status(formStatus, 'Choose an image or enter an image path.', true);
    return;
  }
  if (existing) products = products.map((item) => item.id === id ? product : item);
  else products.unshift(product);
  if (saveProducts()) {
    productForm.dataset.imageData = '';
    productDialog.close();
  }
});

productForm.elements.image.addEventListener('input', () => {
  productForm.dataset.imageData = '';
  const value = productForm.elements.image.value.trim();
  if (value) showPreview(value);
});

async function loadProducts() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) { products = parsed; renderProducts(); return; }
    }
  } catch {
    status(dashboardStatus, 'Saved product data could not be read. Start with the catalogue file.', true);
  }
  try {
    const response = await fetch('data/products.json');
    if (!response.ok) throw new Error('Catalogue file is unavailable.');
    products = await response.json();
    if (!Array.isArray(products)) products = [];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
    renderProducts();
  } catch {
    products = [];
    renderProducts();
    status(dashboardStatus, 'Open this page from the website address so the starter catalogue can load.', true);
  }
}

loadProducts();

