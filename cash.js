/* cash.js - receipts, new payments, discount approvals and day close. Owner: Claude A. */
HERP.page('cash', function (ctx) {
  var $ = HERP.$, esc = HERP.esc, money = HERP.money, ops = HERP.ops;
  var today = HERP.today(), found = null;

  function sum(list) { return list.reduce(function (a, r) { return a + r.amount; }, 0); }
  function todays() { return HERP.state().receipts.filter(function (r) { return r.date === today && r.status === 'Received'; }); }

  function renderCards() {
    var t = todays(), by = function (m) { return t.filter(function (r) { return r.method === m; }); };
    var open = HERP.state().bookings.filter(function (b) { return b.status === 'in-house' && b.due > 0; });
    var due = open.reduce(function (a, b) { return a + b.due; }, 0);
    var cards = [['Cash collected today', money(sum(by('Cash'))), by('Cash').length + ' receipts', ''], ['Card', money(sum(by('Card'))), by('Card').length + ' receipts', ''], ['Mobile banking', money(sum(by('Mobile Banking'))), by('Mobile Banking').length + ' receipts', ''], ['Pending dues', money(due), open.length + ' open balances', due ? 'stat__value--warn' : '']];
    $('#cashCards').innerHTML = cards.map(function (c) { return '<article class="card"><p class="stat__label">' + c[0] + '</p><p class="stat__value ' + c[3] + '">' + esc(c[1]) + '</p><p class="stat__note">' + c[2] + '</p></article>'; }).join('');
  }

  function renderApprovals() {
    var list = HERP.state().approvals.filter(function (a) { return a.status === 'pending'; });
    $('#apprCount').textContent = list.length;
    $('#apprList').innerHTML = list.length ? list.map(function (a) {
      return '<div class="appr__item"><div><strong>Room ' + esc(a.room) + ', ' + esc(a.guest) + '</strong>: ' + money(a.amount) + ' discount<div class="appr__meta">' + esc(a.reason) + ' &middot; asked by ' + esc(a.by) + ' at ' + esc(a.time) + '</div></div>' +
        '<div class="table-actions"><button class="btn btn--primary btn--small" type="button" data-appr="' + a.id + '" data-yes="1">Approve</button><button class="btn btn--small" type="button" data-appr="' + a.id + '">Reject</button></div></div>';
    }).join('') : '<p class="muted" style="margin:0">No discounts are waiting for approval.</p>';
  }

  function renderTable() {
    var q = $('#rcQ').value.trim().toLowerCase(), m = $('#rcMethod').value, st = $('#rcStatus').value, d = $('#rcDate').value;
    var list = HERP.state().receipts.filter(function (r) {
      return (d === 'all' || r.date === today) && (!m || r.method === m) && (!st || r.status === st) && (!q || (r.id + ' ' + r.guest + ' ' + r.room).toLowerCase().indexOf(q) > -1);
    }).sort(function (a, b) { var x = a.date + a.time, y = b.date + b.time; return x < y ? 1 : x > y ? -1 : 0; });
    $('#rcBody').innerHTML = list.length ? list.slice(0, 200).map(function (r) {
      var badge = HERP.badge(r.status === 'Received' ? 'vacant' : r.status === 'Pending' ? 'dirty' : 'maintenance', r.status);
      var acts = '<button class="btn btn--small" type="button" data-print="' + r.id + '">Print</button>';
      if (r.status === 'Pending') acts += '<button class="btn btn--small btn--primary role-edit" type="button" data-confirm="' + r.id + '">Confirm</button>';
      if (r.status === 'Received') acts += '<button class="btn btn--small role-manager role-edit" type="button" data-refund="' + r.id + '">Refund</button>';
      return '<tr><td class="nowrap">' + esc(r.id) + '</td><td>' + esc(r.guest) + '</td><td>' + esc(r.room) + '</td><td class="right tnum">' + money(r.amount) + '</td><td>' + esc(r.method) + '</td><td>' + esc(r.by) + '</td><td>' + esc(d === 'all' ? HERP.shortDate(r.date) + ' ' + r.time : r.time) + '</td><td>' + badge + '</td><td><div class="table-actions">' + acts + '</div></td></tr>';
    }).join('') : '<tr><td colspan="9" class="empty-row">No receipts match.</td></tr>';
  }

  function renderClose() {
    var exp = ops.cashExpected(today), t = todays(), cl = HERP.state().closes[today];
    var other = sum(t.filter(function (r) { return r.method !== 'Cash'; }));
    $('#dcLines').innerHTML = '<dt>Expected cash</dt><dd>' + money(exp) + '</dd><dt>Card and mobile</dt><dd>' + money(other) + '</dd><dt>Total collected</dt><dd>' + money(exp + other) + '</dd>' +
      (cl ? '<dt>Counted</dt><dd>' + money(cl.counted) + '</dd><dt>Difference</dt><dd class="' + (cl.diff === 0 ? 'text-success' : 'text-danger') + '">' + money(cl.diff) + '</dd><dt>Closed</dt><dd>' + esc(cl.time) + ' by ' + esc(cl.by) + '</dd>' : '');
    $('#dcClose').textContent = cl ? 'Update Day Close' : 'Close Day';
    var inp = $('#dcCount'); if (document.activeElement !== inp && cl && !inp.value) inp.value = cl.counted;
    dcDiff();
  }
  function dcDiff() {
    var v = $('#dcCount').value; if (v === '') { $('#dcDiff').textContent = 'Enter the cash you counted in the drawer.'; return; }
    var d = Math.round(Number(v)) - ops.cashExpected(today);
    $('#dcDiff').textContent = d === 0 ? 'Drawer matches.' : (d > 0 ? 'Over by ' : 'Short by ') + money(Math.abs(d));
  }

  function candidates() {
    return HERP.state().bookings.filter(function (b) { return (b.status === 'in-house' || b.status === 'expected') && b.due > 0; });
  }
  function resolve(v) {
    v = v.trim().toLowerCase(); if (!v) return null;
    var room = v.split(/\s*-\s*/)[0], c = candidates();
    return c.filter(function (b) { return b.room.toLowerCase() === room; })[0] || c.filter(function (b) { return b.guest.toLowerCase().indexOf(v) > -1; })[0] || null;
  }
  function renderLookup() {
    $('#rcGuests').innerHTML = candidates().filter(function (b) { return b.status === 'in-house'; }).slice(0, 60).map(function (b) { return '<option value="' + esc(b.room + ' - ' + b.guest) + '">' + money(b.due) + ' due</option>'; }).join('');
  }

  function render() { renderCards(); renderApprovals(); renderTable(); renderClose(); renderLookup(); }

  $('#rcLookup').addEventListener('input', function () {
    found = resolve(this.value);
    $('#rcHint').textContent = found ? found.guest + ', Room ' + found.room + ', balance ' + money(found.due) : (this.value ? 'No open balance found.' : '');
    if (found && !$('#rcAmt').value) $('#rcAmt').value = found.due;
  });
  $('#rcForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var err = $('#rcErr'); function fail(m, id) { err.textContent = m; err.hidden = false; $('#' + id).setAttribute('aria-invalid', 'true'); $('#' + id).focus(); }
    ['rcLookup', 'rcAmt'].forEach(function (i) { $('#' + i).removeAttribute('aria-invalid'); });
    found = resolve($('#rcLookup').value);
    if (!found) return fail('Pick a guest or room that has a balance due.', 'rcLookup');
    var amt = Math.round(Number($('#rcAmt').value));
    if (!(amt > 0)) return fail('Enter an amount above zero.', 'rcAmt');
    if (amt > found.due) return fail('The amount is more than the balance of ' + money(found.due) + '.', 'rcAmt');
    var r = ops.collectPayment(found.id, amt, $('#rcMeth').value, $('#rcNote').value.trim());
    if (!r) return fail('The payment could not be recorded.', 'rcAmt');
    err.hidden = true; this.reset(); $('#rcHint').textContent = ''; found = null;
    HERP.toast('Receipt ' + r.id + ' recorded for ' + money(amt) + '.');
  });
  $('#dcCount').addEventListener('input', dcDiff);
  $('#dcClose').addEventListener('click', function () {
    var v = $('#dcCount').value; if (v === '' || Number(v) < 0) { $('#dcCount').setAttribute('aria-invalid', 'true'); $('#dcCount').focus(); return HERP.toast('Enter the counted cash first.', 'error'); }
    $('#dcCount').removeAttribute('aria-invalid'); ops.closeDay(Math.round(Number(v))); HERP.toast('Day closed.');
  });
  ['rcQ', 'rcMethod', 'rcStatus', 'rcDate'].forEach(function (id) { $('#' + id).addEventListener('input', renderTable); });
  $('#apprList').addEventListener('click', function (e) {
    var b = e.target.closest('[data-appr]'); if (!b) return;
    var yes = b.hasAttribute('data-yes');
    if (ops.decideDiscount(b.getAttribute('data-appr'), yes)) HERP.toast(yes ? 'Discount approved.' : 'Discount rejected.', yes ? 'success' : 'warn');
  });
  $('#rcBody').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.hasAttribute('data-confirm') && ops.confirmReceipt(b.getAttribute('data-confirm'))) HERP.toast('Receipt confirmed.');
    if (b.hasAttribute('data-refund')) {
      var id = b.getAttribute('data-refund');
      HERP.confirm('Refund receipt ' + id, 'The amount goes back onto the guest balance. This cannot be undone.', 'Refund', true).then(function (ok) { if (ok && ops.refund(id)) HERP.toast('Receipt ' + id + ' refunded.', 'warn'); });
    }
    if (b.hasAttribute('data-print')) {
      var r = HERP.state().receipts.filter(function (x) { return x.id === b.getAttribute('data-print'); })[0], bk = r && ops.booking(r.bookingId);
      if (bk) HERP.printReceipt(HERP.receiptHtml(bk, r));
    }
  });

  if (HERP.qs('q')) { $('#rcQ').value = HERP.qs('q'); $('#rcDate').value = 'all'; }
  render();
  HERP.onChange(render);
});
