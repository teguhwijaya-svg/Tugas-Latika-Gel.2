/* ==========================================================================
   1. DATA MASTER APLIKASI
   ========================================================================== */
let menuData = [
  { id: 1, name: "Nasi Goreng Spesial", tenant: "Kantin Bu Sri", price: 15000, rating: 4.8, isAvailable: true, hasSpicyOpt: true },
  { id: 2, name: "Ayam Geprek Sambal Korek", tenant: "Kantin Bu Sri", price: 13000, rating: 4.9, isAvailable: true, hasSpicyOpt: true },
  { id: 3, name: "Bakso Sapi Kuah Komplit", tenant: "Stand Bakso Pak Kumis", price: 12000, rating: 4.7, isAvailable: true, hasSpicyOpt: true },
  { id: 4, name: "Mie Ayam Yamin", tenant: "Stand Bakso Pak Kumis", price: 11000, rating: 4.6, isAvailable: false, hasSpicyOpt: false },
  { id: 5, name: "Es Teh Manis Jumbo", tenant: "Kedai Minuman Segar", price: 4000, rating: 4.9, isAvailable: true, hasSpicyOpt: false },
  { id: 6, name: "Jus Alpukat Kocok", tenant: "Kedai Minuman Segar", price: 8000, rating: 4.8, isAvailable: true, hasSpicyOpt: false }
];

// Data Kuota Slot Pengambilan Istirahat
let timeSlots = [
  { id: "slot1", name: "Istirahat 1 (09:30 WIB)", maxQuota: 25, booked: 18 },
  { id: "slot2", name: "Istirahat 2 (12:15 WIB)", maxQuota: 30, booked: 10 },
  { id: "slot3", name: "Pulang Sekolah (15:00 WIB)", maxQuota: 20, booked: 5 }
];

let cart = [];
let activeOrders = [];
let userPoin = 120; // Poin awal siswa
let activeDiscount = 0; // Diskon (%)
let activeReviewOrderId = null;
let selectedStarRating = 5;

/* ==========================================================================
   2. INITIALISASI APLIKASI
   ========================================================================== */
document.addEventListener("DOMContentLoaded", () => {
  renderMenuGrid();
  renderMerchantDashboard();
  renderSlotDropdown();
  updatePoinUI();

  // Timer interval untuk menghitung mundur pembatalan 2 menit pesanan
  setInterval(updateOrderTimers, 1000);
});

/* ==========================================================================
   3. KATALOG MENU & CUSTOMIZATION (SISWA)
   ========================================================================== */
function renderMenuGrid(filteredData = menuData) {
  const container = document.getElementById("menu-grid-container");
  container.innerHTML = "";

  if (filteredData.length === 0) {
    container.innerHTML = `<p class="empty-state">Menu tidak ditemukan.</p>`;
    return;
  }

  filteredData.forEach(item => {
    const card = document.createElement("div");
    card.className = "menu-card";
    card.innerHTML = `
      <div>
        <div class="menu-header">
          <span class="menu-tenant">${item.tenant}</span>
          <span class="menu-rating"><i class="fa-solid fa-star"></i> ${item.rating}</span>
        </div>
        <h4 class="menu-title">${item.name}</h4>
        <div class="menu-price">Rp ${item.price.toLocaleString("id-ID")}</div>
        
        <!-- Opsi Pedas & Catatan Khusus -->
        <div class="menu-options">
          ${item.hasSpicyOpt ? `
            <label style="font-size:0.75rem; font-weight:700;">Level Pedas:</label>
            <select id="spicy-${item.id}">
              <option value="Tidak Pedas">Tidak Pedas</option>
              <option value="Sedang">Pedas Sedang</option>
              <option value="Extra Pedas">Extra Pedas 🔥</option>
            </select>
          ` : ''}
          <input type="text" id="note-${item.id}" placeholder="Catatan (contoh: Tanpa Bawang)" style="margin-top:6px;">
        </div>
      </div>

      <button 
        class="btn-add-cart ${!item.isAvailable ? 'disabled' : ''}" 
        onclick="addToCart(${item.id})"
        ${!item.isAvailable ? 'disabled' : ''}>
        ${item.isAvailable ? '<i class="fa-solid fa-plus"></i> Tambah Ke Keranjang' : 'Stok Habis'}
      </button>
    `;
    container.appendChild(card);
  });
}

function filterByTenant(tenantName, btnEl) {
  document.querySelectorAll(".cat-btn").forEach(b => b.classList.remove("active"));
  btnEl.classList.add("active");
  if (tenantName === 'ALL') {
    renderMenuGrid(menuData);
  } else {
    renderMenuGrid(menuData.filter(i => i.tenant === tenantName));
  }
}

