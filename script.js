/* ===========================================================
   LUXE Store — Vanilla JS E-commerce
   Ma'lumotlar: LocalStorage | Buyurtmalar: Telegram Bot
   =========================================================== */

/* ===========================================================
   LUXE Store — Vanilla JS E-commerce (Firebase Edition)
   =========================================================== */

const TG_BOT_TOKEN = "8213253823:AAESS8i7BT3nyRRed96wZtQRxeIZz2hyV28";
const TG_CHAT_ID   = "6411305064";
const ADMIN_PASSWORD = "0777";

// 1. Firebase-ni ishga tushirish (Firebase Console'dan olgan kodingizni bu yerga qo'ying)
const firebaseConfig = {
  apiKey: "AIzaSyB6ddhPGKzMKiz3KY7YGkbk4avPipVvfxM",
  authDomain: "marketchinobod.firebaseapp.com",
  databaseURL: "https://marketchinobod-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "marketchinobod",
  storageBucket: "marketchinobod.firebasestorage.app",
  messagingSenderId: "1090889388348",
  appId: "1:1090889388348:web:f938a6539d08a530744e39",
  measurementId: "G-RPK00B59DY"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Global o'zgaruvchilar (Ma'lumotlarni xotirada ushlab turish uchun)
let GLOBAL_DATA = {
  products: [],
  users: [],
  orders: []
};

/* ===== DB (Firebase + LocalStorage layer) ===== */
const DB = {
  // Mahsulotlar, mijozlar va buyurtmalar hamma uchun umumiy (Firebase)
  products() { return GLOBAL_DATA.products; },
  saveProducts(arr) { database.ref('products').set(arr); },
  
  users() { return GLOBAL_DATA.users; },
  saveUsers(arr) { database.ref('users').set(arr); },
  
  orders() { return GLOBAL_DATA.orders; },
  saveOrders(arr) { database.ref('orders').set(arr); },

  // Savatcha va joriy foydalanuvchi har bir odamning o'zida alohida bo'ladi (LocalStorage)
  currentUser() { 
    try { return JSON.parse(localStorage.getItem("luxe_currentUser")) ?? null; } catch { return null; }
  },
  setCurrentUser(u) { localStorage.setItem("luxe_currentUser", JSON.stringify(u)); },
  
  cart() { 
    try { return JSON.parse(localStorage.getItem("luxe_cart")) ?? []; } catch { return []; }
  },
  saveCart(c) { localStorage.setItem("luxe_cart", JSON.stringify(c)); },
  
  isAdmin() { 
    try { return JSON.parse(localStorage.getItem("luxe_admin")) ?? false; } catch { return false; }
  },
  setAdmin(v) { localStorage.setItem("luxe_admin", JSON.stringify(v)); },
};

/* ===== Seed (birinchi marta) ===== */
function seedIfEmpty() {
  if (DB.products().length === 0) {
    const seed = [
      { id: uid(), name: "AirPods Pro 2", category: "Elektronika", price: 2890000, desc: "Active Noise Cancellation, MagSafe quvvatlash", image: "https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?w=600" },
      { id: uid(), name: "Apple Watch Ultra", category: "Elektronika", price: 12500000, desc: "Titanium korpus, GPS + Cellular", image: "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600" },
      { id: uid(), name: "Premium Charm Bracelet", category: "Aksessuarlar", price: 850000, desc: "Qo'lda yasalgan, sterling kumush", image: "https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=600" },
      { id: uid(), name: "Designer Leather Jacket", category: "Kiyim", price: 3400000, desc: "100% tabiiy charm, premium kolleksiya", image: "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600" },
      { id: uid(), name: "Ray-Ban Aviator Gold", category: "Aksessuarlar", price: 1650000, desc: "Original UV himoya, classic dizayn", image: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=600" },
      { id: uid(), name: "Cashmere Pullover", category: "Kiyim", price: 1850000, desc: "100% kashmir, Italiyada tikilgan", image: "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=600" },
    ];
    DB.saveProducts(seed);
  }
}

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }
function fmt(n) { return new Intl.NumberFormat("uz-UZ").format(n) + " so'm"; }

/* ===== Toast ===== */
function toast(msg, type = "") {
  const box = document.getElementById("toastBox");
  const t = document.createElement("div");
  t.className = "toast " + type;
  t.textContent = msg;
  box.appendChild(t);
  setTimeout(() => { t.style.opacity = "0"; t.style.transform = "translateX(100%)"; }, 2700);
  setTimeout(() => t.remove(), 3100);
}

