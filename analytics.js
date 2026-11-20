/* analytics.js - KPIs and charts. Today, booking mix and room-type revenue come from live data.
   Earlier days and months are generated sample history until the SQL backend supplies real figures. Owner: Claude A. */
HERP.page('analytics', function () {
  var $ = HERP.$, esc = HERP.esc, money = HERP.money, num = HERP.num;
  var TOTAL = 417, MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var COLORS = ['var(--accent)', 'var(--info)', 'var(--success)', 'var(--warning)'];

  function rng(seed) { return function () { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; var t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function live() {
    var s = HERP.state(), inh = s.bookings.filter(function (b) { return b.status === 'in-house'; });
    var occ = HERP.ops.roomStats().occupied;
    return { occ: occ, adr: inh.length ? inh.reduce(function (a, b) { return a + b.rate; }, 0) / inh.length : 8000 };
  }
  function daily(n) {
    var r = rng(4170 + n), L = live(), out = [], today = HERP.today();
    for (var i = n - 1; i >= 0; i--) {
      var d = HERP.addDays(today, -i), dow = new Date(d + 'T00:00:00').getDay();
      var sold = i === 0 ? L.occ : Math.round(TOTAL * (0.55 + r() * 0.25 + (dow === 5 || dow === 6 ? 0.07 : 0)));
      var adr = i === 0 ? L.adr : 7600 + r() * 1500;
      out.push({ date: d, sold: Math.min(sold, TOTAL), adr: adr, rev: Math.min(sold, TOTAL) * adr });
    }
    return out;
  }
  function monthly() {
    var r = rng(912), now = new Date(), out = [];
    for (var i = 11; i >= 0; i--) {
      var d = new Date(now.getFullYear(), now.getMonth() - i, 1), days = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      var season = 0.62 + 0.14 * Math.sin((d.getMonth() - 8) / 12 * Math.PI * 2) + r() * 0.06;
      var sold = Math.round(TOTAL * days * Math.min(season, 0.9)), adr = 7800 + r() * 1300;
      out.push({ label: MON[d.getMonth()] + ' ' + String(d.getFullYear()).slice(2), sold: sold, occ: sold / (TOTAL * days), adr: adr, rev: sold * adr, now: i === 0 });
    }
    return out;
  }
  var M = (function (v) { return (v / 1e6).toFixed(1) + 'M'; });

  function kpis(rows) {
    var sold = rows.reduce(function (a, d) { return a + d.sold; }, 0), rev = rows.reduce(function (a, d) { return a + d.rev; }, 0), avail = TOTAL * rows.length;
    var cards = [['Occupancy rate', Math.round(sold / avail * 100) + '%', 'Average over ' + rows.length + ' days'], ['ADR', money(rev / sold), 'Average daily rate per sold room'], ['RevPAR', money(rev / avail), 'Revenue per available room'], ['Total revenue', money(rev), num(sold) + ' room nights sold']];
    $('#anKpis').innerHTML = cards.map(function (c) { return '<article class="card"><p class="kpi__label">' + c[0] + '</p><p class="kpi__value">' + esc(c[1]) + '</p><p class="kpi__note">' + c[2] + '</p></article>'; }).join('');
  }
  function revenueChart(m) {
    var max = Math.max.apply(null, m.map(function (x) { return x.rev; }));
    $('#chRevenue').innerHTML = '<div class="bars" role="img" aria-label="Monthly revenue in millions of BDT">' + m.map(function (x) {
      return '<div class="bars__col' + (x.now ? ' bars__col--now' : '') + '" title="' + esc(x.label) + ': ' + money(x.rev) + '"><span class="bars__val">' + M(x.rev) + '</span><div class="bars__bar" style="height:' + Math.round(x.rev / max * 100) + '%"></div></div>';
    }).join('') + '</div><div class="bars__labels">' + m.map(function (x) { return '<span>' + x.label.split(' ')[0] + '</span>'; }).join('') + '</div>';
  }
  function occChart(rows) {
    var W = 560, H = 220, p = { l: 36, r: 12, t: 12, b: 26 }, pts = rows.map(function (d) { return d.sold / TOTAL * 100; });
    var lo = Math.max(0, Math.floor(Math.min.apply(null, pts) / 10) * 10 - 10), hi = Math.min(100, Math.ceil(Math.max.apply(null, pts) / 10) * 10 + 10);
    var x = function (i) { return p.l + (rows.length === 1 ? 0 : i / (rows.length - 1)) * (W - p.l - p.r); }, y = function (v) { return p.t + (1 - (v - lo) / (hi - lo)) * (H - p.t - p.b); };
    var grid = '', step = (hi - lo) / 4;
    for (var g = 0; g <= 4; g++) { var v = lo + step * g; grid += '<line class="line__grid" x1="' + p.l + '" x2="' + (W - p.r) + '" y1="' + y(v) + '" y2="' + y(v) + '"/><text class="line__text" x="' + (p.l - 6) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + Math.round(v) + '%</text>'; }
    var path = pts.map(function (v, i) { return (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1); }).join(' ');
    var last = pts.length - 1;
    $('#chOcc').innerHTML = '<svg class="line" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Daily occupancy percentage, ' + rows.length + ' days, latest ' + Math.round(pts[last]) + ' percent">' + grid +
      '<path class="line__path" d="' + path + '"/><circle class="line__dot" cx="' + x(last) + '" cy="' + y(pts[last]) + '" r="4"><title>Today ' + Math.round(pts[last]) + '%</title></circle>' +
      '<text class="line__text" x="' + p.l + '" y="' + (H - 6) + '">' + HERP.shortDate(rows[0].date) + '</text><text class="line__text" x="' + (W - p.r) + '" y="' + (H - 6) + '" text-anchor="end">Today</text></svg>';
  }
  function sourcesChart() {
    var c = {}; HERP.state().bookings.forEach(function (b) { c[b.source] = (c[b.source] || 0) + 1; });
    var keys = Object.keys(c).sort(function (a, b) { return c[b] - c[a]; }), tot = keys.reduce(function (a, k) { return a + c[k]; }, 0), acc = 0, stops = [];
    keys.forEach(function (k, i) { var from = acc / tot * 100; acc += c[k]; stops.push(COLORS[i % 4] + ' ' + from.toFixed(2) + '% ' + (acc / tot * 100).toFixed(2) + '%'); });
    $('#chSources').innerHTML = '<div class="donut-wrap"><div class="donut" role="img" aria-label="Booking sources: ' + keys.map(function (k) { return k + ' ' + Math.round(c[k] / tot * 100) + ' percent'; }).join(', ') + '" style="background:conic-gradient(' + stops.join(',') + ')"></div><ul class="donut__legend">' +
      keys.map(function (k, i) { return '<li><span class="sw" style="background:' + COLORS[i % 4] + '"></span>' + esc(k) + ' <strong>' + Math.round(c[k] / tot * 100) + '%</strong> <span class="muted">(' + c[k] + ')</span></li>'; }).join('') + '</ul></div>';
  }
  function typesChart() {
    var rev = { STD: 0, DLX: 0, FAM: 0, STE: 0 }; HERP.state().bookings.forEach(function (b) { if (b.status !== 'cancelled') rev[b.type] += b.subtotal; });
    var order = Object.keys(rev).sort(function (a, b) { return rev[b] - rev[a]; }), max = rev[order[0]] || 1;
    $('#chTypes').innerHTML = '<div class="hbar">' + order.map(function (k, i) {
      return '<div class="hbar__row"><span>' + HERP.TYPES[k] + '</span><div class="hbar__track"><div class="hbar__fill" style="width:' + Math.round(rev[k] / max * 100) + '%;background:' + COLORS[i % 4] + '"></div></div><span class="hbar__val">' + M(rev[k]) + '</span></div>';
    }).join('') + '</div>';
  }
  function table(m) {
    $('#anTable').innerHTML = m.slice().reverse().map(function (x) { return '<tr><td>' + x.label + (x.now ? ' (to date)' : '') + '</td><td class="right">' + num(x.sold) + '</td><td class="right">' + Math.round(x.occ * 100) + '%</td><td class="right">' + money(x.adr) + '</td><td class="right">' + money(x.rev) + '</td></tr>'; }).join('');
  }
  function render() {
    var n = Number($('#anRange').value) || 30, rows = daily(n), m = monthly();
    $('#anNote').textContent = 'Today, booking sources and room type revenue use live data. Earlier days and months are sample history until the database is connected.';
    kpis(rows); revenueChart(m); occChart(rows); sourcesChart(); typesChart(); table(m);
  }
  $('#anRange').addEventListener('change', render);
  $('#anPrint').addEventListener('click', function () { window.print(); });
  render();
  HERP.onChange(render);
});
