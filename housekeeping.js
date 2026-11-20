/* housekeeping.js - management board. Managers assign and move rooms, front desk only sends cleaning requests. Owner: Claude A. */
HERP.page('housekeeping', function () {
  var $ = HERP.$, esc = HERP.esc, ops = HERP.ops;
  var COLS = [['dirty', 'dirty', 'Dirty'], ['progress', 'progress', 'Cleaning In Progress'], ['ready', 'vacant', 'Ready'], ['maintenance', 'maintenance', 'Maintenance']];

  function housekeepers() {
    return HERP.state().staff.filter(function (s) { return s.role === 'Housekeeper' && s.status !== 'On leave'; }).map(function (s) { return s.name; });
  }
  function card(t, cls) {
    var r = ops.room(t.room), fl = r ? (r.floor === 0 ? 'Ground' : 'Floor ' + r.floor) : '';
    var tags = '';
    if (t.priority && t.priority !== 'Normal') tags += HERP.priBadge(t.priority === 'Urgent' ? 'High' : t.priority).replace('>' + (t.priority === 'Urgent' ? 'High' : t.priority) + '<', '>' + t.priority + '<');
    if (t.requested) tags += HERP.badge('reserved', 'Requested');
    var note = t.state === 'dirty' ? (t.assignee ? 'Assigned: ' + t.assignee : 'Unassigned') + (t.note ? ' - ' + t.note : '') : t.note;
    var btn = '';
    if (t.state === 'dirty') btn = '<button class="btn btn--small" type="button" data-act="req" data-room="' + esc(t.room) + '">Send Cleaning Request</button>';
    if (t.state === 'progress') btn = '<button class="btn btn--small role-manager" type="button" data-act="ready" data-id="' + t.id + '">Mark Ready</button>';
    if (t.state === 'maintenance') btn = '<button class="btn btn--small role-manager" type="button" data-act="repair" data-room="' + esc(t.room) + '">Mark Repaired</button>';
    return '<article class="room-card room-card--' + cls + '"><header class="room-card__head"><strong class="room-card__num">' + esc(t.room) + '</strong><span class="room-card__floor">' + fl + '</span></header>' +
      '<p class="room-card__note">' + esc(note) + '</p>' + (tags ? '<div class="room-card__tags">' + tags + '</div>' : '') + btn + '</article>';
  }
  function render() {
    var tasks = HERP.state().tasks;
    $('#board').innerHTML = COLS.map(function (c) {
      var list = tasks.filter(function (t) { return t.state === c[0]; });
      return '<section class="board__col board__col--' + c[1] + '" aria-label="' + c[2] + '"><h2 class="board__title">' + c[2] + ' <span class="badge">' + list.length + '</span></h2>' +
        (list.map(function (t) { return card(t, c[1]); }).join('') || '<p class="muted">Nothing here.</p>') + '</section>';
    }).join('');
    var sel = $('#as-hk'), cur = sel.value, names = housekeepers();
    sel.innerHTML = names.map(function (n) { return '<option' + (n === cur ? ' selected' : '') + '>' + esc(n) + '</option>'; }).join('');
  }

  $('#board').addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]'); if (!b) return;
    var act = b.getAttribute('data-act'), room = b.getAttribute('data-room');
    if (act === 'req') { ops.requestClean(room); HERP.toast('Cleaning request sent for Room ' + room + '.'); }
    if (act === 'ready' && ops.readyTask(b.getAttribute('data-id'))) HERP.toast('Room marked ready.');
    if (act === 'repair' && ops.repair(room)) HERP.toast('Room ' + room + ' is back in service.');
  });
  $('.assign__btn').addEventListener('click', function () {
    var room = $('#as-room').value.trim().toUpperCase(), who = $('#as-hk').value, input = $('#as-room');
    input.removeAttribute('aria-invalid');
    if (!room) { input.setAttribute('aria-invalid', 'true'); input.focus(); return HERP.toast('Enter a room number.', 'error'); }
    if (!who) return HERP.toast('No housekeeper is available.', 'error');
    var res = ops.assignTask(room, who, $('#as-pri').value);
    if (!res.ok) { input.setAttribute('aria-invalid', 'true'); input.focus(); return HERP.toast(res.error, 'error'); }
    input.value = ''; HERP.toast('Room ' + room + ' assigned to ' + who + '.');
  });
  render();
  HERP.onChange(render);
});