function filterMenu() {
  const query = document.getElementById("search-input").value.toLowerCase();
  renderMenuGrid(menuData.filter(i => i.name.toLowerCase().includes(query) || i.tenant.toLowerCase().includes(query)));
}

/* ==========================================================================
   4. LOGIKA KERANJANG, VOUCHER, & PROMO
   ========================================================================== */
function addToCart(menuId) {
  const item = menuData.find(m => m.id === menuId);
  if (!item || !item.isAvailable) return;

  // Ambil opsi pedas dan catatan
  const spicyEl = document.getElementById(`spicy-${menuId}`);
  const noteEl = document.getElementById(`note-${menuId}`);

  const spicyVal = spicyEl ? spicyEl.value : null;
  const noteVal = noteEl ? noteEl.value : '';

  const cartItem = {
    ...item,
    qty: 1,
    spicy: spicyVal,
    note: noteVal,
    cartKey: `${menuId}-${spicyVal}-${noteVal}`
  };

  const existing = cart.find(c => c.cartKey === cartItem.cartKey);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push(cartItem);
  }

  updateCartUI();
  toggleCartModal(true);
}

// 1-Click Quick Re-Order
function quickReorder() {
  cart = [{
    id: 1,
    name: "Nasi Goreng Spesial",
    tenant: "Kantin Bu Sri",
    price: 15000,
    qty: 1,
    spicy: "Sedang",
    note: "Extra Kerupuk",
    cartKey: "1-Sedang-Extra Kerupuk"
  }];
  updateCartUI();
  toggleCartModal(true);
}

function updateCartUI() {
  const totalCount = cart.reduce((sum, item) => sum + item.qty, 0);
  document.getElementById("cart-count-desktop").innerText = totalCount;
  document.getElementById("cart-count-mobile").innerText = totalCount;

  const cartList = document.getElementById("cart-items-list");
  cartList.innerHTML = "";

  let subtotal = 0;

  if (cart.length === 0) {
    cartList.innerHTML = `<p class="empty-state">Keranjang Anda kosong.</p>`;
  } else {
    cart.forEach(item => {
      const itemSubtotal = item.price * item.qty;
      subtotal += itemSubtotal;

      const row = document.createElement("div");
      row.style.cssText = "display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; border-bottom:1px solid #f1f5f9; padding-bottom:8px;";
      row.innerHTML = `
        <div>
          <strong>${item.name} (x${item.qty})</strong><br>
          <small style="color:var(--text-light)">
            ${item.spicy ? `Pedas: ${item.spicy} | ` : ''} ${item.note ? `Note: ${item.note}` : ''}
          </small>
        </div>
        <strong>Rp ${itemSubtotal.toLocaleString("id-ID")}</strong>
      `;
      cartList.appendChild(row);
    });
  }

  // Hitung Potongan Diskon
  const discountAmount = (subtotal * activeDiscount) / 100;
  const finalTotal = subtotal - discountAmount;
  const earnedPoints = Math.floor(finalTotal / 1000); // 1.000 Rupiah = 1 Poin Jajan

  document.getElementById("summary-subtotal").innerText = `Rp ${subtotal.toLocaleString("id-ID")}`;
  document.getElementById("summary-discount").innerText = `-Rp ${discountAmount.toLocaleString("id-ID")}`;
  document.getElementById("cart-total-price").innerText = `Rp ${finalTotal.toLocaleString("id-ID")}`;
  document.getElementById("earned-points").innerText = earnedPoints;

  document.getElementById("row-discount").style.display = activeDiscount > 0 ? "flex" : "none";
}

function applyPromo() {
  const code = document.getElementById("promo-input").value.trim().toUpperCase();
  const msgEl = document.getElementById("promo-message");

  if (code === "SEMESTERBARU") {
    activeDiscount = 20; // 20%
    msgEl.style.color = "var(--secondary-color)";
    msgEl.innerText = "Voucher berhasil dipasang! Diskon 20%";
  } else {
    activeDiscount = 0;
    msgEl.style.color = "var(--accent-red)";
    msgEl.innerText = "Kode promo tidak valid.";
  }
  updateCartUI();
}

function toggleCartModal(show) {
  const modal = document.getElementById("cart-modal");
  if (show) modal.classList.add("open");
  else modal.classList.remove("open");
}

/* ==========================================================================
   5. SUBMIT PESANAN & TIMER BATAL 2 MENIT
   ========================================================================== */
