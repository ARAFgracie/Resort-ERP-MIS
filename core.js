/* core.js - shared logic for every page. Owner: Claude A.
   Load order: seed-rooms.js, seed.js, core.js, then the page script.
   Data lives in localStorage for the preview build. In production every H.ops.* call becomes an API request
   to the SQL backend (see db/schema.sql); the page scripts do not need to change. */
(function (global) {
  'use strict';

  var KEY = 'herp.state.v1', SKEY = 'herp.session.v1', SEEN = 'herp.seen.';
  var D = document;
  var H = global.HERP = {};
  var listeners = [];
  var mem = null;

  /* ============ helpers ============ */
  var pad = function (n) { return String(n).padStart(2, '0'); };
  var iso = function (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  var parse = function (s) { var p = String(s).split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); };
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  H.today = function () { return iso(new Date()); };
  H.nowHM = function () { var d = new Date(); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
  H.addDays = function (s, n) { var d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
  H.diffDays = function (a, b) { return Math.round((parse(b) - parse(a)) / 86400000); };
  H.date = function (s) { if (!s) return ''; var d = parse(s); return d.getDate() + ' ' + MON[d.getMonth()] + ' ' + d.getFullYear(); };
  H.shortDate = function (s) { if (!s) return ''; var d = parse(s); return d.getDate() + ' ' + MON[d.getMonth()]; };
  H.esc = function (v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  };
  H.money = function (n) {
    n = Math.round(Number(n) || 0);
    return (n < 0 ? '-' : '') + 'BDT ' + Math.abs(n).toLocaleString('en-IN');
  };
  H.num = function (n) { return Math.round(Number(n) || 0).toLocaleString('en-IN'); };
  H.initials = function (name) {
    var p = String(name || '?').replace(/^(Mr|Mrs|Ms|Md)\.?\s+/i, '').trim().split(/\s+/);
    return ((p[0] || '?')[0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
  };
  H.qs = function (name) { try { return new URLSearchParams(global.location.search).get(name); } catch (e) { return null; } };
  H.$ = function (sel, root) { return (root || D).querySelector(sel); };
  H.$$ = function (sel, root) { return Array.prototype.slice.call((root || D).querySelectorAll(sel)); };
  H.debounce = function (fn, ms) { var t; return function () { var a = arguments, c = this; clearTimeout(t); t = setTimeout(function () { fn.apply(c, a); }, ms); }; };

  /* ============ storage ============ */
  function read(key) { try { return JSON.parse(global.HERP_STORE.get(key)); } catch (e) { return null; } }
  function write(key, val) { try { global.HERP_STORE.set(key, JSON.stringify(val)); } catch (e) { /* stay in memory */ } }
  function fresh(prev) {
    var s = global.HERP_SEED.build(H.today());
    if (prev && prev.access) s.access = prev.access;
    write(KEY, s);
    return s;
  }
  function fire() { listeners.slice().forEach(function (fn) { try { fn(); } catch (e) { console.error(e); } }); }

  H.state = function () {
    if (!mem) {
      var s = read(KEY);
      if (!s || s.version !== 1 || s.seedDate !== H.today()) s = fresh(s);
      mem = s;
    }
    return mem;
  };
  H.save = function () { write(KEY, mem); fire(); };
  H.reset = function () { mem = fresh(null); fire(); };
  H.onChange = function (fn) { listeners.push(fn); };
  global.addEventListener('storage', function (e) { if (e.key === KEY) { mem = null; fire(); } });

  var IDS = { booking: ['BK', 'BK-'], receipt: ['RC', 'RC-'], guest: ['GU', 'G-'], request: ['RQ', 'RQ-'], ticket: ['TS', 'TS-'], task: ['TK', 'TK-'], approval: ['DA', 'DA-'], staff: ['ST', 'S-'] };
  H.nextId = function (kind) { var s = H.state(), k = IDS[kind]; return k[1] + (s.counters[k[0]]++); };

  H.TYPES = { STD: 'Standard', DLX: 'Deluxe', FAM: 'Family', STE: 'Suite' };
  H.RATES = global.HERP_SEED.RATES;
  H.TAX = global.HERP_SEED.TAX;

  H.log = function (text, kind) {
    var s = H.state();
    s.activity.unshift({ date: H.today(), time: H.nowHM(), text: text, kind: kind || 'info' });
    if (s.activity.length > 80) s.activity.length = 80;
  };

  /* ============ roles, pages, access ============ */
  var ROLES = {
    admin: { label: 'Admin' }, owner: { label: 'Owner' }, manager: { label: 'Manager' },
    frontdesk: { label: 'Front Desk' }, housekeeper: { label: 'Housekeeper', home: 'mobile-housekeeper.html' },
    service: { label: 'Service Staff', home: 'mobile-service.html' }
  };
  var PAGES = [
    { key: 'dashboard', label: 'Dashboard', icon: 'grid' },
    { key: 'front-desk', label: 'Front Desk', icon: 'key' },
    { key: 'room-booking', label: 'Room Booking', icon: 'calendar' },
    { key: 'rooms', label: 'Rooms', icon: 'home' },
    { key: 'guest-services', label: 'Guest Services', icon: 'chat' },
    { key: 'housekeeping', label: 'Housekeeping', icon: 'check' },
    { key: 'staff', label: 'Staff Information', icon: 'users' },
    { key: 'cash', label: 'Cash Receiving', icon: 'cash' },
    { key: 'analytics', label: 'Analytics', icon: 'chart' },
    { key: 'search', label: 'Search', icon: 'search' }
  ];
  var ALL = PAGES.map(function (p) { return p.key; });
  var DEFAULT_ACCESS = {
    admin: ALL,
    owner: ['dashboard', 'cash', 'analytics'],
    manager: ALL,
    frontdesk: ['dashboard', 'front-desk', 'room-booking', 'rooms', 'guest-services', 'housekeeping', 'cash', 'search'],
    housekeeper: ['mobile-housekeeper'],
    service: ['mobile-service']
  };
  H.ROLES = ROLES; H.PAGES = PAGES; H.DEFAULT_ACCESS = DEFAULT_ACCESS;

  H.allowed = function (role) {
    if (role === 'admin') return ALL;
    var a = H.state().access;
    return (a && a[role] && a[role].length) ? a[role] : (DEFAULT_ACCESS[role] || []);
  };
  H.home = function (role) {
    if (ROLES[role] && ROLES[role].home) return ROLES[role].home;
    var first = H.allowed(role)[0];
    return first ? first + '.html' : 'login.html';
  };
  H.roleFromStaff = function (label) {
    return { 'Manager': 'manager', 'Front Desk': 'frontdesk', 'Housekeeper': 'housekeeper', 'Service Staff': 'service' }[label] || null;
  };

  /* ============ session ============ */
  H.session = function () { return read(SKEY); };
  H.user = function () {
    var ses = H.session();
    if (!ses) return null;
    var u = H.state().users.filter(function (x) { return x.username === ses.username; })[0];
    return u ? { username: u.username, role: u.role, name: u.name, staffId: u.staffId } : null;
  };
  H.login = function (username, password, role) {
    username = String(username || '').trim().toLowerCase();
    var u = H.state().users.filter(function (x) { return x.username === username && x.password === password; })[0];
    if (!u) return { ok: false, error: 'Wrong username or password.' };
    if (role && role !== u.role) return { ok: false, error: 'This account does not have the ' + ROLES[role].label + ' role. Pick the right role.' };
    write(SKEY, { username: u.username, at: Date.now() });
    return { ok: true, role: u.role };
  };
  H.logout = function () {
    try { global.HERP_STORE.remove(SKEY); } catch (e) { /* ignore */ }
    global.location.href = 'login.html';
  };
  H.staffRecord = function (u) {
    u = u || H.user();
    if (!u) return null;
    return H.state().staff.filter(function (s) { return s.id === u.staffId; })[0] || null;
  };

  /* ============ icons ============ */
  var ICONS = {
    grid: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
    key: '<path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    home: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
    chat: '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>',
    check: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    cash: '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
    chart: '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
    search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    bell: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
    moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
    sun: '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>'
  };
  H.icon = function (name) { return '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[name] || '') + '</svg>'; };

  /* ============ badges ============ */
  H.badge = function (cls, label) { return '<span class="badge' + (cls ? ' badge--' + cls : '') + '">' + H.esc(label) + '</span>'; };
  H.priBadge = function (p) { return H.badge({ Low: 'vacant', Medium: 'dirty', High: 'maintenance', Urgent: 'maintenance' }[p] || '', p); };
  H.reqBadge = function (s) { return H.badge({ Pending: 'reserved', 'In progress': 'dirty', Done: 'vacant' }[s] || '', s); };
  H.ticketBadge = function (s) { return H.badge({ Open: 'dirty', New: 'reserved', Closed: 'vacant', Urgent: 'maintenance' }[s] || '', s); };
  H.roomBadge = function (s) { return H.badge(s, s.charAt(0).toUpperCase() + s.slice(1)); };
  H.bookingBadge = function (b) {
    if (b.status === 'expected') return H.badge('reserved', 'Expected');
    if (b.status === 'in-house') return H.badge('occupied', 'In house');
    if (b.status === 'checked-out') return H.badge('vacant', 'Checked out');
    return H.badge('', 'Cancelled');
  };

  /* ============ toast ============ */
  H.toast = function (msg, type) {
    var box = D.getElementById('toasts');
    if (!box) { box = D.createElement('div'); box.id = 'toasts'; box.className = 'toasts'; box.setAttribute('aria-live', 'polite'); D.body.appendChild(box); }
    var t = D.createElement('div');
    t.className = 'toast toast--' + (type || 'success');
    t.setAttribute('role', 'status');
    t.textContent = msg;
    box.appendChild(t);
    setTimeout(function () { t.remove(); }, 4200);
  };

  /* ============ modal and dialog ============ */
  var lastFocus = null;
  H.modal = {
    open: function (id) {
      var m = typeof id === 'string' ? D.getElementById(id) : id;
      if (!m) return;
      lastFocus = D.activeElement;
      m.classList.add('is-open');
      var f = m.querySelector('input:not([type=hidden]), select, textarea, button.btn--primary');
      if (f) setTimeout(function () { try { f.focus(); } catch (e) { /* ignore */ } }, 30);
    },
    close: function (id) {
      var m = typeof id === 'string' ? D.getElementById(id) : id;
      if (!m) return;
      m.classList.remove('is-open');
      /* a modal opened by loading the page with #id in the URL is shown by CSS :target; clearing the hash hides it */
      if (m.id && global.location.hash === '#' + m.id) global.location.hash = '';
      if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) { /* ignore */ } }
    }
  };

  /* H.dialog({title, html, ok, cancel, danger, read}) -> Promise(value | null).
     read(form) may return {error:'text'} to keep the dialog open, or any value to resolve with. */
  H.dialog = function (o) {
    return new Promise(function (resolve) {
      var wrap = D.createElement('div');
      wrap.className = 'modal is-open';
      wrap.setAttribute('role', 'dialog');
      wrap.setAttribute('aria-modal', 'true');
      wrap.innerHTML =
        '<div class="modal__backdrop"></div>' +
        '<form class="modal__box card" novalidate>' +
        '<h2 class="card__title">' + H.esc(o.title || '') + '</h2>' +
        '<div class="dialog__body">' + (o.html || '') + '</div>' +
        '<p class="field-error" role="alert" hidden></p>' +
        '<div class="modal__actions">' +
        (o.cancel === false ? '' : '<button type="button" class="btn" data-cancel>' + H.esc(o.cancel || 'Cancel') + '</button>') +
        '<button type="submit" class="btn ' + (o.danger ? 'btn--danger' : 'btn--primary') + '">' + H.esc(o.ok || 'OK') + '</button>' +
        '</div></form>';
      D.body.appendChild(wrap);
      var prev = D.activeElement, form = wrap.querySelector('form'), err = wrap.querySelector('.field-error');
      function done(v) { wrap.remove(); if (prev && prev.focus) { try { prev.focus(); } catch (e) { /* ignore */ } } resolve(v); }
      wrap.querySelector('.modal__backdrop').addEventListener('click', function () { done(null); });
      var c = wrap.querySelector('[data-cancel]');
      if (c) c.addEventListener('click', function () { done(null); });
      wrap.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.stopPropagation(); done(null); } });
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var v = o.read ? o.read(form) : true;
        if (v && v.error) { err.textContent = v.error; err.hidden = false; return; }
        done(v === undefined ? true : v);
      });
      var f = form.querySelector('input:not([type=hidden]), select, textarea') || form.querySelector('button[type=submit]');
      setTimeout(function () { if (f) f.focus(); }, 30);
    });
  };
  H.confirm = function (title, text, ok, danger) {
    return H.dialog({ title: title, html: '<p class="modal__text">' + H.esc(text) + '</p>', ok: ok || 'Confirm', danger: danger });
  };

  /* ============ theme ============ */
  function applyTheme(t) {
    D.documentElement.setAttribute('data-theme', t);
    try { global.HERP_STORE.set('herp.theme', t); } catch (e) { /* ignore */ }
    H.$$('[data-theme-toggle]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(t === 'dark'));
      b.innerHTML = H.icon(t === 'dark' ? 'sun' : 'moon') + '<span class="theme-label">' + (t === 'dark' ? 'Light mode' : 'Dark mode') + '</span>';
    });
  }
  H.toggleTheme = function () { applyTheme(D.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'); };
  H.bindTheme = function () {
    H.$$('.login__theme, .mhead__theme').forEach(function (b) { b.setAttribute('data-theme-toggle', ''); });
    H.$$('[data-theme-toggle]').forEach(function (b) { if (!b.__bound) { b.__bound = true; b.addEventListener('click', H.toggleTheme); } });
    applyTheme(D.documentElement.getAttribute('data-theme') || 'light');
  };

  /* ============ printing ============ */
  H.receiptHtml = function (b, r) {
    var line = function (k, v) { return '<dt>' + H.esc(k) + '</dt><dd>' + H.esc(v) + '</dd>'; };
    var disc = b.discountStatus === 'approved' && b.discount ? line('Discount', '-' + H.money(b.discount)) : '';
    return '<div class="receipt">' +
      '<div class="receipt__head"><strong>[Hotel Name]</strong>Room booking receipt</div>' +
      '<dl class="receipt__lines">' +
      line('Booking', b.id) + (r ? line('Receipt', r.id) : '') + line('Guest', b.guest) + line('Phone', b.phone) +
      line('Room', b.room + ' (' + (H.TYPES[b.type] || b.type) + ')') +
      line('Check-in', H.date(b.checkIn)) + line('Check-out', H.date(b.checkOut)) + line('Nights', b.nights) +
      line('Rate per night', H.money(b.rate)) + line('Subtotal', H.money(b.subtotal)) + line('Tax (15%)', H.money(b.tax)) + disc +
      '</dl>' +
      '<div class="receipt__total"><span>Total</span><span>' + H.money(b.total) + '</span></div>' +
      '<dl class="receipt__lines">' + line('Paid', H.money(b.paid)) + line('Balance due', H.money(b.due)) +
      (r ? line('Method', r.method) + line('Received by', r.by) : '') +
      line('Printed', H.date(H.today()) + ' ' + H.nowHM()) + '</dl></div>';
  };
  H.printReceipt = function (html) {
    var box = D.getElementById('receiptPrint');
    if (!box) { box = D.createElement('div'); box.id = 'receiptPrint'; D.body.appendChild(box); }
    box.innerHTML = html;
    D.body.classList.add('printing-receipt');
    setTimeout(function () { global.print(); D.body.classList.remove('printing-receipt'); }, 50);
  };

  /* ============ business operations (the "API") ============ */
  var ops = H.ops = {};
  var S = function () { return H.state(); };
  var me = function () { var u = H.user(); return u ? u.name : 'System'; };
  var isMgr = function () { var u = H.user(); return !!u && (u.role === 'manager' || u.role === 'admin'); };

  ops.room = function (no) { return S().rooms.filter(function (r) { return r.no === String(no).toUpperCase(); })[0] || null; };
  ops.booking = function (id) { return S().bookings.filter(function (b) { return b.id === id; })[0] || null; };
  ops.guestOf = function (b) { return S().guests.filter(function (g) { return g.id === b.guestId; })[0] || null; };
  ops.roomBooking = function (no) {
    return S().bookings.filter(function (b) { return b.room === no && b.status === 'in-house'; })[0] || null;
  };
  ops.roomStats = function () {
    var c = { total: 0, vacant: 0, occupied: 0, dirty: 0, maintenance: 0, reserved: 0 };
    S().rooms.forEach(function (r) { c.total++; c[r.status]++; });
    return c;
  };
  ops.floorStats = function () {
    var f = [];
    S().rooms.forEach(function (r) {
      var o = f[r.floor] || (f[r.floor] = { floor: r.floor, total: 0, vacant: 0, occupied: 0, dirty: 0, maintenance: 0, reserved: 0 });
      o.total++; o[r.status]++;
    });
    return f;
  };
  ops.available = function (type, ci, co) {
    var t = H.today();
    return S().rooms.filter(function (r) {
      if (type && r.type !== type) return false;
      if (r.status === 'maintenance') return false;
      if (ci === t && r.status !== 'vacant') return false;
      return !S().bookings.some(function (b) {
        return b.room === r.no && (b.status === 'expected' || b.status === 'in-house') && b.checkIn < co && b.checkOut > ci;
      });
    });
  };
  ops.settleRoom = function (no) {
    var r = ops.room(no); if (!r) return;
    var arriving = S().bookings.some(function (b) { return b.room === no && b.status === 'expected' && b.checkIn === H.today(); });
    r.status = arriving ? 'reserved' : 'vacant';
  };

  /* receipts and payments */
  function makeReceipt(b, amount, method, note, status) {
    var r = { id: H.nextId('receipt'), bookingId: b.id, guest: b.guest, room: b.room, amount: amount, method: method || 'Cash', by: me(), date: H.today(), time: H.nowHM(), status: status || 'Received', note: note || '' };
    S().receipts.push(r);
    H.log('Cash receipt ' + H.money(amount) + ' received for Room ' + b.room, 'cash');
    return r;
  }
  ops.collectPayment = function (bid, amount, method, note) {
    var b = ops.booking(bid);
    amount = Math.round(Number(amount) || 0);
    if (!b || amount <= 0) return null;
    amount = Math.min(amount, b.due);
    if (amount <= 0) return null;
    b.paid += amount; b.due -= amount;
    var r = makeReceipt(b, amount, method, note);
    H.save();
    return r;
  };
  ops.refund = function (rid) {
    if (!isMgr()) return false;
    var r = S().receipts.filter(function (x) { return x.id === rid; })[0];
    if (!r || r.status === 'Refunded') return false;
    r.status = 'Refunded';
    var b = ops.booking(r.bookingId);
    if (b) { b.paid = Math.max(0, b.paid - r.amount); b.due = Math.max(0, b.total - b.paid); }
    H.log('Refund ' + H.money(r.amount) + ' issued for Room ' + r.room, 'cash');
    H.save();
    return true;
  };
  ops.confirmReceipt = function (rid) {
    var r = S().receipts.filter(function (x) { return x.id === rid; })[0];
    if (!r || r.status !== 'Pending') return false;
    r.status = 'Received';
    H.log('Mobile banking receipt ' + r.id + ' confirmed for Room ' + r.room, 'cash');
    H.save();
    return true;
  };
  ops.decideDiscount = function (id, approve) {
    if (!isMgr()) return false;
    var a = S().approvals.filter(function (x) { return x.id === id; })[0];
    if (!a || a.status !== 'pending') return false;
    a.status = approve ? 'approved' : 'rejected';
    a.decidedBy = me();
    var b = ops.booking(a.bookingId);
    if (b) {
      if (approve) { b.discount = a.amount; b.discountStatus = 'approved'; b.total = Math.max(0, b.subtotal + b.tax - a.amount); b.due = Math.max(0, b.total - b.paid); }
      else { b.discount = 0; b.discountStatus = 'rejected'; }
    }
    H.log('Discount ' + H.money(a.amount) + ' ' + (approve ? 'approved' : 'rejected') + ' for Room ' + a.room, 'cash');
    H.save();
    return true;
  };
  ops.closeDay = function (counted) {
    var exp = ops.cashExpected(H.today());
    S().closes[H.today()] = { expected: exp, counted: counted, diff: counted - exp, by: me(), time: H.nowHM() };
    H.log('Day closed. Counted ' + H.money(counted) + ', difference ' + H.money(counted - exp), 'cash');
    H.save();
  };
  ops.cashExpected = function (date) {
    return S().receipts.filter(function (r) { return r.date === date && r.method === 'Cash' && r.status === 'Received'; })
      .reduce(function (a, r) { return a + r.amount; }, 0);
  };

  /* bookings */
  ops.createBooking = function (o) {
    var s = S(), u = H.user(), room = ops.room(o.room);
    var nights = H.diffDays(o.checkIn, o.checkOut), rate = H.RATES[room.type];
    var subtotal = rate * nights, tax = Math.round(subtotal * H.TAX), total = subtotal + tax;
    var disc = Math.max(0, Math.round(Number(o.discount) || 0)), dStatus = 'none', stored = 0;
    if (disc > 0) {
      if (isMgr()) { dStatus = 'approved'; stored = Math.min(disc, total); total -= stored; }
      else { dStatus = 'pending'; stored = disc; }
    }
    var guest = { id: H.nextId('guest'), name: o.name.trim(), phone: o.phone.trim(), idType: o.idType || 'NID', idNo: (o.idNo || '').trim(), notes: '' };
    s.guests.push(guest);
    var paid = Math.max(0, Math.min(Math.round(Number(o.paid) || 0), total));
    var nowIn = o.checkIn === H.today() && !!o.checkInNow;
    var b = {
      id: H.nextId('booking'), guestId: guest.id, guest: guest.name, phone: guest.phone, room: room.no, type: room.type,
      checkIn: o.checkIn, checkOut: o.checkOut, nights: nights, rate: rate, subtotal: subtotal, tax: tax,
      discount: stored, discountStatus: dStatus, total: total, paid: paid, due: total - paid,
      status: nowIn ? 'in-house' : 'expected', eta: nowIn ? null : (o.checkIn === H.today() ? H.nowHM() : '14:00'),
      arrivedAt: nowIn ? H.nowHM() : null, departedAt: null, adults: o.adults || 1, children: o.children || 0,
      source: o.source || 'Walk-in', createdAt: H.today(), by: u ? u.name : ''
    };
    s.bookings.push(b);
    if (nowIn) { room.status = 'occupied'; room.bookingId = b.id; }
    else if (o.checkIn === H.today()) room.status = 'reserved';
    var rc = paid > 0 ? makeReceipt(b, paid, o.method, 'Booking payment') : null;
    if (dStatus === 'pending') {
      s.approvals.push({ id: H.nextId('approval'), bookingId: b.id, guest: b.guest, room: b.room, amount: stored, reason: o.reason || 'Requested at booking', by: me(), date: H.today(), time: H.nowHM(), status: 'pending' });
    }
    H.log('Walk-in booking confirmed, Room ' + b.room + ', ' + nights + (nights === 1 ? ' night' : ' nights'), 'booking');
    if (nowIn) H.log('Room ' + b.room + ' checked in, ' + b.guest, 'checkin');
    H.save();
    return { booking: b, receipt: rc };
  };
  ops.checkIn = function (bid) {
    var b = ops.booking(bid), r = b && ops.room(b.room);
    if (!b || !r) return { ok: false, error: 'Booking not found.' };
    if (b.status !== 'expected') return { ok: false, error: 'This guest is already checked in.' };
    if (r.status === 'dirty' || r.status === 'maintenance') return { ok: false, error: 'Room ' + b.room + ' is not ready (' + r.status + ').' };
    b.status = 'in-house'; b.arrivedAt = H.nowHM();
    r.status = 'occupied'; r.bookingId = b.id;
    H.log('Room ' + b.room + ' checked in, ' + b.guest, 'checkin');
    H.save();
    return { ok: true };
  };
  ops.checkOut = function (bid) {
    var b = ops.booking(bid), r = b && ops.room(b.room);
    if (!b || !r) return { ok: false, error: 'Booking not found.' };
    if (b.status !== 'in-house') return { ok: false, error: 'This guest is not in house.' };
    if (b.due > 0) return { ok: false, error: 'Balance of ' + H.money(b.due) + ' is still due.' };
    b.status = 'checked-out'; b.departedAt = H.nowHM();
    r.status = 'dirty'; r.bookingId = null;
    S().tasks.push({ id: H.nextId('task'), room: r.no, type: 'Checkout cleaning', assignee: '', priority: 'Normal', state: 'dirty', note: 'Checked out ' + H.nowHM(), time: H.nowHM(), requested: false });
    H.log('Room ' + b.room + ' checked out, ' + b.guest, 'checkout');
    H.log('Room ' + b.room + ' marked dirty after check-out', 'housekeeping');
    H.save();
    return { ok: true };
  };
  ops.saveGuestNotes = function (bid, text) {
    var g = ops.guestOf(ops.booking(bid));
    if (g) { g.notes = text; H.save(); }
  };

  /* housekeeping and room status */
  ops.openTask = function (no) { return S().tasks.filter(function (t) { return t.room === no && t.state !== 'ready'; })[0] || null; };
  ops.task = function (id) { return S().tasks.filter(function (t) { return t.id === id; })[0] || null; };
  ops.requestClean = function (no) {
    var t = ops.openTask(no);
    if (!t) { t = { id: H.nextId('task'), room: no, type: 'Room cleaning', assignee: '', priority: 'Normal', state: 'dirty', note: 'Requested by ' + me(), time: H.nowHM(), requested: false }; S().tasks.push(t); }
    t.requested = true; t.time = H.nowHM();
    H.log('Cleaning requested for Room ' + no + ' by ' + me(), 'housekeeping');
    H.save();
  };
  ops.assignTask = function (no, who, priority) {
    var r = ops.room(no);
    if (!r) return { ok: false, error: 'Room ' + no + ' does not exist.' };
    if (r.status === 'maintenance') return { ok: false, error: 'Room ' + no + ' is under maintenance.' };
    var t = ops.openTask(no);
    if (!t) {
      t = { id: H.nextId('task'), room: no, type: r.status === 'occupied' ? 'Stay-over service' : (r.status === 'dirty' ? 'Checkout cleaning' : 'Deep clean'), assignee: '', priority: 'Normal', state: 'dirty', note: 'Assigned by ' + me(), time: H.nowHM(), requested: false };
      S().tasks.push(t);
      if (r.status === 'vacant') r.status = 'dirty';
    }
    t.assignee = who; t.priority = priority || 'Normal'; t.requested = false;
    if (t.state === 'progress') t.note = who + ', started ' + (t.startedAt || H.nowHM());
    H.log('Room ' + no + ' assigned to ' + who + ' (' + t.priority + ')', 'housekeeping');
    H.save();
    return { ok: true };
  };
  ops.startTask = function (id) {
    var t = ops.task(id); if (!t || t.state !== 'dirty') return false;
    t.state = 'progress'; t.startedAt = H.nowHM(); t.note = (t.assignee || me()) + ', started ' + t.startedAt;
    if (!t.assignee) t.assignee = me();
    var r = ops.room(t.room); if (r && r.status !== 'occupied') r.status = 'dirty';
    H.log('Cleaning started in Room ' + t.room, 'housekeeping');
    H.save();
    return true;
  };
  ops.readyTask = function (id) {
    var t = ops.task(id); if (!t || t.state === 'ready') return false;
    t.state = 'ready'; t.doneAt = H.nowHM(); t.note = 'Inspected ' + t.doneAt;
    ops.settleRoom(t.room);
    H.log('Room ' + t.room + ' is clean and ready', 'housekeeping');
    H.save();
    return true;
  };
  ops.reportIssue = function (no, issue, taskId) {
    var r = ops.room(no); if (!r) return false;
    r.status = 'maintenance';
    var t = taskId ? ops.task(taskId) : ops.openTask(no);
    if (t) { t.state = 'maintenance'; t.type = 'Maintenance'; t.note = issue; t.time = H.nowHM(); }
    else S().tasks.push({ id: H.nextId('task'), room: no, type: 'Maintenance', assignee: '', priority: 'High', state: 'maintenance', note: issue, time: H.nowHM(), requested: false });
    S().requests.unshift({ id: H.nextId('request'), room: no, text: issue, kind: 'maintenance', priority: 'High', staff: 'Unassigned', status: 'Pending', date: H.today(), time: H.nowHM() });
    H.log('Maintenance reported in Room ' + no + ' (' + issue + ')', 'maintenance');
    H.save();
    return true;
  };
  ops.repair = function (no) {
    var r = ops.room(no); if (!r || r.status !== 'maintenance') return false;
    S().tasks.forEach(function (t) { if (t.room === no && t.state === 'maintenance') { t.state = 'ready'; t.doneAt = H.nowHM(); t.note = 'Repaired ' + t.doneAt; } });
    S().requests.forEach(function (q) { if (q.room === no && q.kind === 'maintenance' && q.status !== 'Done') q.status = 'Done'; });
    ops.settleRoom(no);
    H.log('Room ' + no + ' repaired and back in service', 'maintenance');
    H.save();
    return true;
  };
  ops.markDirty = function (no) {
    var r = ops.room(no); if (!r || r.status !== 'vacant') return false;
    r.status = 'dirty';
    if (!ops.openTask(no)) S().tasks.push({ id: H.nextId('task'), room: no, type: 'Room cleaning', assignee: '', priority: 'Normal', state: 'dirty', note: 'Marked dirty by ' + me(), time: H.nowHM(), requested: false });
    H.log('Room ' + no + ' marked dirty', 'housekeeping');
    H.save();
    return true;
  };
  ops.markClean = function (no) {
    var r = ops.room(no); if (!r || r.status !== 'dirty') return false;
    S().tasks.forEach(function (t) { if (t.room === no && t.state !== 'ready' && t.state !== 'maintenance') { t.state = 'ready'; t.doneAt = H.nowHM(); t.note = 'Cleared by ' + me(); } });
    ops.settleRoom(no);
    H.log('Room ' + no + ' marked clean', 'housekeeping');
    H.save();
    return true;
  };

  /* ============ alerts ============ */
  H.alerts = function () {
    var u = H.user(), s = S(), out = [];
    if (!u) return out;
    var staffSide = ['admin', 'manager', 'frontdesk'].indexOf(u.role) > -1;
    if (isMgr()) s.approvals.filter(function (a) { return a.status === 'pending'; }).forEach(function (a) {
      out.push({ id: 'appr:' + a.id, text: 'Discount approval needed', sub: 'Room ' + a.room + ', ' + H.money(a.amount) + ', asked by ' + a.by, href: 'cash.html#approvals' });
    });
    if (staffSide) {
      s.requests.filter(function (q) { return q.priority === 'High' && q.status === 'Pending'; }).forEach(function (q) {
        out.push({ id: 'req:' + q.id, text: 'High priority request, Room ' + q.room, sub: q.text, href: 'guest-services.html' });
      });
      s.tickets.filter(function (t) { return t.status === 'Urgent'; }).forEach(function (t) {
        out.push({ id: 'tk:' + t.id, text: 'Urgent ticket, Room ' + t.room, sub: t.title, href: 'guest-services.html?tab=support' });
      });
    }
    if (['admin', 'manager', 'frontdesk', 'owner'].indexOf(u.role) > -1) {
      s.receipts.filter(function (r) { return r.status === 'Pending'; }).forEach(function (r) {
        out.push({ id: 'rc:' + r.id, text: 'Receipt awaiting confirmation', sub: r.id + ', Room ' + r.room + ', ' + H.money(r.amount), href: 'cash.html' });
      });
    }
    if (staffSide) {
      var due = s.bookings.filter(function (b) { return b.status === 'in-house' && b.checkOut === H.today(); }).length;
      if (due) out.push({ id: 'co:' + H.today() + ':' + due, text: due + ' guests due to check out today', sub: 'Open Front Desk to process departures', href: 'front-desk.html' });
    }
    var seen = read(SEEN + u.username) || [];
    return out.filter(function (a) { return seen.indexOf(a.id) < 0; });
  };
  H.markAlertSeen = function (id) {
    var u = H.user(); if (!u) return;
    var seen = read(SEEN + u.username) || [];
    if (seen.indexOf(id) < 0) { seen.push(id); write(SEEN + u.username, seen.slice(-200)); }
  };

  /* ============ shell: sidebar, topbar, menus ============ */
  function closeMenus(except) {
    H.$$('.dropdown.is-open').forEach(function (d) {
      if (d !== except) { d.classList.remove('is-open'); var b = d.parentNode.querySelector('.menu__btn'); if (b) b.setAttribute('aria-expanded', 'false'); }
    });
  }
  function refreshAlerts() {
    var btn = D.getElementById('alertsBtn'), menu = D.getElementById('alertsMenu');
    if (!btn || !menu) return;
    var list = H.alerts();
    var cnt = btn.querySelector('.menu__count');
    if (list.length) { if (!cnt) { cnt = D.createElement('span'); cnt.className = 'menu__count'; btn.appendChild(cnt); } cnt.textContent = list.length > 9 ? '9+' : list.length; }
    else if (cnt) cnt.remove();
    btn.setAttribute('aria-label', 'Alerts, ' + list.length + ' new');
    menu.innerHTML = '<div class="dropdown__head">Alerts</div>' + (list.length ? list.slice(0, 8).map(function (a) {
      return '<button type="button" class="dropdown__item" data-alert="' + H.esc(a.id) + '" data-href="' + H.esc(a.href) + '">' + H.esc(a.text) + '<small>' + H.esc(a.sub) + '</small></button>';
    }).join('') : '<div class="dropdown__empty">You are all caught up.</div>');
  }
  function buildTopbar(top, key, u) {
    H.$$('.btn', top).forEach(function (b) { b.remove(); });
    var allowed = H.allowed(u.role);
    var search = H.$('.topbar__search', top);
    if (search) {
      if (allowed.indexOf('search') < 0) search.remove();
      else search.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && search.value.trim()) global.location.href = 'search.html?q=' + encodeURIComponent(search.value.trim());
      });
    }
    top.insertAdjacentHTML('beforeend',
      '<button type="button" class="btn" data-theme-toggle></button>' +
      '<div class="menu"><button type="button" class="btn menu__btn" id="alertsBtn" aria-haspopup="true" aria-expanded="false">' + H.icon('bell') + '<span>Alerts</span></button><div class="dropdown" id="alertsMenu"></div></div>' +
      '<div class="menu"><button type="button" class="btn menu__btn" id="accountBtn" aria-haspopup="true" aria-expanded="false"><span class="avatar" aria-hidden="true">' + H.esc(H.initials(u.name)) + '</span><span>' + H.esc(u.name) + '</span></button>' +
      '<div class="dropdown" id="accountMenu"><div class="dropdown__head">' + H.esc(u.name) + '</div><div class="dropdown__sub">' + H.esc(ROLES[u.role].label) + ' &middot; ' + H.esc(u.username) + '</div>' +
      (u.role === 'admin' ? '<button type="button" class="dropdown__item" data-act="reset">Reset demo data</button>' : '') +
      '<button type="button" class="dropdown__item" data-act="logout">Sign out</button></div></div>');
    [['alertsBtn', 'alertsMenu'], ['accountBtn', 'accountMenu']].forEach(function (p) {
      var b = D.getElementById(p[0]), m = D.getElementById(p[1]);
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        var open = !m.classList.contains('is-open');
        closeMenus(m);
        m.classList.toggle('is-open', open);
        b.setAttribute('aria-expanded', String(open));
      });
    });
    D.getElementById('alertsMenu').addEventListener('click', function (e) {
      var it = e.target.closest('[data-alert]'); if (!it) return;
      H.markAlertSeen(it.getAttribute('data-alert'));
      global.location.href = it.getAttribute('data-href');
    });
    D.getElementById('accountMenu').addEventListener('click', function (e) {
      var it = e.target.closest('[data-act]'); if (!it) return;
      if (it.getAttribute('data-act') === 'logout') H.logout();
      if (it.getAttribute('data-act') === 'reset') {
        H.confirm('Reset demo data', 'This restores the original sample data for every role. Continue?', 'Reset', true).then(function (ok) {
          if (ok) { H.reset(); H.toast('Demo data restored.'); closeMenus(); }
        });
      }
    });
    refreshAlerts();
    H.onChange(refreshAlerts);
  }

  function shell(key, u) {
    if (!D.getElementById('toasts')) D.body.insertAdjacentHTML('beforeend', '<div class="toasts" id="toasts" aria-live="polite"></div>');
    var side = H.$('.sidebar');
    if (side) {
      var brand = H.$('.sidebar__brand', side);
      if (brand) brand.innerHTML = '<span class="sidebar__logo" aria-hidden="true">H</span><span>Hotel ERP</span>';
      var nav = H.$('.sidebar__nav', side), allowed = H.allowed(u.role);
      if (nav) nav.innerHTML = PAGES.filter(function (p) { return allowed.indexOf(p.key) > -1; }).map(function (p) {
        var on = p.key === key;
        return '<li><a class="sidebar__link' + (on ? ' sidebar__link--active' : '') + '" href="' + p.key + '.html"' + (on ? ' aria-current="page"' : '') + '>' + H.icon(p.icon) + '<span>' + p.label + '</span></a></li>';
      }).join('');
    }
    var top = H.$('.topbar');
    if (top) buildTopbar(top, key, u);
    H.bindTheme();
  }

  /* global click and key handling: modals opened by hash links, backdrops, menus, Escape */
  D.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (a) {
      var h = a.getAttribute('href');
      var inModal = a.closest('.modal');
      if (inModal && (h === '#' || a.classList.contains('modal__backdrop'))) { e.preventDefault(); H.modal.close(inModal); return; }
      if (h.length > 1) {
        var t = D.getElementById(h.slice(1));
        if (t && t.classList.contains('modal')) { e.preventDefault(); H.modal.open(t); return; }
      }
    }
    if (!e.target.closest('.menu')) closeMenus();
  });
  D.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    closeMenus();
    /* dialogs made by H.dialog have no id and handle Escape themselves; page modals have an id */
    var m = H.$('.modal.is-open[id]') || H.$('.modal:target');
    if (m) H.modal.close(m);
  });

  /* ============ page bootstrap ============ */
  H.page = function (key, fn) {
    var u = H.user();
    if (key === 'login') {
      if (u) { global.location.replace(H.home(u.role)); return; }
      H.bindTheme();
      fn({ state: H.state() });
      return;
    }
    if (!u) { global.location.replace('login.html'); return; }
    if (H.allowed(u.role).indexOf(key) < 0) { global.location.replace(H.home(u.role)); return; }
    D.body.setAttribute('data-role', u.role);
    shell(key, u);
    fn({ user: u, role: u.role, state: H.state() });
  };
})(window);

/* Static demo ribbon: no server, no database; data lives in this browser only. */
document.addEventListener('DOMContentLoaded', function () {
  var d = document.createElement('div'); d.className = 'demo-ribbon';
  d.textContent = 'Sample preview - data is stored in this browser only';
  document.body.appendChild(d);
});