/* ===== Page routing ===== */
let activeCategory = "Hammasi";
function showPage(name) {
  if (name === "admin" && !DB.isAdmin()) { openAdminLogin(); return; }
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  const target = document.getElementById("page-" + name);
  if (target) target.classList.add("active");
  if (name === "shop") renderProducts();
  if (name === "admin") renderAdmin();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ===== Modals ===== */
function openModal(id) { document.getElementById(id).classList.add("open"); }
function closeModal(id) { document.getElementById(id).classList.remove("open"); }

/* ===== AUTH ===== */
function renderUser() {
  const u = DB.currentUser();
  const area = document.getElementById("userArea");
  if (u) {
    area.innerHTML = `<div class="user-badge">👤 ${escapeHtml(u.name)} <button onclick="logoutUser()">Chiqish</button></div>`;
  } else {
    area.innerHTML = `<button class="btn btn-ghost sm" onclick="openModal('authModal')">Kirish</button>`;
  }
}
function handleAuth(e) {
  e.preventDefault();
  const name = document.getElementById("authName").value.trim();
  const phone = document.getElementById("authPhone").value.trim();
  if (!/^\+998\d{9}$/.test(phone)) {
    toast("Telefon raqam noto'g'ri formatda (+998901234567)", "error");
    return;
  }
  const users = DB.users();
  const exists = users.find(u => u.phone === phone);
  let user;
  if (exists) {
    user = exists;
  } else {
    user = { id: uid(), name, phone, joinedAt: Date.now() };
    users.push(user);
    DB.saveUsers(users);
  }
  DB.setCurrentUser(user);
  closeModal("authModal");
  renderUser();
  renderStats();
  toast(`Xush kelibsiz, ${user.name}! 👋`, "success");
}
function logoutUser() {
  DB.setCurrentUser(null);
  renderUser();
  toast("Tizimdan chiqdingiz");
}

/* ===== ADMIN LOGIN ===== */
function openAdminLogin() {
  if (DB.isAdmin()) { showPage("admin"); return; }
  openModal("adminLoginModal");
}
function loginAdmin(e) {
  e.preventDefault();
  const pass = document.getElementById("adminPass").value;
  if (pass === ADMIN_PASSWORD) {
    DB.setAdmin(true);
    closeModal("adminLoginModal");
    document.getElementById("adminPass").value = "";
    showPage("admin");
    toast("Admin paneliga xush kelibsiz", "success");
  } else {
    toast("Parol noto'g'ri", "error");
  }
}
function logoutAdmin() {
  DB.setAdmin(false);
  showPage("home");
  toast("Admin paneldan chiqdingiz");
}

/* ===== PRODUCTS (Shop) ===== */
function renderCategoryChips() {
  const cats = ["Hammasi", ...new Set(DB.products().map(p => p.category))];
  const box = document.getElementById("categoryChips");
  box.innerHTML = cats.map(c =>
    `<button class="chip ${c === activeCategory ? 'active' : ''}" onclick="setCategory('${escapeAttr(c)}')">${escapeHtml(c)}</button>`
  ).join("");
}
function setCategory(c) { activeCategory = c; renderCategoryChips(); renderProducts(); }

function renderProducts() {
  renderCategoryChips();
  const q = (document.getElementById("searchInput")?.value || "").toLowerCase().trim();
  let list = DB.products();
  if (activeCategory !== "Hammasi") list = list.filter(p => p.category === activeCategory);
  if (q) list = list.filter(p => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
  const grid = document.getElementById("productGrid");
  if (list.length === 0) {
    grid.innerHTML = `<div class="empty"><span>🔍</span><p>Mahsulot topilmadi</p></div>`;
    return;
  }
  grid.innerHTML = list.map(p => `
    <div class="product-card" onclick="openProductDetail('${p.id}')">
      <div class="product-img">
        ${p.image ? `<img src="${escapeAttr(p.image)}" alt="${escapeAttr(p.name)}" onerror="this.style.display='none';this.parentElement.innerHTML='📦'">` : '📦'}
        <span class="product-tag">${escapeHtml(p.category)}</span>
      </div>
      <div class="product-body">
        <div class="product-name">${escapeHtml(p.name)}</div>
        <div class="product-desc">${escapeHtml(p.desc || '')}</div>
        <div class="product-price">${fmt(p.price)}</div>
        <button class="btn btn-gold" onclick="event.stopPropagation(); addToCart('${p.id}')"> Savatga qo'shish</button>
      </div>
    </div>
  `).join("");
}

/* ===== PRODUCT DETAIL ===== */
function openProductDetail(id) {
  const p = DB.products().find(x => x.id === id);
  if (!p) return;
  const img = document.getElementById("pdImage");
  const fb = document.getElementById("pdImageFallback");
  if (p.image) { img.src = p.image; img.style.display = "block"; fb.style.display = "none"; }
  else { img.style.display = "none"; fb.style.display = "flex"; }
  document.getElementById("pdCategory").textContent = p.category;
  document.getElementById("pdName").textContent = p.name;
  document.getElementById("pdPrice").textContent = fmt(p.price);
  document.getElementById("pdDesc").textContent = p.desc || "Tavsif mavjud emas.";
  document.getElementById("pdAddBtn").onclick = function() { addToCart(p.id); closeModal("productDetailModal"); };
  openModal("productDetailModal");
}

/* ===== CART ===== */
function updateCartCount() {
  const total = DB.cart().reduce((s, i) => s + i.qty, 0);
  document.getElementById("cartCount").textContent = total;
}
function addToCart(pid) {
  const p = DB.products().find(x => x.id === pid);
  if (!p) return;
  const cart = DB.cart();
  const ex = cart.find(i => i.id === pid);
  if (ex) ex.qty++;
  else cart.push({ id: p.id, name: p.name, price: p.price, image: p.image, qty: 1 });
  DB.saveCart(cart);
  updateCartCount();
  toast(`"${p.name}" savatga qo'shildi ✓`, "success");
}
function changeQty(pid, delta) {
  const cart = DB.cart();
  const it = cart.find(i => i.id === pid);
  if (!it) return;
  it.qty += delta;
  if (it.qty <= 0) cart.splice(cart.indexOf(it), 1);
  DB.saveCart(cart);
  renderCart(); updateCartCount();
}
function removeFromCart(pid) {
  DB.saveCart(DB.cart().filter(i => i.id !== pid));
  renderCart(); updateCartCount();
}
function clearCart() {
  DB.saveCart([]); renderCart(); updateCartCount();
  toast("Savat tozalandi");
}
function cartTotal() { return DB.cart().reduce((s, i) => s + i.price * i.qty, 0); }
function renderCart() {
  const box = document.getElementById("cartItems");
  const cart = DB.cart();
  if (cart.length === 0) {
    box.innerHTML = `<div class="empty"><span>🛒</span><p>Savatcha bo'sh</p></div>`;
  } else {
    box.innerHTML = cart.map(i => `
      <div class="cart-item">
        ${i.image ? `<img src="${escapeAttr(i.image)}" onerror="this.style.display='none'">` : '<div style="width:60px;height:60px;background:var(--bg-2);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:24px">📦</div>'}
        <div class="cart-item-info">
          <b>${escapeHtml(i.name)}</b>
          <span>${fmt(i.price)}</span>
        </div>
        <div class="qty-ctrl">
          <button onclick="changeQty('${i.id}',-1)">−</button>
          <span>${i.qty}</span>
          <button onclick="changeQty('${i.id}',1)">+</button>
        </div>
        <button class="cart-remove" onclick="removeFromCart('${i.id}')">🗑</button>
      </div>
    `).join("");
  }
  document.getElementById("cartTotal").textContent = fmt(cartTotal());
}
function openCart() { renderCart(); openModal("cartModal"); }

/* ===== CHECKOUT ===== */
function openCheckout() {
  const cart = DB.cart();
  if (cart.length === 0) { toast("Savatcha bo'sh", "error"); return; }
  const user = DB.currentUser();
  if (!user) {
    closeModal("cartModal");
    openModal("authModal");
    toast("Iltimos, avval tizimga kiring", "error");
    return;
  }
  document.getElementById("coName").value = user.name;
  document.getElementById("coPhone").value = user.phone;
  document.getElementById("checkoutSummary").innerHTML =
    cart.map(i => `<div><span>${escapeHtml(i.name)} × ${i.qty}</span><span>${fmt(i.price * i.qty)}</span></div>`).join("") +
    `<div class="total"><span>Jami</span><span>${fmt(cartTotal())}</span></div>`;
  closeModal("cartModal");
  openModal("checkoutModal");
}

async function submitOrder(e) {
  e.preventDefault();
  const btn = document.getElementById("orderBtn");
  btn.disabled = true; btn.textContent = "Yuborilmoqda...";
  const user = DB.currentUser();
  const cart = DB.cart();
  const order = {
    id: uid(),
    userName: user.name,
    userPhone: user.phone,
    address: document.getElementById("coAddress").value.trim(),
    note: document.getElementById("coNote").value.trim(),
    items: cart,
    total: cartTotal(),
    createdAt: Date.now(),
  };

  // Telegramga yuborish
  const lines = [
    "🛍 <b>YANGI BUYURTMA</b>",
    "",
    `👤 <b>Mijoz:</b> ${order.userName}`,
    `📞 <b>Telefon:</b> ${order.userPhone}`,
    `📍 <b>Manzil:</b> ${order.address}`,
    order.note ? `📝 <b>Izoh:</b> ${order.note}` : "",
    "",
    "🧾 <b>Mahsulotlar:</b>",
    ...order.items.map(i => `• ${i.name} × ${i.qty} = ${fmt(i.price * i.qty)}`),
    "",
    `💰 <b>JAMI: ${fmt(order.total)}</b>`,
    `🕒 ${new Date(order.createdAt).toLocaleString("uz-UZ")}`,
  ].filter(Boolean).join("\n");

  let tgOk = false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: TG_CHAT_ID, text: lines, parse_mode: "HTML" }),
    });
    const j = await res.json();
    tgOk = !!j.ok;
  } catch (err) { console.error(err); }

  const orders = DB.orders(); orders.unshift(order); DB.saveOrders(orders);
  DB.saveCart([]);
  updateCartCount();
  closeModal("checkoutModal");
  e.target.reset();
  btn.disabled = false; btn.textContent = "Buyurtmani yuborish";
  if (tgOk) toast("Buyurtma muvaffaqiyatli yuborildi! 🎉", "success");
  else toast("Buyurtma saqlandi (Telegramga yuborib bo'lmadi)", "error");
}

