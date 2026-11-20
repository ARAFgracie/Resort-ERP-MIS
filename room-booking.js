/* room-booking.js - fast walk-in booking desk. Owner: Claude A. */
HERP.page('room-booking', function (ctx) {
  var $ = HERP.$, esc = HERP.esc, money = HERP.money, ops = HERP.ops;
  var today = HERP.today();
  var ORDER = ['STD', 'DLX', 'STE', 'FAM'];
  var mgr = ctx.role === 'manager' || ctx.role === 'admin';
  var selType = 'DLX', pickedRoom = '', paidTouched = false;

  var pre = HERP.qs('room') && ops.room(HERP.qs('room'));
  if (pre) { selType = pre.type; pickedRoom = pre.no; }

  $('#rbIn').value = today; $('#rbIn').min = today;
  $('#rbOut').value = HERP.addDays(today, 1); $('#rbOut').min = HERP.addDays(today, 1);

  function dates() {
    var ci = $('#rbIn').value, co = $('#rbOut').value;
    return { ci: ci, co: co, nights: ci && co ? HERP.diffDays(ci, co) : 0 };
  }
  function dateError(d) {
    if (!d.ci || !d.co) return 'Choose both a check-in and a check-out date.';
    if (d.ci < today) return 'Check-in cannot be in the past.';
    if (d.nights < 1) return 'Check-out must be after check-in.';
    return '';
  }
  function chosenRoom(avail) {
    if (pickedRoom && avail.some(function (r) { return r.no === pickedRoom; })) return pickedRoom;
    return avail.length ? avail[0].no : '';
  }

  function totals(d, roomNo) {
    var r = roomNo && ops.room(roomNo);
    var rate = r ? HERP.RATES[r.type] : (HERP.RATES[selType] || 0);
    var sub = rate * Math.max(d.nights, 0), tax = Math.round(sub * HERP.TAX);
    var disc = Math.max(0, Math.round(Number($('#rbDisc').value) || 0));
    var applied = mgr ? Math.min(disc, sub + tax) : 0;
    return { rate: rate, sub: sub, tax: tax, disc: disc, applied: applied, total: sub + tax - applied };
  }

  function render() {
    var d = dates(), err = dateError(d), ok = !err;
    $('#rbDateErr').hidden = ok; $('#rbDateErr').textContent = err;
    $('#rbOut').min = HERP.addDays($('#rbIn').value || today, 1);

    /* step 2: type cards with live availability */
    var counts = {};
    ORDER.forEach(function (c) { counts[c] = ok ? ops.available(c, d.ci, d.co).length : 0; });
    if (!counts[selType]) { var first = ORDER.filter(function (c) { return counts[c] > 0; })[0]; if (first) { selType = first; pickedRoom = ''; } }
    $('#rbTypes').innerHTML = ORDER.map(function (c) {
      var n = counts[c];
      return '<label class="rtype"><input class="rtype__input" type="radio" name="room-type" value="' + c + '"' + (c === selType ? ' checked' : '') + (n ? '' : ' disabled') + '>' +
        '<span class="rtype__card"><span class="rtype__name">' + HERP.TYPES[c] + '</span><span class="rtype__price">' + money(HERP.RATES[c]) + ' / night</span>' +
        '<span class="rtype__avail' + (n ? '' : ' rtype__avail--none') + '">' + (n ? n + ' available' : 'Sold out for these dates') + '</span></span></label>';
    }).join('');

    var avail = ok ? ops.available(selType, d.ci, d.co) : [];
    var room = chosenRoom(avail);
    $('#rbRoom').innerHTML = avail.length
      ? '<option value="">Auto-assign (Room ' + esc(avail[0].no) + ')</option>' + avail.map(function (r) { return '<option value="' + r.no + '"' + (r.no === pickedRoom ? ' selected' : '') + '>Room ' + r.no + ' (floor ' + (r.floor === 0 ? 'G' : r.floor) + ')</option>'; }).join('')
      : '<option value="">No rooms available</option>';
    $('#rbRoom').disabled = !avail.length;

    /* summary */
    var t = totals(d, room);
    var lines = [['Room', room ? HERP.TYPES[selType] + ', Room ' + room : 'None selected'], ['Nights', ok ? d.nights : '-'], ['Rate', money(t.rate)], ['Subtotal', money(t.sub)], ['Taxes (15%)', money(t.tax)]];
    if (t.disc > 0) lines.push([mgr ? 'Discount' : 'Discount (pending)', (mgr ? '-' : '') + money(mgr ? t.applied : t.disc)]);
    $('#rbLines').innerHTML = lines.map(function (l) { return '<dt>' + l[0] + '</dt><dd>' + esc(l[1]) + '</dd>'; }).join('');
    $('#rbTotal').textContent = money(t.total);
    $('#rbDiscNote').textContent = t.disc > 0 ? (mgr ? 'Discount applied. You are signed in as ' + ctx.user.name + '.' : 'Discount needs Manager approval. The total stays the same until it is approved.') : (mgr ? '' : 'Discounts need Manager approval.');
    if (!paidTouched) $('#rbPaid').value = t.total;
    $('#rbCheckWrap').hidden = d.ci !== today;
    $('#rbConfirm').disabled = !room;
    return { d: d, room: room, t: t, ok: ok };
  }

  function bad(id, msg) {
    var f = $('#' + id); HERP.$$('[aria-invalid]').forEach(function (x) { x.removeAttribute('aria-invalid'); });
    if (f) { f.setAttribute('aria-invalid', 'true'); f.focus(); }
    $('#rbErr').textContent = msg; $('#rbErr').hidden = false;
  }

  function confirmBooking() {
    var s = render(), err = $('#rbErr'); err.hidden = true;
    HERP.$$('[aria-invalid]').forEach(function (x) { x.removeAttribute('aria-invalid'); });
    if (!s.ok) return bad('rbIn', dateError(s.d));
    if (!s.room) return bad('rbRoom', 'No room is available for these dates.');
    var name = $('#rbName').value.trim(), phone = $('#rbPhone').value.trim();
    if (name.length < 2) return bad('rbName', 'Enter the guest name.');
    if (phone.replace(/\D/g, '').length < 7) return bad('rbPhone', 'Enter a valid phone number.');
    if (s.t.disc > s.t.sub + s.t.tax) return bad('rbDisc', 'The discount is more than the booking total.');
    var paid = Math.round(Number($('#rbPaid').value) || 0);
    if (paid < 0 || paid > s.t.total) return bad('rbPaid', 'Amount received must be between 0 and ' + money(s.t.total) + '.');
    if (!ops.available(selType, s.d.ci, s.d.co).some(function (r) { return r.no === s.room; })) return bad('rbRoom', 'That room was just taken. Pick another.');

    var btn = $('#rbConfirm'); btn.disabled = true;
    var res = ops.createBooking({
      room: s.room, name: name, phone: phone, idType: $('#rbIdType').value, idNo: $('#rbIdNo').value,
      checkIn: s.d.ci, checkOut: s.d.co, adults: Number($('#rbAdults').value) || 1, children: Number($('#rbKids').value) || 0,
      discount: s.t.disc, paid: paid, method: ($('input[name=pay]:checked') || {}).value, checkInNow: $('#rbCheckin').checked, source: 'Walk-in'
    });
    var b = res.booking;
    var note = b.discountStatus === 'pending' ? '<p class="modal__text">The ' + money(b.discount) + ' discount is waiting for Manager approval.</p>' : '';
    HERP.dialog({ title: 'Booking confirmed: ' + b.id, html: note + HERP.receiptHtml(b, res.receipt), ok: 'Print Receipt', cancel: 'Done' }).then(function (print) {
      if (print) HERP.printReceipt(HERP.receiptHtml(b, res.receipt));
      $('#rbName').value = ''; $('#rbPhone').value = ''; $('#rbIdNo').value = ''; $('#rbDisc').value = 0;
      paidTouched = false; pickedRoom = ''; render(); $('#rbName').focus();
    });
  }

  $('#rbIn').addEventListener('change', function () {
    if ($('#rbOut').value <= this.value) $('#rbOut').value = HERP.addDays(this.value, 1);
    pickedRoom = ''; render();
  });
  $('#rbOut').addEventListener('change', function () { pickedRoom = ''; render(); });
  $('#rbTypes').addEventListener('change', function (e) { if (e.target.name === 'room-type') { selType = e.target.value; pickedRoom = ''; render(); } });
  $('#rbRoom').addEventListener('change', function () { pickedRoom = this.value; render(); });
  $('#rbDisc').addEventListener('input', function () { render(); });
  $('#rbPaid').addEventListener('input', function () { paidTouched = true; });
  $('#rbConfirm').addEventListener('click', confirmBooking);

  render();
  HERP.onChange(function () { if (!document.querySelector('.modal.is-open')) render(); });
});