function submitOrder() {
  if (cart.length === 0) {
    alert("Keranjang masih kosong.");
    return;
  }

  const slotId = document.getElementById("pickup-time").value;
  const selectedSlot = timeSlots.find(s => s.id === slotId);

  if (selectedSlot.booked >= selectedSlot.maxQuota) {
    alert("Maaf, kuota untuk slot waktu ini sudah penuh. Silakan pilih slot lain.");
    return;
  }

  // Tambah Angka Kuota
  selectedSlot.booked += 1;

  const subtotal = cart.reduce((s, i) => s + (i.price * i.qty), 0);
  const finalTotal = subtotal - ((subtotal * activeDiscount) / 100);
  const earnedPoints = Math.floor(finalTotal / 1000);

  const orderId = "KTK-" + Math.floor(1000 + Math.random() * 9000);
  const createdAt = Date.now(); // Timestamp pembuatan pesanan

  const newOrder = {
    id: orderId,
    items: [...cart],
    pickupTime: selectedSlot.name,
    paymentMethod: document.getElementById("payment-method").value,
    total: finalTotal,
    status: "Sedang Dimasak",
    createdAt: createdAt,
    earnedPoints: earnedPoints,
    reviewed: false
  };

  activeOrders.push(newOrder);

  // Tambahkan Poin ke Akun Siswa
  userPoin += earnedPoints;
  updatePoinUI();

  // Reset State
  cart = [];
  activeDiscount = 0;
  document.getElementById("promo-input").value = "";
  document.getElementById("promo-message").innerText = "";
  
  updateCartUI();
  toggleCartModal(false);
  renderActiveOrders();
  renderMerchantDashboard();

  // Tampilkan QR Code Nota
  showQrModal(newOrder);
}

// Timer Hitung Mundur Pembatalan (2 Menit)
function updateOrderTimers() {
  const now = Date.now();
  activeOrders.forEach(order => {
    if (order.status === "Sedang Dimasak") {
      const elapsedSeconds = Math.floor((now - order.createdAt) / 1000);
      const remainingSeconds = 120 - elapsedSeconds; // 2 Menit = 120 Detik

      const timerEl = document.getElementById(`timer-${order.id}`);
      const btnCancel = document.getElementById(`btn-cancel-${order.id}`);

      if (remainingSeconds > 0) {
        if (timerEl) timerEl.innerText = `Bisa dibatalkan dalam: ${remainingSeconds} detik`;
      } else {
        if (timerEl) timerEl.innerText = "Pesanan dikunci (Diproses dapur)";
        if (btnCancel) btnCancel.style.display = "none";
      }
    }
  });
}

function cancelOrder(orderId) {
  const order = activeOrders.find(o => o.id === orderId);
  if (!order) return;

  const elapsedSeconds = Math.floor((Date.now() - order.createdAt) / 1000);
  if (elapsedSeconds > 120) {
    alert("Waktu pembatalan (2 menit) sudah habis. Pesanan sudah diproses dapur.");
    return;
  }

  if (confirm(`Apakah Anda yakin ingin membatalkan pesanan ${orderId}?`)) {
    // Kembalikan Poin
    userPoin -= order.earnedPoints;
    updatePoinUI();

    // Hapus dari daftar
    activeOrders = activeOrders.filter(o => o.id !== orderId);
    renderActiveOrders();
    renderMerchantDashboard();
    alert("Pesanan berhasil dibatalkan.");
  }
}

/* ==========================================================================
   6. RENDER PESANAN AKTIF & RATING (SISWA)
   ========================================================================== */
