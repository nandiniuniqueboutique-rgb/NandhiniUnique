// ===========================================================
// Nandini Unique — shared frontend helpers
// Loaded on every page before the page's own inline script.
// ===========================================================

// API_ORIGIN comes from js/config.js, loaded before this file on every page.
const API_BASE = API_ORIGIN + "/api";
const STORE_WHATSAPP_NUMBER = "919999999999"; // shown to customers as a fallback contact number

// ---------- session helpers ----------
function getToken() { return localStorage.getItem("nu_token"); }
function getUser() {
  try { return JSON.parse(localStorage.getItem("nu_user") || "null"); } catch { return null; }
}
function saveSession(token, user) {
  localStorage.setItem("nu_token", token);
  localStorage.setItem("nu_user", JSON.stringify(user));
}
function clearSession() {
  localStorage.removeItem("nu_token");
  localStorage.removeItem("nu_user");
}
function isLoggedIn() { return !!getToken(); }
function isAdmin() { return getUser()?.role === "admin"; }

// ---------- API wrapper ----------
async function api(path, { method = "GET", body, isForm = false, auth = true } = {}) {
  const headers = {};
  if (!isForm) headers["Content-Type"] = "application/json";
  if (auth && getToken()) headers["Authorization"] = `Bearer ${getToken()}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
  });

  let data = {};
  try { data = await res.json(); } catch { /* no body */ }

  if (!res.ok) {
    throw new Error(data.message || `Request failed (${res.status})`);
  }
  return data;
}

function money(n) {
  return "₹" + Number(n || 0).toLocaleString("en-IN");
}

function statusPillClass(status) {
  return "pill status-" + String(status).replace(/\s+/g, "-");
}

function waLink(phone, message) {
  const clean = String(phone || STORE_WHATSAPP_NUMBER).replace(/[^\d]/g, "");
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
}

function qs(sel, root = document) { return root.querySelector(sel); }
function qsa(sel, root = document) { return [...root.querySelectorAll(sel)]; }

// ---------- cart (guest-friendly, stored in localStorage) ----------
function getCart() {
  try { return JSON.parse(localStorage.getItem("nu_cart") || "[]"); } catch { return []; }
}
function saveCart(cart) {
  localStorage.setItem("nu_cart", JSON.stringify(cart));
  updateCartBadge();
}
function addToCart(item) {
  const cart = getCart();
  const existing = cart.find((c) => c.productId === item.productId && c.size === item.size);
  if (existing) existing.quantity += item.quantity;
  else cart.push(item);
  saveCart(cart);
}
function updateCartQty(productId, size, quantity) {
  const cart = getCart();
  const it = cart.find((c) => c.productId === productId && c.size === size);
  if (it) it.quantity = Math.max(1, quantity);
  saveCart(cart);
}
function removeFromCart(productId, size) {
  saveCart(getCart().filter((c) => !(c.productId === productId && c.size === size)));
}
function cartCount() { return getCart().reduce((sum, c) => sum + c.quantity, 0); }
function updateCartBadge() {
  qsa(".cart-badge").forEach((el) => {
    const n = cartCount();
    el.textContent = n;
    el.style.display = n > 0 ? "inline-block" : "none";
  });
}

// ---------- shared header / footer ----------
function renderHeader(activePage = "") {
  const el = qs("#site-header");
  if (!el) return;
  const user = getUser();
  el.innerHTML = `
    <div class="zari-border"></div>
    <div class="bar container">
      <a href="index.html" class="brand brand-lockup" aria-label="Nandini Unique home page">
        <img class="brand-logo" src="assets/nandini-logo.svg" alt="Nandini Unique logo" />
      </a>
      <nav class="main-nav">
        <a href="index.html" class="${activePage === "home" ? "active" : ""}">Home</a>
        <a href="shop.html" class="${activePage === "shop" ? "active" : ""}">Shop</a>
        <a href="offers.html" class="${activePage === "offers" ? "active" : ""}">Offers</a>
        <a href="track-order.html" class="${activePage === "track" ? "active" : ""}">Track Order</a>
        <a href="contact.html" class="${activePage === "contact" ? "active" : ""}">Contact Us</a>
      </nav>
      <div class="header-actions">
        <div class="search-box">
          <input type="text" id="global-search" placeholder="Search sarees..." />
        </div>
        <a href="cart.html" class="icon-link" title="Cart">🛍️<span class="badge cart-badge" style="display:none">0</span></a>
        ${
          user
            ? `<a href="${user.role === "admin" ? "admin/dashboard.html" : "my-orders.html"}" class="icon-link" title="Account">👤</a>
               <a href="#" id="logout-link" class="icon-link" title="Log out">⎋</a>`
            : `<a href="login.html" class="icon-link" title="Login">👤</a>`
        }
      </div>
    </div>
  `;
  const search = qs("#global-search");
  if (search) {
    search.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && search.value.trim()) {
        window.location.href = `shop.html?q=${encodeURIComponent(search.value.trim())}`;
      }
    });
  }
  const logout = qs("#logout-link");
  if (logout) logout.addEventListener("click", (e) => { e.preventDefault(); clearSession(); window.location.href = "index.html"; });
  updateCartBadge();
}

function renderFooter() {
  const el = qs("#site-footer");
  if (!el) return;
  el.innerHTML = `
    <div class="container">
      <div>
        <h4>Nandini Unique</h4>
        <p style="max-width:34ch; opacity:.85; font-size:.88rem;">A saree house dedicated to handpicked weaves — Kanjivaram, Banarasi, cotton and more — brought to you with the same care as a neighbourhood store, now online.</p>
      </div>
      <div>
        <h4>Shop</h4>
        <ul class="stack" style="gap:8px">
          <li><a href="shop.html">All Sarees</a></li>
          <li><a href="offers.html">Current Offers</a></li>
          <li><a href="track-order.html">Track Your Order</a></li>
        </ul>
      </div>
      <div>
        <h4>Support</h4>
        <ul class="stack" style="gap:8px">
          <li><a href="contact.html">Contact / Raise a Query</a></li>
          <li><a href="my-orders.html">My Orders</a></li>
          <li><a href="${waLink(STORE_WHATSAPP_NUMBER, "Hi Nandini Unique, I have a question about my order.")}" target="_blank">WhatsApp Us</a></li>
        </ul>
      </div>
      <div>
        <h4>Reach Us</h4>
        <ul class="stack" style="gap:8px">
          <li>📞 +${STORE_WHATSAPP_NUMBER}</li>
          <li>✉️ hello@nandiniunique.com</li>
          <li>Mon–Sat, 10am–7pm IST</li>
        </ul>
      </div>
    </div>
    <div class="foot-bottom">© ${new Date().getFullYear()} Nandini Unique. All rights reserved.</div>
  `;
}

function renderWaFloat() {
  if (qs(".wa-float")) return;
  const a = document.createElement("a");
  a.href = waLink(STORE_WHATSAPP_NUMBER, "Hi Nandini Unique, I'd like to know more about your sarees.");
  a.target = "_blank";
  a.className = "wa-float";
  a.title = "Chat with us on WhatsApp";
  a.textContent = "💬";
  document.body.appendChild(a);
}

// ---------- Quick Order modal (order straight from a product photo/card) ----------
function ensureQuickOrderModal() {
  if (qs("#quick-order-modal")) return;
  const div = document.createElement("div");
  div.id = "quick-order-modal";
  div.className = "modal-backdrop";
  div.innerHTML = `
    <div class="modal" style="max-width:520px">
      <button class="close-x" id="qo-close">✕</button>
      <div id="qo-body"></div>
    </div>`;
  document.body.appendChild(div);
  qs("#qo-close").addEventListener("click", () => div.classList.remove("open"));
  div.addEventListener("click", (e) => { if (e.target === div) div.classList.remove("open"); });
}

function productImg(p) {
  return p.images && p.images[0] ? `${API_ORIGIN}${p.images[0]}` : "https://placehold.co/300x380/6e1e32/e8c874?text=Nandini+Unique";
}

function priceForSize(product, sizeName) {
  const opt = (product.sizeOptions || []).find((s) => s.size === sizeName);
  const modifier = opt ? opt.priceModifier : 0;
  return Math.round((product.basePrice + modifier) * (1 - (product.discountPercent || 0) / 100));
}

function openQuickOrder(product) {
  ensureQuickOrderModal();
  let selectedSize = (product.sizeOptions || []).find((s) => s.stock > 0)?.size || product.sizeOptions?.[0]?.size || "Free Size";

  function renderBody() {
    qs("#qo-body").innerHTML = `
      <div class="row" style="align-items:flex-start; gap:16px">
        <img src="${productImg(product)}" style="width:110px;height:140px;object-fit:cover;border-radius:6px;flex-shrink:0" />
        <div style="flex:1; min-width:0">
          <span class="cat">${product.productType || ""}${product.category ? " · " + product.category : ""}</span>
          <h3 style="margin:4px 0; font-size:1.15rem">${product.name}</h3>
          <p id="qo-price" style="font-size:1.25rem; font-weight:700; color:var(--maroon-dark); margin:0">${money(priceForSize(product, selectedSize))}</p>
        </div>
      </div>
      <div class="field" style="margin-top:16px">
        <label>Size / Option</label>
        <select id="qo-size">
          ${(product.sizeOptions || []).map((s) => `<option value="${s.size}" ${s.stock <= 0 ? "disabled" : ""} ${s.size === selectedSize ? "selected" : ""}>${s.size}${s.priceModifier ? ` (+${money(s.priceModifier)})` : ""}${s.stock <= 0 ? " — Out of stock" : ""}</option>`).join("")}
        </select>
      </div>
      <div class="field"><label>Quantity</label><input type="number" id="qo-qty" value="1" min="1" max="10" style="width:100px" /></div>
      <p id="qo-msg" class="success-msg" style="display:none">Added to your cart!</p>
      <div class="row" style="margin-top:12px">
        <button class="btn btn-primary" id="qo-add">Add to Cart</button>
        <button class="btn btn-gold" id="qo-buy">Buy Now</button>
      </div>
      <a href="product.html?id=${product._id}" class="hint" style="display:block; margin-top:12px; text-decoration:underline">View full details, photos & description →</a>
    `;
    qs("#qo-size").addEventListener("change", (e) => {
      selectedSize = e.target.value;
      qs("#qo-price").textContent = money(priceForSize(product, selectedSize));
    });
    qs("#qo-add").addEventListener("click", () => confirmOrder(false));
    qs("#qo-buy").addEventListener("click", () => confirmOrder(true));
  }

  function confirmOrder(goToCheckout) {
    const qty = Math.max(1, Number(qs("#qo-qty").value || 1));
    addToCart({
      productId: product._id,
      name: product.name,
      image: (product.images && product.images[0]) || "",
      size: selectedSize,
      price: priceForSize(product, selectedSize),
      quantity: qty,
    });
    if (goToCheckout) {
      window.location.href = "checkout.html";
    } else {
      qs("#qo-msg").style.display = "block";
      setTimeout(() => qs("#quick-order-modal").classList.remove("open"), 900);
    }
  }

  renderBody();
  qs("#quick-order-modal").classList.add("open");
}

document.addEventListener("DOMContentLoaded", () => {
  updateCartBadge();
});
