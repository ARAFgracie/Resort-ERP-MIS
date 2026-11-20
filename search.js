/* search.js - one search box across guests, bookings, rooms, staff and receipts. Owner: Claude A. */
HERP.page('search', function (ctx) {
  var $ = HERP.$, esc = HERP.esc, money = HERP.money, ops = HERP.ops;
  var RKEY = 'herp.recent.' + ctx.user.username;
  var canStaff = ctx.role === 'manager' || ctx.role === 'admin', canRcpt = ['manager', 'admin', 'frontdesk'].indexOf(ctx.role) > -1;
  var type = 'All';
  var ICON = { guest: ['guest', 'G'], booking: ['booking', 'B'], room: ['room', 'R'], staff: ['staff', 'S'], receipt: ['receipt', '৳'] };

  if (!canStaff) HERP.$$('.chip').forEach(function (c) { if (c.textContent === 'Staff') c.remove(); });
  if (!canRcpt) HERP.$$('.chip').forEach(function (c) { if (c.textContent === 'Receipts') c.remove(); });

  function recent() { try { return JSON.parse(HERP_STORE.get(RKEY)) || []; } catch (e) { return []; } }
  function remember(q) {
    if (!q || q.length < 2) return;
    var r = recent().filter(function (x) { return x.toLowerCase() !== q.toLowerCase(); }); r.unshift(q);
    try { HERP_STORE.set(RKEY, JSON.stringify(r.slice(0, 6))); } catch (e) { /* ignore */ }
    renderRecent();
  }
  function renderRecent() {
    var r = recent();
    $('#recent').innerHTML = r.length ? r.map(function (x) { return '<li><a class="recent__item" href="#" data-q="' + esc(x) + '">' + esc(x) + '</a></li>'; }).join('') : '<li class="muted" style="padding:8px 12px">No recent searches.</li>';
  }

  function find(q) {
    var s = HERP.state(), t = q.toLowerCase().split(/\s+/).filter(Boolean), out = [];
    var hit = function (h) { h = h.toLowerCase(); return t.every(function (w) { return h.indexOf(w) > -1; }); };
    var lastBooking = {};
    s.bookings.forEach(function (b) { var p = lastBooking[b.guestId]; if (!p || b.checkIn >= p.checkIn) lastBooking[b.guestId] = b; });
    s.guests.forEach(function (g) {
      if (!hit(g.name + ' ' + g.phone + ' ' + g.idNo)) return;
      var b = lastBooking[g.id];
      out.push({ t: 'guest', title: g.name, href: b ? 'front-desk.html?booking=' + b.id : 'front-desk.html', sub: 'Guest · ' + g.phone + (b ? ' · Room ' + b.room : ''), badge: b ? HERP.bookingBadge(b) : '' });
    });
    s.bookings.forEach(function (b) {
      if (!hit(b.id + ' ' + b.guest + ' ' + b.room + ' ' + b.phone)) return;
      out.push({ t: 'booking', title: 'Booking ' + b.id, href: 'front-desk.html?booking=' + b.id, sub: 'Booking · ' + b.guest + ' · ' + HERP.TYPES[b.type] + ' · ' + b.nights + ' nights · ' + money(b.total), badge: HERP.bookingBadge(b) });
    });
    s.rooms.forEach(function (r) {
      var b = r.status === 'occupied' ? ops.roomBooking(r.no) : null;
      if (!hit('room ' + r.no + ' ' + HERP.TYPES[r.type] + ' ' + r.status + ' ' + (b ? b.guest : ''))) return;
      out.push({ t: 'room', title: 'Room ' + r.no, href: 'rooms.html?room=' + r.no, sub: 'Room · Floor ' + (r.floor === 0 ? 'G' : r.floor) + ' · ' + HERP.TYPES[r.type] + (b ? ' · Guest: ' + b.guest : ''), badge: HERP.roomBadge(r.status) });
    });
    if (canStaff) s.staff.forEach(function (m) {
      if (!hit(m.name + ' ' + m.role + ' ' + m.dept + ' ' + m.phone)) return;
      out.push({ t: 'staff', title: m.name, href: 'staff.html?id=' + m.id, sub: 'Staff · ' + m.role + ' · ' + m.shift + ' shift', badge: HERP.badge({ 'On duty': 'vacant', 'Off duty': 'dirty', 'On leave': 'reserved' }[m.status] || '', m.status) });
    });
    if (canRcpt) s.receipts.forEach(function (r) {
      if (!hit(r.id + ' ' + r.guest + ' ' + r.room + ' ' + r.method)) return;
      out.push({ t: 'receipt', title: 'Receipt ' + r.id, href: 'cash.html?q=' + r.id, sub: 'Receipt · Room ' + r.room + ' · ' + money(r.amount) + ' · ' + r.method, badge: HERP.badge(r.status === 'Received' ? 'vacant' : r.status === 'Pending' ? 'dirty' : 'maintenance', r.status) });
    });
    return out;
  }

  function run() {
    var q = $('#q').value.trim(), empty = $('#emptyState');
    if (!q) {
      $('#resLabel').textContent = 'Results'; $('#resCount').textContent = '';
      $('#results').innerHTML = '<li class="muted" style="padding:12px 0">Type a guest name, phone, room number, booking ID or receipt number.</li>';
      empty.hidden = true; return;
    }
    var all = find(q), list = all.filter(function (r) { return type === 'All' || r.t === type.toLowerCase().replace(/s$/, ''); });
    $('#resLabel').textContent = 'Results for "' + q + '"';
    $('#resCount').textContent = list.length + ' found' + (list.length > 40 ? ', showing 40' : '');
    $('#results').innerHTML = list.slice(0, 40).map(function (r) {
      var i = ICON[r.t];
      return '<li class="result"><span class="result__icon result__icon--' + i[0] + '" aria-hidden="true">' + i[1] + '</span><div class="result__body"><a class="result__title" href="' + esc(r.href) + '" data-keep>' + esc(r.title) + '</a><p class="result__sub">' + esc(r.sub) + '</p></div>' + r.badge + '</li>';
    }).join('');
    empty.hidden = list.length > 0;
    $('#emptyText').textContent = 'Check the spelling or try a phone number, room number or booking ID.';
  }

  $('#q').addEventListener('input', HERP.debounce(run, 150));
  $('#q').addEventListener('keydown', function (e) { if (e.key === 'Enter') { remember(this.value.trim()); run(); } });
  $('.chips').addEventListener('click', function (e) {
    var c = e.target.closest('.chip'); if (!c) return;
    type = c.textContent.trim();
    HERP.$$('.chip').forEach(function (x) { var on = x === c; x.classList.toggle('chip--active', on); x.setAttribute('aria-pressed', String(on)); });
    run();
  });
  $('#results').addEventListener('click', function (e) { if (e.target.closest('[data-keep]')) remember($('#q').value.trim()); });
  $('#recent').addEventListener('click', function (e) {
    var a = e.target.closest('[data-q]'); if (!a) return;
    e.preventDefault(); $('#q').value = a.getAttribute('data-q'); run();
  });
  $('.search__clear').addEventListener('click', function () { try { HERP_STORE.remove(RKEY); } catch (e) { /* ignore */ } renderRecent(); HERP.toast('Recent searches cleared.'); });

  $('#q').value = HERP.qs('q') || '';
  if ($('#q').value) remember($('#q').value);
  renderRecent(); run();
  $('#q').focus();
});