function renderActiveOrders() {
  const container = document.getElementById("active-orders-container");
  container.innerHTML = "";

  if (activeOrders.length === 0) {
    container.innerHTML = `<p class="empty-state">Belum ada pesanan aktif saat ini.</p>`;
    return;
  }

  activeOrders.forEach(order => {
    const isReady = order.status === "Siap Diambil";
    const elapsedSeconds = Math.floor((Date.now() - order.createdAt) / 1000);
    const canCancel = elapsedSeconds < 120 && order.status === "Sedang Dimasak";

    const card = document.createElement("div");
    card.className = "order-card";
    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <strong>ID Nota: ${order.id}</strong>
        <span class="status-badge ${isReady ? 'ready' : ''}">${order.status}</span>
      </div>
      <p style="font-size:0.85rem; margin-top:4px;">Jadwal Ambil: <b>${order.pickupTime}</b></p>
      
      <ul style="margin: 8px 0 8px 20px; font-size:0.85rem;">
        ${order.items.map(i => `<li>${i.name} (x${i.qty}) ${i.spicy ? `- ${i.spicy}` : ''} ${i.note ? `(${i.note})` : ''}</li>`).join('')}
      </ul>

      <!-- Timer Batal 2 Menit -->
      ${order.status === 'Sedang Dimasak' ? `
        <div class="cancel-timer-box">
          <span class="timer-text" id="timer-${order.id}">Memuat timer...</span>
          <button 
            id="btn-cancel-${order.id}" 
            class="btn-danger-sm" 
            onclick="cancelOrder('${order.id}')"
            style="${!canCancel ? 'display:none;' : ''}">
            Batalkan
          </button>
        </div>
      ` : ''}

      <div class="order-actions">
        <button class="btn-secondary" onclick="showQrModalById('${order.id}')">
          <i class="fa-solid fa-qrcode"></i> Lihat QR Code
        </button>
        ${isReady && !order.reviewed ? `
          <button class="btn-secondary" style="background:#fef3c7; color:#d97706;" onclick="openReviewModal('${order.id}')">
            <i class="fa-solid fa-star"></i> Beri Ulasan
          </button>
        ` : ''}
      </div>
    `;
    container.appendChild(card);
  });
}

/* ==========================================================================
   7. DASHBOARD TENANT & PANGGILAN SUARA (WEB SPEECH API)
   ========================================================================== */
function renderMerchantDashboard() {
  // 1. Render Kuota Slot
  const quotaContainer = document.getElementById("quota-grid-container");
  quotaContainer.innerHTML = "";
  timeSlots.forEach(slot => {
    const card = document.createElement("div");
    card.className = "quota-card";
    card.innerHTML = `
      <strong>${slot.name}</strong>
      <div class="quota-number">${slot.booked} / ${slot.maxQuota}</div>
      <small style="color:var(--text-light)">Pesanan Terisi</small>
    `;
    quotaContainer.appendChild(card);
  });

  // 2. Render Stok Toggle
  const stockContainer = document.getElementById("merchant-stock-list");
  stockContainer.innerHTML = "";
  menuData.forEach(item => {
    const row = document.createElement("div");
    row.style.cssText = "display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid #f1f5f9;";
    row.innerHTML = `
      <span>${item.name} (${item.tenant})</span>
      <button 
        style="padding:6px 12px; border-radius:8px; border:none; cursor:pointer; font-weight:700; background:${item.isAvailable ? '#10b981' : '#ef4444'}; color:white;"
        onclick="toggleStockStatus(${item.id})">
        ${item.isAvailable ? 'Status: Ready' : 'Status: Habis'}
      </button>
    `;
    stockContainer.appendChild(row);
  });

  // 3. Render Antrean
  const merchantOrderContainer = document.getElementById("merchant-order-list");
  merchantOrderContainer.innerHTML = "";

  if (activeOrders.length === 0) {
    merchantOrderContainer.innerHTML = `<p class="empty-state">Belum ada pesanan masuk.</p>`;
    return;
  }

  activeOrders.forEach(order => {
    const card = document.createElement("div");
    card.className = "order-card";
    card.innerHTML = `
      <div style="display:flex; justify-content:space-between;">
        <strong>${order.id} - Rp ${order.total.toLocaleString("id-ID")}</strong>
        <span class="status-badge">${order.status}</span>
      </div>
      <p style="font-size:0.85rem; margin-top:4px;">Target Pengambilan: <b>${order.pickupTime}</b></p>
      <ul style="margin: 8px 0 8px 20px; font-size:0.85rem;">
        ${order.items.map(i => `<li>${i.name} (x${i.qty}) ${i.spicy ? `- ${i.spicy}` : ''} ${i.note ? `(${i.note})` : ''}</li>`).join('')}
      </ul>

      <div style="display:flex; gap:8px; margin-top:10px;">
        <button class="btn-primary" onclick="advanceOrderStatus('${order.id}')">
          ${order.status === 'Sedang Dimasak' ? 'Tandai "Siap Diambil"' : 'Tandai "Selesai"'}
        </button>
        <button class="btn-audio-call" onclick="playAudioAnnouncement('${order.id}')" title="Panggil Suara">
          <i class="fa-solid fa-volume-high"></i> Panggil
        </button>
      </div>
    `;
    merchantOrderContainer.appendChild(card);
  });
}

function toggleStockStatus(id) {
  const item = menuData.find(m => m.id === id);
  if (item) {
    item.isAvailable = !item.isAvailable;
    renderMenuGrid();
    renderMerchantDashboard();
  }
}

function advanceOrderStatus(orderId) {
  const order = activeOrders.find(o => o.id === orderId);
  if (order) {
    if (order.status === "Sedang Dimasak") {
      order.status = "Siap Diambil";
      // Otomatis Panggil Suara saat makanan siap
      playAudioAnnouncement(orderId);
    } else {
      activeOrders = activeOrders.filter(o => o.id !== orderId);
    }
    renderActiveOrders();
    renderMerchantDashboard();
  }
}

// Fitur Efisiensi Tenant: Panggilan Suara Otomatis
function playAudioAnnouncement(orderId) {
  if ('speechSynthesis' in window) {
    const text = `Nomor pesanan ${orderId.replace('-', ' ')}, makanan Anda sudah siap diambil di kantin.`;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'id-ID'; // Bahasa Indonesia
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  } else {
    alert(`Panggilan suara: Nomor Pesanan ${orderId} SIAP DIAMBIL!`);
  }
}

/* ==========================================================================
   8. UTILITY MODAL & ULASAN
   ========================================================================== */
function renderSlotDropdown() {
  const select = document.getElementById("pickup-time");
  select.innerHTML = "";
  timeSlots.forEach(slot => {
    const opt = document.createElement("option");
    opt.value = slot.id;
    opt.innerText = `${slot.name} (Tersisa: ${slot.maxQuota - slot.booked})`;
    select.appendChild(opt);
  });
}

function updatePoinUI() {
  document.getElementById("user-points").innerText = userPoin;
}

function showQrModal(order) {
  const modalBody = document.getElementById("qr-modal-body");
  modalBody.innerHTML = `
    <h4>Kode Nota: ${order.id}</h4>
    <p style="font-size:0.85rem; color:var(--text-light);">Tunjukkan QR Code ini kepada petugas stand kantin saat mengambil pesanan.</p>
    <div class="qr-box">
      <div class="qr-code-dummy">
        <i class="fa-solid fa-qrcode"></i>
      </div>
      <small style="display:block; margin-top:8px; font-weight:700;">${order.id}</small>
    </div>
    <p><b>Target Ambil:</b> ${order.pickupTime}</p>
    <p><b>Total:</b> Rp ${order.total.toLocaleString("id-ID")}</p>
  `;
  toggleQrModal(true);
}

function showQrModalById(orderId) {
  const order = activeOrders.find(o => o.id === orderId);
  if (order) showQrModal(order);
}

function toggleQrModal(show) {
  const modal = document.getElementById("qr-modal");
  if (show) modal.classList.add("open");
  else modal.classList.remove("open");
}

// Modal Rating Ulasan
function openReviewModal(orderId) {
  activeReviewOrderId = orderId;
  selectedStarRating = 5;
  selectStar(5);
  document.getElementById("review-text").value = "";
  toggleReviewModal(true);
}

function selectStar(val) {
  selectedStarRating = val;
  const stars = document.querySelectorAll("#star-rating-box .star");
  stars.forEach((star, index) => {
    if (index < val) star.classList.add("active");
    else star.classList.remove("active");
  });
}

function submitReview() {
  const order = activeOrders.find(o => o.id === activeReviewOrderId);
  if (order) {
    order.reviewed = true;
    alert("Terima kasih atas ulasan bintang " + selectedStarRating + " yang Anda berikan!");
    renderActiveOrders();
    toggleReviewModal(false);
  }
}

function toggleReviewModal(show) {
  const modal = document.getElementById("review-modal");
  if (show) modal.classList.add("open");
  else modal.classList.remove("open");
}

/* Sakelar Peran Siswa/Tenant */
function switchRole(role) {
  const buyerSec = document.getElementById("buyer-section");
  const merchantSec = document.getElementById("merchant-section");
  const btnSiswa = document.getElementById("btn-siswa");
  const btnTenant = document.getElementById("btn-tenant");
  const mnavHome = document.getElementById("mnav-home");
  const mnavTenant = document.getElementById("mnav-tenant");

  if (role === 'siswa') {
    buyerSec.classList.remove("hidden");
    merchantSec.classList.add("hidden");
    btnSiswa.classList.add("active");
    btnTenant.classList.remove("active");
    if (mnavHome) mnavHome.classList.add("active");
    if (mnavTenant) mnavTenant.classList.remove("active");
  } else {
    buyerSec.classList.add("hidden");
    merchantSec.classList.remove("hidden");
    btnSiswa.classList.remove("active");
    btnTenant.classList.add("active");
    if (mnavHome) mnavHome.classList.remove("active");
    if (mnavTenant) mnavTenant.classList.add("active");
  }
}
