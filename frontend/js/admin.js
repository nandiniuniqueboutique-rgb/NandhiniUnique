// Shared across all admin/* pages. Requires api.js to be loaded first.

function guardAdmin() {
  if (!isLoggedIn() || !isAdmin()) {
    window.location.href = "login.html";
    return false;
  }
  return true;
}

function renderAdminSidebar(active) {
  const el = qs("#admin-sidebar");
  if (!el) return;
  const links = [
    { href: "dashboard.html", label: "📊 Dashboard", key: "dashboard" },
    { href: "products.html", label: "🧵 Sarees / Products", key: "products" },
    { href: "orders.html", label: "📦 Orders", key: "orders" },
    { href: "offers.html", label: "🎁 Offers", key: "offers" },
    { href: "complaints.html", label: "💬 Queries & Complaints", key: "complaints" },
  ];
  el.innerHTML = `
    <div class="brand">
      <span class="name" style="font-size:1.3rem; color:var(--gold-light)">Nandini Unique</span>
      <span class="tag" style="opacity:.7">Owner Panel</span>
    </div>
    <nav>
      ${links.map(l => `<a href="${l.href}" class="${l.key === active ? 'active' : ''}">${l.label}</a>`).join("")}
      <a href="../index.html">🏬 View Storefront</a>
      <a href="#" id="admin-logout">⎋ Log Out</a>
    </nav>
  `;
  qs("#admin-logout").addEventListener("click", (e) => { e.preventDefault(); clearSession(); window.location.href = "../index.html"; });
}