/* ===== ADMIN ===== */
function renderAdmin() {
  document.getElementById("aProducts").textContent = DB.products().length;
  document.getElementById("aUsers").textContent = DB.users().length;
  document.getElementById("aOrders").textContent = DB.orders().length;
  const rev = DB.orders().reduce((s, o) => s + o.total, 0);
  document.getElementById("aRevenue").textContent = new Intl.NumberFormat("uz-UZ").format(rev);
  renderAdminProducts();
  renderAdminUsers();
  renderAdminOrders();
}

function switchTab(e, id) {
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));
  e.target.classList.add("active");
  document.getElementById(id).classList.add("active");
}

function renderAdminProducts() {
  const t = document.getElementById("adminProductsTable");
  const items = DB.products();
  t.innerHTML = `
    <thead><tr><th>Rasm</th><th>Nomi</th><th>Kategoriya</th><th>Narx</th><th>Amal</th></tr></thead>
    <tbody>${items.length === 0 ? `<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--muted)">Mahsulot yo'q</td></tr>` :
      items.map(p => `
        <tr>
          <td>${p.image ? `<img class="thumb" src="${escapeAttr(p.image)}" onerror="this.style.display='none'">` : '📦'}</td>
          <td><b>${escapeHtml(p.name)}</b></td>
          <td>${escapeHtml(p.category)}</td>
          <td>${fmt(p.price)}</td>
          <td class="row-actions">
            <button class="btn btn-ghost sm" onclick="editProduct('${p.id}')">✎ Tahrir</button>
            <button class="btn btn-danger sm" onclick="deleteProduct('${p.id}')">🗑 O'chirish</button>
          </td>
        </tr>
      `).join("")}
    </tbody>`;
}

function renderAdminUsers() {
  const t = document.getElementById("adminUsersTable");
  const items = DB.users();
  t.innerHTML = `
    <thead><tr><th>#</th><th>Ism-familiya</th><th>Telefon</th><th>Ro'yxatdan o'tgan</th></tr></thead>
    <tbody>${items.length === 0 ? `<tr><td colspan="4" style="text-align:center;padding:30px;color:var(--muted)">Mijoz yo'q</td></tr>` :
      items.map((u, i) => `
        <tr>
          <td>${i+1}</td>
          <td><b>${escapeHtml(u.name)}</b></td>
          <td>${escapeHtml(u.phone)}</td>
          <td>${new Date(u.joinedAt).toLocaleString("uz-UZ")}</td>
        </tr>
      `).join("")}
    </tbody>`;
}

function renderAdminOrders() {
  const box = document.getElementById("ordersList");
  const items = DB.orders();
  if (items.length === 0) {
    box.innerHTML = `<div class="empty"><span>🧾</span><p>Buyurtmalar yo'q</p></div>`;
    return;
  }
  box.innerHTML = items.map(o => `
    <div class="order-card">
      <div class="order-head">
        <div>
          <h4>${escapeHtml(o.userName)}</h4>
          <small>📞 ${escapeHtml(o.userPhone)} • 📍 ${escapeHtml(o.address)}</small>
        </div>
        <div class="order-total">${fmt(o.total)}</div>
      </div>
      <div class="order-items">
        ${o.items.map(i => `<div><span>${escapeHtml(i.name)} × ${i.qty}</span><span>${fmt(i.price * i.qty)}</span></div>`).join("")}
      </div>
      <div class="order-meta">
        <span>🕒 ${new Date(o.createdAt).toLocaleString("uz-UZ")}</span>
        ${o.note ? `<span>📝 ${escapeHtml(o.note)}</span>` : ""}
      </div>
    </div>
  `).join("");
}

