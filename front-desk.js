/* front-desk.js - arrivals, in-house guests, check-in, check-out, payments. Owner: Claude A. */
HERP.page('front-desk', function () {
  var $ = HERP.$, esc = HERP.esc, money = HERP.money, ops = HERP.ops;
  var q = '', selected = HERP.qs('booking');

  function match(b) { return !q || (b.guest + ' ' + b.room + ' ' + b.phone + ' ' + b.id).toLowerCase().indexOf(q) > -1; }

  function item(b, kind) {
    var on = b.id === selected ? ' guest-list__item--on' : '', r = ops.room(b.room);
    var meta, btn;
    if (kind === 'arr') {
      meta = 'Room ' + esc(b.room) + ', ' + esc(HERP.TYPES[b.type]) + ', ' + b.nights + (b.nights === 1 ? ' night' : ' nights') + ', ETA ' + esc(b.eta || '-');
      var blocked = r && (r.status === 'dirty' || r.status === 'maintenance');
      btn = '<button class="btn btn--primary role-edit" type="button" data-act="in" data-id="' + b.id + '"' + (blocked ? ' disabled title="Room is ' + r.status + '"' : '') + '>Check In</button>';
    } else {
      meta = 'Room ' + esc(b.room) + ', ' + (b.checkOut === HERP.today() ? 'out today' : 'out ' + HERP.shortDate(b.checkOut)) + ', due ' + money(b.due);
      btn = '<button class="btn role-edit" type="button" data-act="out" data-id="' + b.id + '">Check Out</button>';
    }
    return '<li class="guest-list__item' + on + '"><div class="guest-list__main" role="button" tabindex="0" data-sel="' + b.id + '"><strong>' + esc(b.guest) + '</strong><p class="guest-list__meta">' + meta + '</p></div>' + btn + '</li>';
  }

  function renderLists() {
    var s = HERP.state(), t = HERP.today();
    var arr = s.bookings.filter(function (b) { return b.status === 'expected' && b.checkIn === t; }).sort(function (a, b) { return (a.eta || '') < (b.eta || '') ? -1 : 1; });
    var inh = s.bookings.filter(function (b) { return b.status === 'in-house'; }).sort(function (a, b) { return a.checkOut === b.checkOut ? (a.room < b.room ? -1 : 1) : (a.checkOut < b.checkOut ? -1 : 1); });
    $('#arrCount').textContent = arr.length; $('#inhCount').textContent = inh.length;
    var a2 = arr.filter(match), i2 = inh.filter(match);
    var keepA = $('#arrList').scrollTop, keepI = $('#inhList').scrollTop;   /* a click must not jump the list back to the top */
    $('#arrList').innerHTML = a2.length ? a2.map(function (b) { return item(b, 'arr'); }).join('') : '<li class="guest-list__empty">' + (q ? 'No arrivals match.' : 'No more arrivals expected today.') + '</li>';
    $('#inhList').innerHTML = i2.length ? i2.map(function (b) { return item(b, 'out'); }).join('') : '<li class="guest-list__empty">' + (q ? 'No in-house guests match.' : 'No guests in house.') + '</li>';
    $('#arrList').scrollTop = keepA; $('#inhList').scrollTop = keepI;
  }

  function renderDetail() {
    var box = $('#detail'), b = selected && ops.booking(selected);
    if (!b) { box.innerHTML = '<h2 class="card__title" id="det-title">Guest Details</h2><p class="detail__placeholder">Select a guest to see their details here.</p>'; return; }
    var g = ops.guestOf(b) || {};
    var act = '';
    if (b.status === 'expected') act += '<button class="btn btn--primary role-edit" type="button" data-act="in" data-id="' + b.id + '">Check In</button>';
    if (b.status === 'in-house') act += '<button class="btn btn--primary role-edit" type="button" data-act="out" data-id="' + b.id + '">Check Out</button>';
    if (b.due > 0 && b.status !== 'checked-out') act += '<button class="btn role-edit" type="button" data-act="pay" data-id="' + b.id + '">Collect Payment (' + money(b.due) + ')</button>';
    act += '<button class="btn" type="button" data-act="print" data-id="' + b.id + '">Print Bill</button>';
    box.innerHTML =
      '<h2 class="card__title" id="det-title">Guest Details</h2>' +
      '<p class="detail__head"><strong>' + esc(b.guest) + '</strong> ' + HERP.bookingBadge(b) + '</p>' +
      '<dl class="detail__list">' +
      '<dt>Phone</dt><dd>' + esc(b.phone) + '</dd>' +
      '<dt>ID</dt><dd>' + esc(g.idType || '-') + (g.idNo ? ', ' + esc(g.idNo) : '') + '</dd>' +
      '<dt>Room</dt><dd>' + esc(b.room) + ', ' + esc(HERP.TYPES[b.type]) + '</dd>' +
      '<dt>Stay</dt><dd>' + HERP.shortDate(b.checkIn) + ' to ' + HERP.shortDate(b.checkOut) + ' (' + b.nights + (b.nights === 1 ? ' night' : ' nights') + ')</dd>' +
      '<dt>Booking</dt><dd>' + esc(b.id) + '</dd>' +
      '<dt>Total</dt><dd>' + money(b.total) + '</dd>' +
      '<dt>Balance due</dt><dd class="detail__due' + (b.due ? '' : ' detail__due--ok') + '">' + money(b.due) + '</dd>' +
      (b.discountStatus === 'pending' ? '<dt>Discount</dt><dd>' + money(b.discount) + ' awaiting manager approval</dd>' : '') +
      '</dl>' +
      '<div class="detail__notes"><label class="field__label" for="gNotes">Notes</label><textarea class="textarea" id="gNotes" rows="3">' + esc(g.notes || '') + '</textarea>' +
      '<button class="btn btn--small role-edit" type="button" data-act="notes" data-id="' + b.id + '" style="margin-top:8px">Save Notes</button></div>' +
      '<div class="detail__actions">' + act + '</div>';
  }

  function render() { renderLists(); renderDetail(); }

  function collect(b, andCheckout) {
    var html = '<p class="modal__text">' + esc(b.guest) + ', Room ' + esc(b.room) + '. Balance due <strong>' + money(b.due) + '</strong>.</p>' +
      '<label class="field__label" for="pAmt">Amount (BDT)</label><input class="input" id="pAmt" type="number" min="1" max="' + b.due + '" value="' + b.due + '">' +
      '<label class="field__label" for="pMeth" style="margin-top:12px">Payment method</label><select class="select" id="pMeth"><option>Cash</option><option>Card</option><option>Mobile Banking</option></select>';
    return HERP.dialog({
      title: andCheckout ? 'Collect balance and check out' : 'Collect payment', html: html, ok: andCheckout ? 'Collect and check out' : 'Collect payment',
      read: function (f) {
        var a = Math.round(Number(f.querySelector('#pAmt').value));
        if (!(a > 0)) return { error: 'Enter an amount above zero.' };
        if (a > b.due) return { error: 'The amount is more than the balance due.' };
        if (andCheckout && a < b.due) return { error: 'The full balance must be paid before check-out.' };
        return { amount: a, method: f.querySelector('#pMeth').value };
      }
    }).then(function (v) {
      if (!v) return;
      var r = ops.collectPayment(b.id, v.amount, v.method);
      if (!r) return HERP.toast('Payment could not be recorded.', 'error');
      if (andCheckout) {
        var res = ops.checkOut(b.id);
        if (!res.ok) return HERP.toast(res.error, 'error');
        HERP.toast('Collected ' + money(v.amount) + '. Room ' + b.room + ' checked out.');
      } else HERP.toast('Collected ' + money(v.amount) + ' for Room ' + b.room + '.');
    });
  }

  document.addEventListener('click', function (e) {
    var sel = e.target.closest('[data-sel]');
    if (sel && !e.target.closest('button')) { selected = sel.getAttribute('data-sel'); render(); return; }
    var btn = e.target.closest('[data-act]'); if (!btn || !btn.closest('main')) return;
    var id = btn.getAttribute('data-id'), act = btn.getAttribute('data-act'), b = ops.booking(id);
    if (!b) return;
    selected = id;
    if (act === 'in') { var r = ops.checkIn(id); HERP.toast(r.ok ? b.guest + ' checked in to Room ' + b.room + '.' : r.error, r.ok ? 'success' : 'error'); }
    else if (act === 'out') {
      if (b.due > 0) collect(b, true); else { var r2 = ops.checkOut(id); HERP.toast(r2.ok ? 'Room ' + b.room + ' checked out and sent to housekeeping.' : r2.error, r2.ok ? 'success' : 'error'); }
    }
    else if (act === 'pay') collect(b, false);
    else if (act === 'notes') { ops.saveGuestNotes(id, $('#gNotes').value); HERP.toast('Notes saved.'); }
    else if (act === 'print') {
      var rcs = HERP.state().receipts.filter(function (x) { return x.bookingId === id && x.status !== 'Refunded'; });
      HERP.printReceipt(HERP.receiptHtml(b, rcs[rcs.length - 1] || null));
    }
  });
  document.addEventListener('keydown', function (e) {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-sel]')) { e.preventDefault(); selected = e.target.getAttribute('data-sel'); render(); }
  });
  $('#fd-q').addEventListener('input', function () { q = this.value.trim().toLowerCase(); renderLists(); });

  render();
  HERP.onChange(render);
});
