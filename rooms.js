/* rooms.js - live room grid for all 417 rooms with a detail panel and actions. Owner: Claude A. */
HERP.page('rooms', function () {
  var $ = HERP.$, esc = HERP.esc, money = HERP.money, ops = HERP.ops;
  var open = { 1: true, 2: true };
  var selected = null;
  var STATUS = ['vacant', 'occupied', 'dirty', 'maintenance', 'reserved'];
  var ISSUES = ['Air conditioner fault', 'Leaking bathroom tap', 'Broken door lock', 'TV not working', 'Water heater fault', 'Light fixture replacement'];

  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function floorName(n) { return n === 0 ? 'Ground Floor' : 'Floor ' + n; }

  function captureOpen() { HERP.$$('.floor').forEach(function (d) { open[d.id.replace('floor-', '')] = d.open; }); }

  function renderGrid() {
    captureOpen();
    var s = HERP.state(), byFloor = {};
    s.rooms.forEach(function (r) { (byFloor[r.floor] = byFloor[r.floor] || []).push(r); });
    $('#floors').innerHTML = Object.keys(byFloor).map(Number).sort(function (a, b) { return a - b; }).map(function (n) {
      var rooms = byFloor[n], c = {};
      STATUS.forEach(function (k) { c[k] = 0; });
      rooms.forEach(function (r) { c[r.status]++; });
      return '<details class="floor" id="floor-' + n + '"' + (open[n] ? ' open' : '') + '><summary class="floor__summary"><span class="floor__name">' + floorName(n) + '</span>' +
        '<span class="floor__meta">' + rooms.length + ' rooms &middot; ' + c.vacant + ' vacant &middot; ' + c.occupied + ' occupied &middot; ' + c.dirty + ' dirty &middot; ' + c.maintenance + ' maintenance &middot; ' + c.reserved + ' reserved</span></summary>' +
        '<div class="floor__grid">' + rooms.map(function (r) {
          return '<button class="tile tile--' + r.status + (r.no === selected ? ' tile--sel' : '') + '" type="button" data-room="' + r.no + '" aria-pressed="' + (r.no === selected) + '" aria-label="Room ' + r.no + ', ' + HERP.TYPES[r.type] + ', ' + cap(r.status) + '"><span class="tile__num">' + r.no + '</span><span class="tile__type">' + r.type + '</span></button>';
        }).join('') + '</div></details>';
    }).join('');
  }

  function renderLegend() {
    var c = ops.roomStats();
    $('#legendTitle').textContent = 'Status legend (' + c.total + ' rooms)';
    $('#roomLegend').innerHTML = STATUS.map(function (k) { return '<li class="legend__item"><span class="legend__swatch legend__swatch--' + k + '"></span>' + cap(k) + ' <strong>' + c[k] + '</strong></li>'; }).join('');
    $('label[for=flt-all]').innerHTML = 'All <span class="chip__n">' + c.total + '</span>';
    STATUS.forEach(function (k) { $('label[for=flt-' + k + ']').innerHTML = cap(k) + ' <span class="chip__n">' + c[k] + '</span>'; });
    $('.floor-nav').innerHTML = ops.floorStats().map(function (f) { return '<a class="floor-nav__link" href="#floor-' + f.floor + '">' + (f.floor === 0 ? 'G' : f.floor) + '</a>'; }).join('');
  }

  function renderPanel() {
    var p = $('#roomPanel'), r = selected && ops.room(selected);
    if (!r) { p.innerHTML = '<h2 class="card__title">Room details</h2><p class="room-panel__placeholder">Select a room tile to see its details and actions.</p>'; return; }
    var s = HERP.state(), rows = '', b = null, task = ops.openTask(r.no);
    if (r.status === 'occupied') b = ops.roomBooking(r.no);
    if (r.status === 'reserved') b = s.bookings.filter(function (x) { return x.room === r.no && x.status === 'expected'; }).sort(function (a, c) { return a.checkIn < c.checkIn ? -1 : 1; })[0] || null;
    rows += '<dt>Room type</dt><dd>' + esc(HERP.TYPES[r.type]) + ', floor ' + (r.floor === 0 ? 'G' : r.floor) + '</dd>';
    rows += '<dt>Rate</dt><dd>' + money(HERP.RATES[r.type]) + ' per night</dd>';
    if (b) {
      rows += '<dt>' + (r.status === 'occupied' ? 'Current guest' : 'Arriving guest') + '</dt><dd><a href="front-desk.html?booking=' + b.id + '">' + esc(b.guest) + '</a></dd>';
      rows += '<dt>Stay dates</dt><dd>' + HERP.date(b.checkIn) + ' &ndash; ' + HERP.date(b.checkOut) + ' (' + b.nights + (b.nights === 1 ? ' night' : ' nights') + ')</dd>';
      rows += '<dt>Balance due</dt><dd>' + money(b.due) + '</dd>';
    }
    if (r.status === 'dirty' && task) rows += '<dt>Housekeeping</dt><dd>' + esc(task.assignee || 'Unassigned') + ', ' + esc({ dirty: 'waiting', progress: 'cleaning now' }[task.state] || task.state) + '</dd>';
    if (r.status === 'maintenance' && task) rows += '<dt>Issue</dt><dd>' + esc(task.note) + '</dd>';
    var maint = r.status === 'maintenance';
    p.innerHTML = '<h2 class="card__title">Room ' + esc(r.no) + '</h2>' + HERP.roomBadge(r.status) +
      '<dl class="room-panel__list">' + rows + '</dl><div class="room-panel__actions">' +
      (r.status === 'vacant' ? '<a class="btn btn--primary" href="room-booking.html?room=' + r.no + '">Assign Guest</a>' : '<button class="btn btn--primary" type="button" disabled title="Only vacant rooms can be assigned">Assign Guest</button>') +
      '<button class="btn" type="button" data-act="dirty"' + (r.status === 'vacant' ? '' : ' disabled') + '>Mark Dirty</button>' +
      '<button class="btn" type="button" data-act="clean"' + (r.status === 'dirty' ? '' : ' disabled') + '>Mark Clean</button>' +
      '<button class="btn ' + (maint ? '' : 'btn--danger') + '" type="button" data-act="' + (maint ? 'repair' : 'issue') + '">' + (maint ? 'Mark Repaired' : 'Report Maintenance') + '</button></div>';
  }

  function render() { renderLegend(); renderGrid(); renderPanel(); }

  function select(no, scroll) {
    var r = ops.room(no); if (!r) return false;
    selected = r.no; open[r.floor] = true; render();
    if (scroll) { var t = $('.tile[data-room="' + r.no + '"]'); if (t) t.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
    return true;
  }

  $('#floors').addEventListener('click', function (e) {
    var t = e.target.closest('.tile'); if (t) select(t.getAttribute('data-room'));
  });
  $('.floor-nav').addEventListener('click', function (e) {
    var a = e.target.closest('a'); if (!a) return;
    e.preventDefault();
    var d = $(a.getAttribute('href')); if (d) { d.open = true; d.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  });
  $('#roomFind').addEventListener('keydown', function (e) {
    if (e.key !== 'Enter') return;
    var v = this.value.trim(); if (!v) return;
    if (!select(v, true)) HERP.toast('Room ' + v + ' does not exist.', 'error');
  });
  $('#roomPanel').addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]'); if (!b || !selected) return;
    var act = b.getAttribute('data-act'), no = selected;
    if (act === 'dirty') { if (ops.markDirty(no)) HERP.toast('Room ' + no + ' marked dirty and sent to housekeeping.'); }
    else if (act === 'clean') { if (ops.markClean(no)) HERP.toast('Room ' + no + ' is clean and ready to sell.'); }
    else if (act === 'repair') { if (ops.repair(no)) HERP.toast('Room ' + no + ' is back in service.'); }
    else if (act === 'issue') {
      HERP.dialog({
        title: 'Report maintenance, Room ' + no,
        html: '<label class="field__label" for="mIssue">What is wrong?</label><input class="input" id="mIssue" list="mIssues" placeholder="Choose or type an issue" autocomplete="off"><datalist id="mIssues">' + ISSUES.map(function (i) { return '<option value="' + i + '">'; }).join('') + '</datalist>' +
          '<p class="modal__text" style="margin-top:12px">The room is taken out of sale and a request goes to Service Staff.</p>',
        ok: 'Report issue', danger: true,
        read: function (f) { var v = f.querySelector('#mIssue').value.trim(); return v.length < 3 ? { error: 'Describe the problem in a few words.' } : v; }
      }).then(function (v) { if (v) { ops.reportIssue(no, v); HERP.toast('Maintenance reported for Room ' + no + '.', 'warn'); } });
    }
  });

  render();
  var want = HERP.qs('room'); if (want) select(want, true);
  HERP.onChange(render);
});