/* ===== CRUD ===== */
function previewImage(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    document.getElementById("imagePreview").innerHTML = `<img src="${ev.target.result}">`;
    document.getElementById("pImageUrl").value = "";
    document.getElementById("pImageFile").dataset.base64 = ev.target.result;
  };
  reader.readAsDataURL(file);
}

function saveProduct(e) {
  e.preventDefault();
  const id = document.getElementById("productId").value;
  const name = document.getElementById("pName").value.trim();
  const price = +document.getElementById("pPrice").value;
  const category = document.getElementById("pCategory").value;
  const desc = document.getElementById("pDesc").value.trim();
  const urlImg = document.getElementById("pImageUrl").value.trim();
  const fileB64 = document.getElementById("pImageFile").dataset.base64;
  const image = fileB64 || urlImg || "";

  const products = DB.products();
  if (id) {
    const idx = products.findIndex(p => p.id === id);
    if (idx >= 0) products[idx] = { ...products[idx], name, price, category, desc, image: image || products[idx].image };
    toast("Mahsulot yangilandi ✓", "success");
  } else {
    products.unshift({ id: uid(), name, price, category, desc, image });
    toast("Mahsulot qo'shildi ✓", "success");
  }
  DB.saveProducts(products);
  resetProductForm();
  renderAdmin();
}

