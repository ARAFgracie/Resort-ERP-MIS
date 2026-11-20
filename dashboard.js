/* dashboard.js - live operations overview. Owner: Claude A. */
HERP.page('dashboard', function () {
  var $ = HERP.$, esc = HERP.esc, money = HERP.money;
  var filter = 'all';

  function figures() {
    var s = HERP.state(), t = HERP.today(), c = HERP.ops.roomStats();
    var arrivals = s.bookings.filter(function (b) { return b.checkIn === t && b.status !== 'cancelled'; });
    var departures = s.bookings.filter(function (b) { return b.checkOut === t && (b.status === 'in-house' || b.status === 'checked-out'); });
    var inhouse = s.bookings.filter(function (b) { return b.status === 'in-house'; });
    var open = inhouse.filter(function (b) { return b.due > 0; });
    return {
      c: c, arrivals: arrivals, departures: departures,
      arrived: arrivals.filter(function (b) { return b.status !== 'expected'; }).length,
      departed: departures.filter(function (b) { return b.status === 'checked-out'; }).length,
      revenue: inhouse.reduce(function (a, b) { return a + b.rate; }, 0),
      pending: open.reduce(function (a, b) { return a + b.due; }, 0), openCount: open.length
    };
  }

  function renderStats(f) {
    var c = f.c, occ = Math.round(c.occupied / c.total * 100);
    var cards = [
      ['Occupancy', occ + '%', c.occupied + ' of ' + c.total + ' rooms', ''],
      ['Rooms Vacant', c.vacant + c.dirty, 'Ready to sell: ' + c.vacant, 'stat__value--vacant'],
      ["Today's Check-ins", f.arrivals.length, f.arrived + ' arrived', ''],
      ["Today's Check-outs", f.departures.length, f.departed + ' departed', ''],
      ["Today's Revenue", money(f.revenue), 'Room charges, ' + c.occupied + ' rooms', ''],
      ['Pending Cash', money(f.pending), f.openCount + ' open balances', f.pending ? 'stat__value--warn' : '']
    ];
    $('#stats').innerHTML = cards.map(function (x) {
      return '<article class="card stat"><p class="stat__label">' + x[0] + '</p><p class="stat__value ' + x[3] + '">' + esc(x[1]) + '</p><p class="stat__note">' + esc(x[2]) + '</p></article>';
    }).join('');
  }

  function renderStatus(c) {
    var order = [['vacant', 'Vacant'], ['occupied', 'Occupied'], ['reserved', 'Reserved'], ['dirty', 'Dirty'], ['maintenance', 'Maintenance']];
    $('#statusbar').setAttribute('aria-label', order.map(function (o) { return o[1] + ' ' + c[o[0]]; }).join(', '));
    $('#statusbar').innerHTML = order.map(function (o) { return '<span class="statusbar__seg statusbar__seg--' + o[0] + '" style="flex:' + c[o[0]] + '" title="' + o[1] + ' ' + c[o[0]] + '"></span>'; }).join('');
    $('#legend').innerHTML = order.map(function (o) { return '<li>' + HERP.badge(o[0], o[1]) + ' ' + c[o[0]] + '</li>'; }).join('');
  }

  function renderTable(f) {
    var rows = [];
    if (filter !== 'dep') f.arrivals.forEach(function (b) {
      var done = b.status !== 'expected';
      rows.push({ sort: done ? (b.arrivedAt || '00:00') : (b.eta || '12:00'), b: b, type: 'Arrival', time: done ? (b.arrivedAt || '-') : (b.eta || '-'), badge: done ? HERP.badge('occupied', 'Checked in') : HERP.badge('reserved', 'Expected') });
    });
    if (filter !== 'arr') f.departures.forEach(function (b) {
      var done = b.status === 'checked-out';
      rows.push({ sort: done ? (b.departedAt || '00:00') : '12:00', b: b, type: 'Departure', time: done ? (b.departedAt || '-') : '12:00', badge: done ? HERP.badge('vacant', 'Checked out') : HERP.badge('dirty', 'Due') });
    });
    rows.sort(function (a, b) { return a.sort < b.sort ? -1 : a.sort > b.sort ? 1 : 0; });
    $('#adBody').innerHTML = rows.length ? rows.map(function (r) {
      return '<tr><td>' + esc(r.b.guest) + '</td><td>' + esc(r.b.room) + '</td><td>' + r.type + '</td><td>' + esc(r.time) + '</td><td>' + r.badge + '</td></tr>';
    }).join('') : '<tr><td colspan="5" class="empty-row">Nothing scheduled.</td></tr>';
  }

  function renderFloors() {
    $('#floorList').innerHTML = HERP.ops.floorStats().map(function (f) {
      var pct = f.occupied / f.total;
      return '<li class="floors__row"><span class="floors__name">' + (f.floor === 0 ? 'Ground' : 'Floor ' + f.floor) + '</span>' +
        '<progress class="floors__bar' + (pct > 0.85 ? ' floors__bar--hot' : '') + '" value="' + f.occupied + '" max="' + f.total + '" aria-label="' + f.occupied + ' of ' + f.total + ' occupied"></progress>' +
        '<span class="floors__count">' + f.occupied + '/' + f.total + '</span></li>';
    }).join('');
  }

  function renderFeed() {
    var list = HERP.state().activity.slice(0, 8);
    $('#feed').innerHTML = list.length ? list.map(function (a) {
      return '<li class="feed__item"><span class="feed__time">' + esc(a.time) + '</span>' + esc(a.text) + '</li>';
    }).join('') : '<li class="muted">No activity yet today.</li>';
  }

  function render() {
    var f = figures();
    renderStats(f); renderStatus(f.c); renderTable(f); renderFloors(); renderFeed();
  }

  $('#adFilter').addEventListener('click', function (e) {
    var b = e.target.closest('[data-f]'); if (!b) return;
    filter = b.getAttribute('data-f');
    HERP.$$('.seg__btn', this).forEach(function (x) { var on = x === b; x.classList.toggle('is-on', on); x.setAttribute('aria-pressed', String(on)); });
    renderTable(figures());
  });

  render();
  HERP.onChange(render);
});
