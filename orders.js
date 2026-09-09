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

  // Fallback controller thumbnail SVG
  const DEFAULT_GAME_THUMB = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='60' height='70' viewBox='0 0 60 70'><rect width='60' height='70' fill='%23090d16' rx='6'/><path d='M18 32h24M30 20v24M40 32a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm-20 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0z' stroke='%2300f0ff' stroke-width='2' stroke-linecap='round'/><circle cx='30' cy='50' r='3' fill='%2300f0ff' opacity='0.5'/></svg>";

  // Multi-tier Smart Image Resolver
  const resolveImgPath = (src) => {
    if (!src) return DEFAULT_GAME_THUMB;
    if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:')) {
      return src;
    }
    const filename = src.split('/').pop().split('\\').pop();
    return `assets/games/${filename}`;
  };

  const getImgFallbackAttr = (src) => {
    if (!src || src.startsWith('data:') || src.startsWith('http')) {
      return `this.onerror=null; this.src='${DEFAULT_GAME_THUMB}';`;
    }
    const filename = src.split('/').pop().split('\\').pop();
    return `this.onerror=null; this.src='../${filename}'; this.onerror=function(){ this.src='${DEFAULT_GAME_THUMB}'; };`;
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
  // 2. DUAL AUDIO & BACKGROUND NOTIFICATION ENGINE
  // --------------------------------------------------------------------------
  const alertAudio = document.getElementById('order-alert-sound');
  const soundToggleBtn = document.getElementById('btn-sound-toggle');
  const soundIcon = document.getElementById('sound-icon');
  const soundText = document.getElementById('sound-text');
  let originalPageTitle = document.title;
  let titleFlashInterval = null;

  // Web Audio API Synthesizer (Plays in foreground & background tabs reliably)
  const playSynthesizedChime = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const notes = [587.33, 880, 1174.66]; // D5, A5, D6 chime chord
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.14);
        gain.gain.setValueAtTime(0.4, ctx.currentTime + idx * 0.14);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.14 + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.14);
        osc.stop(ctx.currentTime + idx * 0.14 + 0.4);
      });
    } catch (e) {
      console.warn('Web Audio note:', e);
    }
  };

  // Request browser notification permissions on first interaction
  const requestNotificationPermission = () => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  };

  document.addEventListener('click', () => {
    requestNotificationPermission();
    // Unlock audio context
    if (alertAudio) {
      try {
        alertAudio.play().then(() => {
          alertAudio.pause();
          alertAudio.currentTime = 0;
        }).catch(() => {});
      } catch (e) {}
    }
  }, { once: true });

  soundToggleBtn?.addEventListener('click', () => {
    isSoundEnabled = !isSoundEnabled;
    soundToggleBtn.classList.toggle('sound-enabled', isSoundEnabled);
    if (soundIcon) {
      soundIcon.className = isSoundEnabled ? 'fa-solid fa-bell' : 'fa-solid fa-bell-slash';
    }
    if (soundText) {
      soundText.textContent = isSoundEnabled ? 'صوت التنبيه: مفعل' : 'صوت التنبيه: مكتوم';
    }
    if (isSoundEnabled) {
      playNewOrderAlert();
      showToast('تم تفعيل صوت التنبيه 🔔');
    } else {
      showToast('تم كتم صوت التنبيه 🔕');
    }
  });

  const flashTabTitle = (newOrder) => {
    if (titleFlashInterval) clearInterval(titleFlashInterval);
    let state = false;
    titleFlashInterval = setInterval(() => {
      document.title = state ? `🔔 (طلب جديد!) ${newOrder?.customerName || 'عميل'}` : `⚡ ${originalPageTitle}`;
      state = !state;
    }, 800);

    const onFocus = () => {
      if (titleFlashInterval) {
        clearInterval(titleFlashInterval);
        titleFlashInterval = null;
      }
      document.title = originalPageTitle;
      window.removeEventListener('focus', onFocus);
    };
    window.addEventListener('focus', onFocus);
  };

  const playNewOrderAlert = (newOrder = null) => {
    if (!isSoundEnabled) return;

    // 1. Play MP3 Audio Element
    if (alertAudio) {
      try {
        alertAudio.currentTime = 0;
        const playPromise = alertAudio.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => playSynthesizedChime());
        }
      } catch (e) {
        playSynthesizedChime();
      }
    } else {
      playSynthesizedChime();
    }

    // 2. Secondary Web Audio Synthesizer Guarantee
    playSynthesizedChime();

    // 3. System Notification (when tab is in background or minimized)
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        const title = '🔔 وصل طلب جديد في المتجر!';
        const body = newOrder ? `${newOrder.customerName || 'عميل'} - ${newOrder.gameTitle || 'ألعاب PlayStation'}` : 'طلب جديد وصل في لوحة التحكم';
        const notif = new Notification(title, {
          body,
          icon: 'assets/images/nav_logo.jpg',
          tag: 'new-order-alert',
          renotify: true
        });
        notif.onclick = () => {
          window.focus();
          notif.close();
        };
      } catch (e) {}
    }

    // 4. Flash Tab Title if not active
    if (document.hidden) {
      flashTabTitle(newOrder);
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
  // 4. FIREBASE CLOUD & REALTIME DATABASE ENGINE
  // --------------------------------------------------------------------------
  const firebaseConfig = {
    apiKey: "AIzaSyCs-VmEzb7q8oIAzGZ8QpHllPI0yGtdsPA",
    authDomain: "elmohands-store.firebaseapp.com",
    databaseURL: "https://elmohands-store-default-rtdb.firebaseio.com",
    projectId: "elmohands-store",
    storageBucket: "elmohands-store.firebasestorage.app",
    messagingSenderId: "577193319663",
    appId: "1:577193319663:web:fc57174413106afb474f1a",
    measurementId: "G-8GME76MV08"
  };

  let rtdb = null;
  let db = null;
  try {
    if (typeof firebase !== 'undefined') {
      if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
      }
      try {
        rtdb = firebase.database();
        console.log('Orders dashboard connected to Firebase Realtime Database 🚀');
      } catch (e) {
        console.warn('RTDB notice:', e);
      }
      try {
        db = firebase.firestore();
      } catch (e) {}
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
            gameImage: o.gameImage || (Array.isArray(o.games) && o.games[0] ? o.games[0].image : ''),
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
          <p class="empty-orders-sub">عندما يقوم أي عميل بطلب لعبة من المتجر، ستظهر بياناته هنا فوراً في نفس اللحظة عبر السحابة.</p>
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
          const imgSrc = resolveImgPath(g.image);
          const fallbackAttr = getImgFallbackAttr(g.image);

          return `
            <div class="order-game-item-subrow">
              <img src="${imgSrc}" alt="${g.title}" class="order-game-mini-thumb" onerror="${fallbackAttr}" />
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
        const imgSrc = resolveImgPath(order.gameImage);
        const fallbackAttr = getImgFallbackAttr(order.gameImage);

        gamesColumnHtml = `
          <div class="order-col-game">
            <img src="${imgSrc}" alt="${order.gameTitle}" class="order-game-thumb-img" onerror="${fallbackAttr}" />
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
  // 7. ORDER OPERATIONS (Update Status, Export, Delete)
  // --------------------------------------------------------------------------
  const updateOrderStatus = (orderId, newStatus) => {
    const idx = allOrders.findIndex(o => o.id === orderId);
    if (idx !== -1) {
      allOrders[idx].status = newStatus;
      allOrders[idx].updatedAt = new Date().toISOString();
      const updatedOrder = { ...allOrders[idx] };
      saveStoredOrders(allOrders);

      // Notify other local tabs
      try {
        if ('BroadcastChannel' in window) {
          const bc = new BroadcastChannel('elmohands_orders_sync');
          bc.postMessage({ type: 'STATUS_UPDATE', orderId, order: updatedOrder });
          bc.close();
        }
      } catch (e) {}

      // Realtime Database Cloud Sync
      if (rtdb) {
        rtdb.ref('orders/' + orderId).update({
          status: newStatus,
          updatedAt: updatedOrder.updatedAt
        }).catch(err => console.warn('RTDB status update error:', err));
      }

      // REST API PATCH fallback
      try {
        fetch(`https://elmohands-store-default-rtdb.firebaseio.com/orders/${orderId}.json`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus, updatedAt: updatedOrder.updatedAt })
        }).catch(() => {});
      } catch (e) {}

      showToast(`تم تغيير حالة الطلب إلى "${newStatus}" سحابياً ✨`);
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

      // Delete from Realtime Database Cloud
      completedOrders.forEach(o => {
        if (rtdb) {
          rtdb.ref('orders/' + o.id).remove().catch(() => {});
        }
        try {
          fetch(`https://elmohands-store-default-rtdb.firebaseio.com/orders/${o.id}.json`, {
            method: 'DELETE'
          }).catch(() => {});
        } catch (e) {}
      });

      showToast('تم تنظيف الطلبات المكتملة سحابياً بنجاح ✨');
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
    fetchCloudOrdersDirect();
    showToast('جاري تحديث قائمة الطلبات سحابياً 🔄');
  });

  // --------------------------------------------------------------------------
  // 9. INSTANT & REALTIME CLOUD SYNCHRONIZATION ENGINE
  // --------------------------------------------------------------------------
  let isInitialLoad = true;

  const processIncomingOrders = (cloudOrdersMap) => {
    const list = [];
    if (cloudOrdersMap && typeof cloudOrdersMap === 'object') {
      Object.keys(cloudOrdersMap).forEach(key => {
        const item = cloudOrdersMap[key];
        if (item && typeof item === 'object') {
          list.push({
            id: item.id || key,
            games: Array.isArray(item.games) ? item.games : [],
            itemsCount: item.itemsCount || (Array.isArray(item.games) && item.games.length ? item.games.length : 1),
            gameTitle: item.gameTitle || (Array.isArray(item.games) && item.games.length ? item.games.map(g => g.title).join(' + ') : 'لعبة'),
            gameImage: item.gameImage || (Array.isArray(item.games) && item.games[0] ? item.games[0].image : ''),
            customerName: item.customerName || 'عميل',
            customerPhone: item.customerPhone || '',
            consoleType: item.consoleType || 'PlayStation 5 (PS5)',
            accountType: item.accountType || 'برايمري (Primary)',
            notes: item.notes || '',
            timeFormatted: item.timeFormatted || '',
            dateFormatted: item.dateFormatted || '',
            createdAt: item.createdAt || new Date().toISOString(),
            timestamp: item.timestamp || (item.createdAt ? new Date(item.createdAt).getTime() : Date.now()),
            status: item.status || 'جديد'
          });
        }
      });
    }

    list.sort((a, b) => {
      const tA = a.timestamp || (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const tB = b.timestamp || (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      return tB - tA;
    });

    // Detect new incoming order
    if (!isInitialLoad && list.length > allOrders.length) {
      const newest = list[0];
      playNewOrderAlert(newest);
      showToast(`🔔 وصل طلب جديد: ${newest.customerName} (${newest.gameTitle})`);
    }

    allOrders = list;
    saveStoredOrders(allOrders);
    renderOrders();
    isInitialLoad = false;
  };

  const fetchCloudOrdersDirect = () => {
    fetch('https://elmohands-store-default-rtdb.firebaseio.com/orders.json')
      .then(res => res.json())
      .then(data => {
        if (data) {
          processIncomingOrders(data);
        } else if (isInitialLoad) {
          allOrders = getStoredOrders();
          renderOrders();
          isInitialLoad = false;
        }
      })
      .catch(err => {
        console.warn('Direct cloud fetch notice:', err);
        if (isInitialLoad) {
          allOrders = getStoredOrders();
          renderOrders();
          isInitialLoad = false;
        }
      });
  };

  const initOrdersSync = () => {
    // 1. Initial Local load for instant display
    allOrders = getStoredOrders();
    renderOrders();

    // 2. Direct HTTP fetch for immediate cloud data
    fetchCloudOrdersDirect();

    // 3. Realtime WebSockets listener via Firebase Realtime Database
    if (rtdb) {
      rtdb.ref('orders').on('value', (snapshot) => {
        const val = snapshot.val();
        if (val) {
          processIncomingOrders(val);
          console.log('⚡ Realtime Database synced orders');
        }
      }, (err) => {
        console.warn('Realtime Database listener error:', err);
      });
    }

    // 4. Polling fallback every 3000ms
    setInterval(fetchCloudOrdersDirect, 3000);

    // 5. BroadcastChannel for instant local tab sync
    try {
      if ('BroadcastChannel' in window) {
        const bc = new BroadcastChannel('elmohands_orders_sync');
        bc.onmessage = () => {
          fetchCloudOrdersDirect();
        };
      }
    } catch (e) {}

    // 6. Window Focus & Visibility events
    window.addEventListener('focus', fetchCloudOrdersDirect);
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        fetchCloudOrdersDirect();
      }
    });
  };

  initOrdersSync();
});
