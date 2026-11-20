/* guest-services.js - room requests and guest support tickets. Owner: Claude A. */
HERP.page('guest-services', function (ctx) {
  var $ = HERP.$, esc = HERP.esc, ops = HERP.ops;
  var selected = null;
  var PRI = { High: 0, Medium: 1, Low: 2 };
  var STAT = { Pending: 0, 'In progress': 1, Done: 2 };
  var TSORT = { Urgent: 0, Open: 1, New: 2, Closed: 3 };

  function serviceNames() {
    return HERP.state().staff.filter(function (s) { return s.role === 'Service Staff' && s.status !== 'On leave'; }).map(function (s) { return s.name; });
  }
  function sel(cls, id, field, options, value) {
    return '<select class="select cell-select ' + cls + '" data-req="' + id + '" data-f="' + field + '" aria-label="' + field + '">' +
      options.map(function (o) { return '<option' + (o === value ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join('') + '</select>';
  }

  function renderRequests() {
    var s = HERP.state(), fs = $('#gsStatus').value, fp = $('#gsPri').value, names = ['Unassigned'].concat(serviceNames());
    var list = s.requests.filter(function (q) { return (!fs || q.status === fs) && (!fp || q.priority === fp); }).sort(function (a, b) {
      return (STAT[a.status] - STAT[b.status]) || (PRI[a.priority] - PRI[b.priority]) || (a.time < b.time ? 1 : -1);
    });
    var open = s.requests.filter(function (q) { return q.status !== 'Done'; }).length;
    $('#tabReq').textContent = 'Room Requests (' + open + ' open)';
    $('#reqBody').innerHTML = list.length ? list.map(function (q) {
      var staff = names.indexOf(q.staff) < 0 ? names.concat([q.staff]) : names;
      return '<tr><td><strong>' + esc(q.room) + '</strong></td><td>' + esc(q.text) + '</td><td>' + esc(q.time) + '</td><td>' + HERP.priBadge(q.priority) + '</td>' +
        '<td>' + sel('', q.id, 'staff', staff, q.staff) + '</td><td>' + sel('', q.id, 'status', ['Pending', 'In progress', 'Done'], q.status) + '</td></tr>';
    }).join('') : '<tr><td colspan="6" class="empty-row">No requests match these filters.</td></tr>';
  }

  function renderTickets() {
    var s = HERP.state();
    var list = s.tickets.slice().sort(function (a, b) { return (TSORT[a.status] - TSORT[b.status]) || (a.time < b.time ? 1 : -1); });
    if (!selected && list.length) selected = list[0].id;
    var open = s.tickets.filter(function (t) { return t.status !== 'Closed'; }).length;
    $('#tabSup').textContent = 'Guest Support (' + open + ' open)';
    $('#ticketList').innerHTML = list.map(function (t) {
      return '<li class="ticket' + (t.id === selected ? ' ticket--on' : '') + '"><a class="ticket__link" href="#ticket-detail" data-t="' + t.id + '"><span class="ticket__kind">' + esc(t.kind) + '</span><span class="ticket__title">' + esc(t.title) + '</span><span class="ticket__meta">' +
        esc(t.guest) + ' &middot; Room ' + esc(t.room) + ' &middot; ' + esc(t.time) + '</span></a>' + HERP.ticketBadge(t.status) + '</li>';
    }).join('') || '<li class="empty-row">No tickets.</li>';
    renderDetail();
  }

  function renderDetail() {
    var box = $('#ticket-detail'), t = HERP.state().tickets.filter(function (x) { return x.id === selected; })[0];
    if (!t) { box.innerHTML = '<h2 class="card__title">Ticket detail</h2><p class="detail__placeholder">Select a ticket to read it and reply.</p>'; return; }
    var typed = $('#reply') ? $('#reply').value : '';
    box.innerHTML = '<h2 class="card__title">Ticket detail</h2>' +
      '<p class="detail__head">' + HERP.badge(t.kind === 'Complaint' ? 'dirty' : t.kind === 'Inquiry' ? 'reserved' : 'vacant', t.kind) + ' <strong>' + esc(t.title) + '</strong> ' + HERP.ticketBadge(t.status) + '</p>' +
      '<p class="detail__meta">' + esc(t.guest) + ' &middot; Room ' + esc(t.room) + ' &middot; Today, ' + esc(t.time) + '</p>' +
      '<p class="detail__body">' + esc(t.body) + '</p>' +
      (t.replies && t.replies.length ? '<ul class="replies">' + t.replies.map(function (r) { return '<li class="replies__item"><span class="replies__meta">' + esc(r.by) + ', ' + esc(r.time) + '</span>' + esc(r.text) + '</li>'; }).join('') + '</ul>' : '') +
      '<label class="field__label" for="reply">Reply</label><textarea class="textarea" id="reply" rows="4" placeholder="Write a reply to the guest">' + esc(typed) + '</textarea>' +
      '<p class="field-error" id="replyErr" role="alert" hidden></p>' +
      '<div class="detail__actions"><button class="btn btn--primary" type="button" data-act="send">Send Reply</button>' +
      '<button class="btn" type="button" data-act="resolve">' + (t.status === 'Closed' ? 'Reopen' : 'Mark Resolved') + '</button></div>';
  }

  function render() { renderRequests(); renderTickets(); }

  /* request table: assign staff and change status */
  $('#reqBody').addEventListener('change', function (e) {
    var el = e.target.closest('[data-req]'); if (!el) return;
    var q = HERP.state().requests.filter(function (x) { return x.id === el.getAttribute('data-req'); })[0]; if (!q) return;
    if (el.getAttribute('data-f') === 'staff') { q.staff = el.value; HERP.log('Request for Room ' + q.room + ' assigned to ' + q.staff, 'service'); HERP.toast('Assigned to ' + q.staff + '.'); }
    else { q.status = el.value; HERP.log('Request for Room ' + q.room + ' marked ' + q.status.toLowerCase(), 'service'); }
    HERP.save();
  });
  $('#gsStatus').addEventListener('change', renderRequests);
  $('#gsPri').addEventListener('change', renderRequests);

  /* tickets */
  $('#ticketList').addEventListener('click', function (e) {
    var a = e.target.closest('[data-t]'); if (!a) return;
    e.preventDefault(); selected = a.getAttribute('data-t'); renderTickets();
  });
  $('#ticket-detail').addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]'); if (!b) return;
    var t = HERP.state().tickets.filter(function (x) { return x.id === selected; })[0]; if (!t) return;
    if (b.getAttribute('data-act') === 'send') {
      var v = $('#reply').value.trim(), err = $('#replyErr');
      if (!v) { err.textContent = 'Write a reply before sending.'; err.hidden = false; $('#reply').setAttribute('aria-invalid', 'true'); $('#reply').focus(); return; }
      t.replies = t.replies || []; t.replies.push({ by: ctx.user.name, time: HERP.nowHM(), text: v });
      if (t.status === 'New') t.status = 'Open';
      HERP.log('Reply sent to ' + t.guest + ' (Room ' + t.room + ')', 'service');
      $('#reply').value = ''; HERP.save(); HERP.toast('Reply sent to ' + t.guest + '.');
    } else {
      t.status = t.status === 'Closed' ? 'Open' : 'Closed';
      HERP.log('Ticket "' + t.title + '" ' + (t.status === 'Closed' ? 'resolved' : 'reopened'), 'service');
      HERP.save(); HERP.toast(t.status === 'Closed' ? 'Ticket resolved.' : 'Ticket reopened.');
    }
  });

  /* new request form */
  $('#nrForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var err = $('#nrErr'), room = ops.room($('#nr-room').value.trim());
    function fail(m, id) { err.textContent = m; err.hidden = false; $('#' + id).setAttribute('aria-invalid', 'true'); $('#' + id).focus(); }
    ['nr-room'].forEach(function (id) { $('#' + id).removeAttribute('aria-invalid'); });
    if (!room) return fail('That room number does not exist.', 'nr-room');
    if (room.status !== 'occupied') return fail('Room ' + room.no + ' has no guest in house.', 'nr-room');
    var type = $('#nr-type').value, note = $('#nr-note').value.trim();
    HERP.state().requests.unshift({ id: HERP.nextId('request'), room: room.no, text: type + (note ? ': ' + note : ''), kind: type === 'Maintenance fix' ? 'maintenance' : 'amenity', priority: $('#nr-pri').value, staff: 'Unassigned', status: 'Pending', date: HERP.today(), time: HERP.nowHM() });
    HERP.log('New request for Room ' + room.no + ': ' + type, 'service');
    err.hidden = true; this.reset(); HERP.modal.close('new-request'); HERP.save();
    $('#tab-requests').checked = true; HERP.toast('Request created for Room ' + room.no + '.');
  });

  if (HERP.qs('tab') === 'support') $('#tab-support').checked = true;
  render();
  HERP.onChange(render);
});