function resetProductForm() {
  document.getElementById("productForm").reset();
  document.getElementById("productId").value = "";
  document.getElementById("imagePreview").innerHTML = "";
  delete document.getElementById("pImageFile").dataset.base64;
}

function editProduct(id) {
  const p = DB.products().find(x => x.id === id); if (!p) return;
  document.getElementById("productId").value = p.id;
  document.getElementById("pName").value = p.name;
  document.getElementById("pPrice").value = p.price;
  document.getElementById("pCategory").value = p.category;
  document.getElementById("pDesc").value = p.desc || "";
  document.getElementById("pImageUrl").value = (p.image && !p.image.startsWith("data:")) ? p.image : "";
  document.getElementById("imagePreview").innerHTML = p.image ? `<img src="${p.image}">` : "";
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".tab-btn")[1].classList.add("active");
  document.getElementById("tab-add").classList.add("active");
  window.scrollTo({ top: 200, behavior: "smooth" });
}

function deleteProduct(id) {
  if (!confirm("Mahsulotni o'chirishni tasdiqlaysizmi?")) return;
  DB.saveProducts(DB.products().filter(p => p.id !== id));
  renderAdmin();
  toast("Mahsulot o'chirildi");
}

/* ===== STATS (homepage) ===== */
function renderStats() {
  document.getElementById("statProducts").textContent = DB.products().length;
  document.getElementById("statUsers").textContent = DB.users().length;
  document.getElementById("statOrders").textContent = DB.orders().length;
}

/* ===== Helpers ===== */
function escapeHtml(s) { return String(s ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function escapeAttr(s) { return escapeHtml(s); }

/* ===== Init ===== */
/* ===== Init ===== */
window.addEventListener("DOMContentLoaded", () => {
  renderUser();
  updateCartCount();

  // Modaldan tashqariga bosish bilan yopish
  document.querySelectorAll(".modal").forEach(m => {
    m.addEventListener("click", e => { if (e.target === m) m.classList.remove("open"); });
  });

  // FIREBASE-DAN REAL-TIME MA'LUMOTLARNI TINGLASH
  database.ref('/').on('value', (snapshot) => {
    const data = snapshot.val() || {};
    
    GLOBAL_DATA.products = data.products || [];
    GLOBAL_DATA.users = data.users || [];
    GLOBAL_DATA.orders = data.orders || [];

    // Agar baza bo'sh bo'lsa, demo ma'lumotlarni yuklash
    if (GLOBAL_DATA.products.length === 0) {
      seedIfEmpty();
    }

    // Sahifadagi vizual ma'lumotlarni yangilash
    renderStats();
    if (document.getElementById("page-shop").classList.contains("active")) {
      renderProducts();
    }
    if (document.getElementById("page-admin").classList.contains("active")) {
      renderAdmin();
    }
  });
});