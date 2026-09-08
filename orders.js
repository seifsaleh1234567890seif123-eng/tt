/* ==========================================================================
   ELMOHANDS PLAYSTATION LOUNGE - ORDERS DASHBOARD JAVASCRIPT ENGINE
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

  const STORAGE_KEY_ORDERS = 'elmohands_orders_v1';
  let allOrders = [];
  let activeStatusFilter = 'all';
  let activeSearchTerm = '';
  let activeConsoleFilter = 'all';
  let activeVersionFilter = 'all';
  let activeDateFilter = 'all';
  let isSoundEnabled = true;

  // Image helper for paths inside subfolder
  const resolveImg = (src) => {
    if (!src) return '../gta.jpeg';
    if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:') || src.startsWith('../')) {
      return src;
    }
    return '../' + src;
  };

  // --------------------------------------------------------------------------
  // 1. LIVE DIGITAL CLOCK
  // --------------------------------------------------------------------------
  const clockEl = document.getElementById('live-clock-time');
  const updateClock = () => {
    if (clockEl) {
      const now = new Date();
      clockEl.textContent = now.toLocaleTimeString('en-US', { hour12: true });
    }
  };
  setInterval(updateClock, 1000);
  updateClock();

  // --------------------------------------------------------------------------
  // 2. AUDIO NOTIFICATION ENGINE
  // --------------------------------------------------------------------------
  const alertAudio = document.getElementById('order-alert-sound');
  const soundToggleBtn = document.getElementById('btn-sound-toggle');
  const soundIcon = document.getElementById('sound-icon');
  const soundText = document.getElementById('sound-text');

  soundToggleBtn?.addEventListener('click', () => {
    isSoundEnabled = !isSoundEnabled;
    soundToggleBtn.classList.toggle('sound-enabled', isSoundEnabled);
    if (soundIcon) {
      soundIcon.className = isSoundEnabled ? 'fa-solid fa-bell' : 'fa-solid fa-bell-slash';
    }
    if (soundText) {
      soundText.textContent = isSoundEnabled ? 'صوت التنبيه: مفعل' : 'صوت التنبيه: مكتوم';
    }
    showToast(isSoundEnabled ? 'تم تفعيل صوت التنبيه 🔔' : 'تم كتم صوت التنبيه 🔕');
  });

  const playNewOrderSound = () => {
    if (isSoundEnabled && alertAudio) {
      try {
        alertAudio.currentTime = 0;
        alertAudio.play().catch(() => {});
      } catch (e) {}
    }
  };

  // --------------------------------------------------------------------------
  // 3. TOAST NOTIFICATIONS
  // --------------------------------------------------------------------------
  const toastEl = document.getElementById('gamer-toast');
  const toastMsg = document.getElementById('toast-msg');
  const toastIcon = document.getElementById('toast-icon');
  let toastTimeout = null;

  const showToast = (message, isError = false) => {
    if (!toastEl) return;
    if (toastTimeout) clearTimeout(toastTimeout);

    if (toastMsg) toastMsg.textContent = message;
    if (toastIcon) {
      toastIcon.className = isError ? 'toast-icon fa-solid fa-circle-exclamation' : 'toast-icon fa-solid fa-circle-check';
    }
    toastEl.querySelector('.toast-content')?.classList.toggle('toast-error', isError);

    toastEl.style.display = 'block';

    toastTimeout = setTimeout(() => {
      toastEl.style.display = 'none';
    }, 3200);
  };

  // --------------------------------------------------------------------------
  // 4. FIREBASE CLOUD & LOCAL STORAGE ENGINE
  // --------------------------------------------------------------------------
  const firebaseConfig = {
    apiKey: "AIzaSyCs-VmEzb7q8oIAzGZ8QpHllPI0yGtdsPA",
    authDomain: "elmohands-store.firebaseapp.com",
    projectId: "elmohands-store",
    storageBucket: "elmohands-store.firebasestorage.app",
    messagingSenderId: "577193319663",
    appId: "1:577193319663:web:fc57174413106afb474f1a",
    measurementId: "G-8GME76MV08"
  };

  let db = null;
  try {
    if (typeof firebase !== 'undefined') {
      if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
      }
      db = firebase.firestore();
      console.log('Orders dashboard connected to Firebase Firestore 🚀');
    }
  } catch (e) {
    console.warn('Firebase notice:', e);
  }

  const getStoredOrders = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_ORDERS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed.map(o => ({
            id: o.id || 'ORD-' + Math.floor(100000 + Math.random() * 900000),
            games: Array.isArray(o.games) ? o.games : [],
            itemsCount: o.itemsCount || (Array.isArray(o.games) && o.games.length ? o.games.length : 1),
            gameTitle: o.gameTitle || (Array.isArray(o.games) && o.games.length ? o.games.map(g => g.title).join(' + ') : 'لعبة PlayStation'),
            gameImage: o.gameImage || (Array.isArray(o.games) && o.games[0] ? o.games[0].image : 'gta.jpeg'),
            customerName: o.customerName || 'عميل',
            customerPhone: o.customerPhone || '',
            consoleType: o.consoleType || 'PlayStation 5 (PS5)',
            accountType: o.accountType || 'برايمري (Primary)',
            notes: o.notes || '',
            timeFormatted: o.timeFormatted || '',
            dateFormatted: o.dateFormatted || '',
            createdAt: o.createdAt || new Date().toISOString(),
            timestamp: o.timestamp || (o.createdAt ? new Date(o.createdAt).getTime() : Date.now()),
            status: o.status || 'جديد'
          }));
        }
      }
    } catch (e) {
      console.error('Error loading orders:', e);
    }
    return [];
  };

  const saveStoredOrders = (orders) => {
    try {
      localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(orders));
    } catch (e) {
      console.error('Error saving orders:', e);
    }
  };

  // --------------------------------------------------------------------------
  // 5. TIME HELPER (Relative & Clock Formatting)
  // --------------------------------------------------------------------------
  const getRelativeTime = (timestamp) => {
    if (!timestamp) return 'غير محدد';
    const now = Date.now();
    const diffMs = now - (typeof timestamp === 'number' ? timestamp : new Date(timestamp).getTime());
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return 'الآن (جديد)';
    if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
    if (diffHour < 24) return `منذ ${diffHour} ساعة`;
    if (diffDay === 1) return 'أمس';
    return `منذ ${diffDay} أيام`;
  };

  // --------------------------------------------------------------------------
  // 6. RENDER ORDERS & STATS
  // --------------------------------------------------------------------------
  const ordersContainer = document.getElementById('orders-list-container');
  const visibleCountEl = document.getElementById('visible-orders-count');
  const statTotal = document.getElementById('stat-total-count');
  const statPending = document.getElementById('stat-pending-count');
  const statContacted = document.getElementById('stat-contacted-count');
  const statCompleted = document.getElementById('stat-completed-count');

  const pillCountAll = document.getElementById('pill-count-all');
  const pillCountNew = document.getElementById('pill-count-new');
  const pillCountContacted = document.getElementById('pill-count-contacted');
  const pillCountCompleted = document.getElementById('pill-count-completed');
  const pillCountCancelled = document.getElementById('pill-count-cancelled');

  const updateStatsAndPills = (orders) => {
    const total = orders.length;
    const pending = orders.filter(o => !o.status || o.status.includes('جديد') || o.status.includes('انتظار')).length;
    const contacted = orders.filter(o => o.status && o.status.includes('تواصل')).length;
    const completed = orders.filter(o => o.status && (o.status.includes('مكتمل') || o.status.includes('تسليم'))).length;
    const cancelled = orders.filter(o => o.status && (o.status.includes('ملغي') || o.status.includes('إلغاء'))).length;

    if (statTotal) statTotal.textContent = total;
    if (statPending) statPending.textContent = pending;
    if (statContacted) statContacted.textContent = contacted;
    if (statCompleted) statCompleted.textContent = completed;

    if (pillCountAll) pillCountAll.textContent = total;
    if (pillCountNew) pillCountNew.textContent = pending;
    if (pillCountContacted) pillCountContacted.textContent = contacted;
    if (pillCountCompleted) pillCountCompleted.textContent = completed;
    if (pillCountCancelled) pillCountCancelled.textContent = cancelled;
  };

  const filterOrders = () => {
    let list = [...allOrders];

    // 1. Status Filter
    if (activeStatusFilter !== 'all') {
      list = list.filter(o => {
        const s = o.status || 'جديد';
        if (activeStatusFilter === 'جديد') return s.includes('جديد') || s.includes('انتظار');
        if (activeStatusFilter === 'تم التواصل') return s.includes('تواصل');
        if (activeStatusFilter === 'مكتمل') return s.includes('مكتمل') || s.includes('تسليم');
        if (activeStatusFilter === 'ملغي') return s.includes('ملغي') || s.includes('إلغاء');
        return true;
      });
    }

    // 2. Console Filter (PS4 / PS5)
    if (activeConsoleFilter !== 'all') {
      list = list.filter(o => {
        if (Array.isArray(o.games) && o.games.length > 0) {
          return o.games.some(g => (g.consoleType || '').includes(activeConsoleFilter));
        }
        return (o.consoleType || '').includes(activeConsoleFilter);
      });
    }

    // 3. Version Filter (برايمري / سكندري)
    if (activeVersionFilter !== 'all') {
      list = list.filter(o => {
        if (Array.isArray(o.games) && o.games.length > 0) {
          return o.games.some(g => (g.accountType || '').includes(activeVersionFilter));
        }
        return (o.accountType || '').includes(activeVersionFilter);
      });
    }

    // 4. Date Filter
    if (activeDateFilter === 'today') {
      const todayStr = new Date().toLocaleDateString('ar-EG');
      list = list.filter(o => {
        if (o.dateFormatted && o.dateFormatted === todayStr) return true;
        if (o.timestamp) {
          const d = new Date(o.timestamp).toLocaleDateString('ar-EG');
          return d === todayStr;
        }
        return false;
      });
    } else if (activeDateFilter === 'week') {
      const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      list = list.filter(o => (o.timestamp || new Date(o.createdAt || 0).getTime()) >= oneWeekAgo);
    }

    // 5. Search Filter (by customer name, phone, game title, console, id)
    if (activeSearchTerm) {
      const q = activeSearchTerm.toLowerCase();
      list = list.filter(o => {
        const matchesCustomer = (o.customerName && o.customerName.toLowerCase().includes(q)) ||
          (o.customerPhone && o.customerPhone.includes(q)) ||
          (o.id && o.id.toLowerCase().includes(q));

        if (matchesCustomer) return true;

        if (Array.isArray(o.games) && o.games.length > 0) {
          return o.games.some(g => (g.title && g.title.toLowerCase().includes(q)) || (g.consoleType && g.consoleType.toLowerCase().includes(q)));
        }

        return (o.gameTitle && o.gameTitle.toLowerCase().includes(q)) ||
          (o.consoleType && o.consoleType.toLowerCase().includes(q));
      });
    }

    return list;
  };

  const renderOrders = () => {
    updateStatsAndPills(allOrders);

    const filtered = filterOrders();

    if (visibleCountEl) visibleCountEl.textContent = filtered.length;

    if (!ordersContainer) return;

    if (filtered.length === 0) {
      ordersContainer.innerHTML = `
        <div class="empty-orders-state">
          <div class="empty-icon-wrap"><i class="fa-solid fa-clipboard-check"></i></div>
          <h3 class="empty-orders-title">لا توجد طلبات تطابق هذا البحث أو الفلتر</h3>
          <p class="empty-orders-sub">عندما يقوم أي عميل بطلب لعبة من المتجر، ستظهر بياناته هنا فوراً في نفس اللحظة.</p>
        </div>
      `;
      return;
    }

    ordersContainer.innerHTML = '';

    filtered.forEach(order => {
      const isNew = !order.status || order.status.includes('جديد');
      const statusVal = order.status || 'جديد';
      const hasMultipleGames = Array.isArray(order.games) && order.games.length > 0;
      const itemsCount = hasMultipleGames ? order.games.length : 1;

      // Status selector class
      let statusClass = 'status-val-new';
      if (statusVal.includes('تواصل')) statusClass = 'status-val-contacted';
      else if (statusVal.includes('مكتمل') || statusVal.includes('تسليم')) statusClass = 'status-val-completed';
      else if (statusVal.includes('ملغي') || statusVal.includes('إلغاء')) statusClass = 'status-val-cancelled';

      const row = document.createElement('div');
      row.className = `order-card-row ${isNew ? 'is-new-order' : ''}`;
      row.dataset.id = order.id;

      // Render Games Column HTML
      let gamesColumnHtml = '';
      if (hasMultipleGames) {
        const gamesListHtml = order.games.map(g => {
          const gConsole = g.consoleType || 'PS5';
          const isG5 = gConsole.includes('PS5') || gConsole.includes('5');
          const isGPrimary = (g.accountType || '').includes('برايمري');
          return `
            <div class="order-game-item-subrow">
              <img src="${resolveImg(g.image)}" alt="${g.title}" class="order-game-mini-thumb" onerror="this.src='../gta.jpeg'" />
              <div class="order-game-mini-info">
                <span class="order-game-mini-title" title="${g.title}">${g.title}</span>
                <div class="order-badges-wrap">
                  <span class="order-console-badge">
                    <i class="fa-brands fa-playstation"></i> ${isG5 ? 'PS5' : 'PS4'}
                  </span>
                  <span class="order-type-badge ${isGPrimary ? 'type-badge-primary' : 'type-badge-secondary'}">
                    <i class="fa-solid ${isGPrimary ? 'fa-crown' : 'fa-gamepad'}"></i> ${isGPrimary ? 'برايمري' : 'سكندري'}
                  </span>
                </div>
              </div>
            </div>
          `;
        }).join('');

        gamesColumnHtml = `
          <div class="order-col-game" style="flex-direction: column; align-items: flex-start; max-width: 360px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
              <span class="order-id-tag">#${order.id}</span>
              <span class="order-items-count-badge"><i class="fa-solid fa-cart-shopping"></i> ${itemsCount} ألعاب</span>
            </div>
            <div class="order-multi-games-list">
              ${gamesListHtml}
            </div>
          </div>
        `;
      } else {
        const isPrimary = (order.accountType || '').includes('برايمري');
        const consoleText = order.consoleType || 'PlayStation 5';
        const isPS5 = consoleText.includes('PS5') || consoleText.includes('5');

        gamesColumnHtml = `
          <div class="order-col-game">
            <img src="${resolveImg(order.gameImage)}" alt="${order.gameTitle}" class="order-game-thumb-img" onerror="this.src='../gta.jpeg'" />
            <div class="order-game-details">
              <span class="order-id-tag">#${order.id}</span>
              <h4 class="order-game-name" title="${order.gameTitle}">${order.gameTitle}</h4>
              <div class="order-badges-wrap">
                <span class="order-console-badge">
                  <i class="fa-brands fa-playstation"></i> ${isPS5 ? 'PS5' : 'PS4'}
                </span>
                <span class="order-type-badge ${isPrimary ? 'type-badge-primary' : 'type-badge-secondary'}">
                  <i class="fa-solid ${isPrimary ? 'fa-crown' : 'fa-gamepad'}"></i> ${order.accountType || 'برايمري'}
                </span>
              </div>
            </div>
          </div>
        `;
      }

      row.innerHTML = `
        <!-- Game & ID & Console Column -->
        ${gamesColumnHtml}

        <!-- Customer Info -->
        <div class="order-col-customer">
          <div class="customer-name-display">
            <i class="fa-solid fa-user" style="color: var(--accent-cyan);"></i>
            <span>${order.customerName || 'بدون اسم'}</span>
          </div>
          <div class="customer-phone-display">
            <i class="fa-solid fa-phone" style="color: #25D366;"></i>
            <span>${order.customerPhone || 'بدون رقم'}</span>
          </div>
          ${order.notes ? `
            <div style="font-size: 0.78rem; color: #94a3b8; margin-top: 2px;">
              <i class="fa-solid fa-message" style="color: var(--accent-gold);"></i> ${order.notes}
            </div>
          ` : ''}
        </div>

        <!-- Time & Date -->
        <div class="order-col-time">
          <div class="order-time-primary">
            <i class="fa-regular fa-clock" style="color: var(--accent-cyan);"></i>
            <span>${order.timeFormatted || 'الساعة'}</span>
          </div>
          <div class="order-date-secondary">
            ${order.dateFormatted || ''} (${getRelativeTime(order.timestamp || order.createdAt)})
          </div>
        </div>

        <!-- Status Selector -->
        <div class="order-col-status">
          <select class="status-select-badge ${statusClass}" data-id="${order.id}">
            <option value="جديد" ${statusVal.includes('جديد') ? 'selected' : ''}>⏳ جديد / قيد الانتظار</option>
            <option value="تم التواصل" ${statusVal.includes('تواصل') ? 'selected' : ''}>📞 تم التواصل</option>
            <option value="تم التسليم" ${statusVal.includes('مكتمل') || statusVal.includes('تسليم') ? 'selected' : ''}>✅ تم التسليم بنجاح</option>
            <option value="ملغي" ${statusVal.includes('ملغي') || statusVal.includes('إلغاء') ? 'selected' : ''}>❌ تم الإلغاء</option>
          </select>
        </div>
      `;

      ordersContainer.appendChild(row);
    });

    // Attach Status change listeners
    document.querySelectorAll('.status-select-badge').forEach(select => {
      select.addEventListener('change', (e) => {
        const orderId = e.target.dataset.id;
        const newStatus = e.target.value;
        updateOrderStatus(orderId, newStatus);
      });
    });
  };

  // --------------------------------------------------------------------------
  // 7. ORDER OPERATIONS (Update Status, Export)
  // --------------------------------------------------------------------------
  const updateOrderStatus = (orderId, newStatus) => {
    const idx = allOrders.findIndex(o => o.id === orderId);
    if (idx !== -1) {
      allOrders[idx].status = newStatus;
      allOrders[idx].updatedAt = new Date().toISOString();
      const updatedOrder = { ...allOrders[idx] };
      saveStoredOrders(allOrders);

      // Notify other tabs
      try {
        if ('BroadcastChannel' in window) {
          const bc = new BroadcastChannel('elmohands_orders_sync');
          bc.postMessage({ type: 'STATUS_UPDATE', orderId, order: updatedOrder });
          bc.close();
        }
      } catch (e) {}

      // Cloud Sync - Always write full order object to prevent field deletion in Firestore
      if (db) {
        db.collection('orders').doc(orderId).set(updatedOrder, { merge: true })
          .then(() => showToast(`تم تغيير حالة الطلب إلى "${newStatus}" وتحديثها سحابياً`))
          .catch((err) => console.warn('Cloud status update error:', err));
      } else {
        showToast(`تم تغيير حالة الطلب إلى "${newStatus}"`);
      }

      renderOrders();
    }
  };

  // Clean Completed Orders
  document.getElementById('btn-clear-completed')?.addEventListener('click', () => {
    const completedOrders = allOrders.filter(o => o.status && (o.status.includes('مكتمل') || o.status.includes('تسليم')));
    if (completedOrders.length === 0) {
      showToast('لا توجد طلبات مكتملة لحذفها!', true);
      return;
    }

    if (confirm(`هل أنت متأكد من حذف جميع الطلبات المكتملة (${completedOrders.length} طلب)؟`)) {
      allOrders = allOrders.filter(o => !o.status || (!o.status.includes('مكتمل') && !o.status.includes('تسليم')));
      saveStoredOrders(allOrders);

      if (db) {
        const batch = db.batch();
        completedOrders.forEach(o => {
          batch.delete(db.collection('orders').doc(o.id));
        });
        batch.commit().catch(err => console.warn('Batch delete error:', err));
      }

      showToast('تم تنظيف الطلبات المكتملة بنجاح ✨');
      renderOrders();
    }
  });

  // Export to CSV
  document.getElementById('btn-export-orders')?.addEventListener('click', () => {
    if (allOrders.length === 0) {
      showToast('لا توجد طلبات لتصديرها!', true);
      return;
    }

    const headers = ['رقم الطلب', 'الألعاب المطلوبة', 'عدد الألعاب', 'نوع الجهاز', 'اسم العميل', 'رقم الهاتف', 'نوع النسخة', 'الوقت', 'التاريخ', 'الحالة', 'ملاحظات'];
    const rows = allOrders.map(o => {
      const gamesStr = Array.isArray(o.games) && o.games.length > 0 
        ? o.games.map((g, i) => `${i+1}. ${g.title} [${g.consoleType || 'PS5'} - ${g.accountType || 'برايمري'}]`).join(' | ')
        : (o.gameTitle || '');
      const countStr = Array.isArray(o.games) && o.games.length > 0 ? o.games.length : 1;

      return [
        `"${o.id}"`,
        `"${gamesStr.replace(/"/g, '""')}"`,
        `"${countStr}"`,
        `"${o.consoleType || 'PlayStation 5'}"`,
        `"${o.customerName || ''}"`,
        `"${o.customerPhone || ''}"`,
        `"${o.accountType || ''}"`,
        `"${o.timeFormatted || ''}"`,
        `"${o.dateFormatted || ''}"`,
        `"${o.status || 'جديد'}"`,
        `"${(o.notes || '').replace(/"/g, '""')}"`
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `طلبات_متجر_المهندس_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('تم تصدير ملف الطلبات بنجاح 📊');
  });

  // --------------------------------------------------------------------------
  // 8. EVENT LISTENERS FOR FILTERS & SEARCH
  // --------------------------------------------------------------------------
  const searchInput = document.getElementById('orders-search-input');
  searchInput?.addEventListener('input', (e) => {
    activeSearchTerm = e.target.value.trim();
    renderOrders();
  });

  const consoleSelect = document.getElementById('filter-console-select');
  consoleSelect?.addEventListener('change', (e) => {
    activeConsoleFilter = e.target.value;
    renderOrders();
  });

  const versionSelect = document.getElementById('filter-version-select');
  versionSelect?.addEventListener('change', (e) => {
    activeVersionFilter = e.target.value;
    renderOrders();
  });

  const dateSelect = document.getElementById('filter-date-select');
  dateSelect?.addEventListener('change', (e) => {
    activeDateFilter = e.target.value;
    renderOrders();
  });

  // Status pills click
  document.querySelectorAll('.status-pill-btn').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.status-pill-btn').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activeStatusFilter = pill.dataset.status || 'all';
      renderOrders();
    });
  });

  // Manual Refresh
  document.getElementById('btn-manual-refresh')?.addEventListener('click', () => {
    allOrders = getStoredOrders();
    renderOrders();
    showToast('تم تحديث قائمة الطلبات 🔄');
  });

  // --------------------------------------------------------------------------
  // 9. INSTANT & REALTIME SYNCHRONIZATION ENGINE
  // --------------------------------------------------------------------------
  let isInitialLoad = true;

  const reloadAndCheckNewOrders = () => {
    const local = getStoredOrders();
    if (local.length > allOrders.length) {
      if (!isInitialLoad) {
        playNewOrderSound();
        showToast('🔔 وصل طلب عميل جديد الآن!');
      }
    }
    if (JSON.stringify(local) !== JSON.stringify(allOrders)) {
      allOrders = local;
      renderOrders();
    }
  };

  const initOrdersSync = () => {
    // 1. Initial Local load
    allOrders = getStoredOrders();
    renderOrders();

    // 2. BroadcastChannel for instant cross-tab / cross-window sync
    try {
      if ('BroadcastChannel' in window) {
        const bc = new BroadcastChannel('elmohands_orders_sync');
        bc.onmessage = (event) => {
          reloadAndCheckNewOrders();
        };
      }
    } catch (e) {
      console.warn('BroadcastChannel sync notice:', e);
    }

    // 3. Storage Event listener
    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEY_ORDERS) {
        reloadAndCheckNewOrders();
      }
    });

    // 4. Window Focus & Visibility changes
    window.addEventListener('focus', reloadAndCheckNewOrders);
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        reloadAndCheckNewOrders();
      }
    });

    // 5. Periodic polling fallback every 1000ms
    setInterval(reloadAndCheckNewOrders, 1000);

    // 6. Firebase Cloud Realtime Listener
    if (db) {
      db.collection('orders').onSnapshot((snapshot) => {
        const localOrders = getStoredOrders();
        const cloudOrders = [];

        snapshot.forEach(doc => {
          const data = doc.data() || {};
          const localCopy = localOrders.find(l => l.id === doc.id) || allOrders.find(a => a.id === doc.id) || {};

          // Safely preserve every field so status updates cannot wipe customer data
          const mergedOrder = {
            id: doc.id,
            games: Array.isArray(data.games) ? data.games : (Array.isArray(localCopy.games) ? localCopy.games : []),
            itemsCount: data.itemsCount || localCopy.itemsCount || (Array.isArray(data.games) && data.games.length ? data.games.length : (Array.isArray(localCopy.games) && localCopy.games.length ? localCopy.games.length : 1)),
            gameId: data.gameId || localCopy.gameId || '',
            gameTitle: data.gameTitle || localCopy.gameTitle || 'لعبة',
            gameImage: data.gameImage || localCopy.gameImage || 'gta.jpeg',
            customerName: data.customerName || localCopy.customerName || 'عميل',
            customerPhone: data.customerPhone || localCopy.customerPhone || '',
            consoleType: data.consoleType || localCopy.consoleType || 'PlayStation 5 (PS5)',
            accountType: data.accountType || localCopy.accountType || 'برايمري (Primary)',
            notes: data.notes || localCopy.notes || '',
            timeFormatted: data.timeFormatted || localCopy.timeFormatted || '',
            dateFormatted: data.dateFormatted || localCopy.dateFormatted || '',
            createdAt: data.createdAt || localCopy.createdAt || new Date().toISOString(),
            timestamp: data.timestamp || localCopy.timestamp || Date.now(),
            status: data.status || localCopy.status || 'جديد'
          };

          cloudOrders.push(mergedOrder);
        });

        // Also preserve any local orders that might not be in cloudOrders yet
        localOrders.forEach(localOrd => {
          if (!cloudOrders.some(c => c.id === localOrd.id)) {
            cloudOrders.push(localOrd);
            // Push missing order to Firestore
            db.collection('orders').doc(localOrd.id).set(localOrd).catch(() => {});
          }
        });

        cloudOrders.sort((a, b) => {
          const tA = a.timestamp || (a.createdAt ? new Date(a.createdAt).getTime() : 0);
          const tB = b.timestamp || (b.createdAt ? new Date(b.createdAt).getTime() : 0);
          return tB - tA;
        });

        if (!isInitialLoad && cloudOrders.length > allOrders.length) {
          playNewOrderSound();
          showToast('🔔 وصل طلب عميل جديد الآن!');
        }

        allOrders = cloudOrders;
        saveStoredOrders(allOrders);
        renderOrders();

        isInitialLoad = false;
        console.log('⚡ Orders synchronized with Firestore cloud:', cloudOrders.length, 'orders');
      }, (err) => {
        console.warn('Firestore orders sync warning:', err);
      });
    } else {
      isInitialLoad = false;
    }
  };

  initOrdersSync();
});
