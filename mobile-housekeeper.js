/* mobile-housekeeper.js - the housekeeper's task list on a phone. Owner: Claude A. */
HERP.page('mobile-housekeeper', function (ctx) {
  var $ = HERP.$, esc = HERP.esc, ops = HERP.ops, view = 'tasks';
  var staff = HERP.staffRecord(ctx.user);
  $('.mhead__name').textContent = ctx.user.name;
  $('.mhead__shift').textContent = 'Housekeeper' + (staff ? ' · ' + staff.shift + ' shift' : '');
  var ISSUES = ['Air conditioner fault', 'Leaking bathroom tap', 'Broken door lock', 'TV not working', 'Water heater fault', 'Light fixture replacement'];

  function mine(states) { return HERP.state().tasks.filter(function (t) { return t.assignee === ctx.user.name && states.indexOf(t.state) > -1; }); }
  function floorOf(no) { var r = ops.room(no); return r ? (r.floor === 0 ? 'Ground' : 'Floor ' + r.floor) : ''; }

  function taskCard(t) {
    var going = t.state === 'progress';
    return '<li class="task task--' + (going ? 'progress' : 'dirty') + '"><article><header class="task__head"><strong class="task__room">Room ' + esc(t.room) + '</strong>' +
      (going ? HERP.badge('occupied', 'Cleaning') : HERP.badge('dirty', 'Dirty')) + '</header><p class="task__type">' + esc(t.type) + ' &middot; ' + floorOf(t.room) + '</p>' +
      '<div class="task__actions"><button class="btn btn--primary btn--big" type="button" data-act="start" data-id="' + t.id + '"' + (going ? ' disabled' : '') + '>Start Cleaning</button>' +
      '<button class="btn btn--big" type="button" data-act="ready" data-id="' + t.id + '"' + (going ? '' : ' disabled') + '>Mark Ready</button>' +
      '<button class="btn btn--danger btn--big" type="button" data-act="issue" data-id="' + t.id + '" data-room="' + esc(t.room) + '">Report Issue</button></div></article></li>';
  }
  function render() {
    var main = $('.mmain'), tabs = HERP.$$('.bottombar__link');
    tabs.forEach(function (a, i) { var on = ['tasks', 'done', 'profile'][i] === view; a.classList.toggle('bottombar__link--active', on); if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    if (view === 'tasks') {
      var list = mine(['dirty', 'progress']);
      main.innerHTML = '<h2 class="mmain__title">Assigned rooms <span class="badge">' + list.length + '</span></h2>' +
        (list.length ? '<ul class="tasks">' + list.map(taskCard).join('') + '</ul>' : '<div class="card"><p class="muted" style="margin:0">All caught up. New rooms appear here when a manager assigns them.</p></div>');
    } else if (view === 'done') {
      var done = mine(['ready']);
      main.innerHTML = '<h2 class="mmain__title">Done today <span class="badge">' + done.length + '</span></h2>' +
        (done.length ? '<ul class="tasks">' + done.map(function (t) { return '<li class="task"><article><header class="task__head"><strong class="task__room">Room ' + esc(t.room) + '</strong>' + HERP.badge('vacant', 'Ready') + '</header><p class="task__type">' + esc(t.note) + '</p></article></li>'; }).join('') + '</ul>' : '<div class="card"><p class="muted" style="margin:0">Nothing finished yet.</p></div>');
    } else {
      main.innerHTML = '<h2 class="mmain__title">Profile</h2><div class="card"><p style="margin:0 0 4px"><span class="avatar avatar--lg" aria-hidden="true">' + esc(HERP.initials(ctx.user.name)) + '</span></p><h3 style="margin:8px 0 4px">' + esc(ctx.user.name) + '</h3>' +
        '<p class="muted" style="margin:0 0 12px">Housekeeper' + (staff ? ' &middot; ' + esc(staff.shift) + ' shift &middot; ' + esc(staff.phone) : '') + '</p><button class="btn btn--big" type="button" data-act="logout">Sign out</button></div>';
    }
  }
  $('.mmain').addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]'); if (!b) return;
    var act = b.getAttribute('data-act'), id = b.getAttribute('data-id');
    if (act === 'logout') return HERP.logout();
    if (act === 'start' && ops.startTask(id)) HERP.toast('Cleaning started.');
    if (act === 'ready' && ops.readyTask(id)) HERP.toast('Room marked ready. Nice work.');
    if (act === 'issue') {
      var room = b.getAttribute('data-room');
      HERP.dialog({ title: 'Report issue, Room ' + room, ok: 'Send report', danger: true,
        html: '<label class="field__label" for="hIssue">What is wrong?</label><input class="input" id="hIssue" list="hIssues" placeholder="Choose or type" autocomplete="off"><datalist id="hIssues">' + ISSUES.map(function (i) { return '<option value="' + i + '">'; }).join('') + '</datalist>',
        read: function (f) { var v = f.querySelector('#hIssue').value.trim(); return v.length < 3 ? { error: 'Describe the problem in a few words.' } : v; }
      }).then(function (v) { if (v) { ops.reportIssue(room, v, id); HERP.toast('Issue reported. Maintenance has been notified.', 'warn'); } });
    }
  });
  HERP.$$('.bottombar__link').forEach(function (a, i) { a.addEventListener('click', function (e) { e.preventDefault(); view = ['tasks', 'done', 'profile'][i]; render(); }); });
  render();
  HERP.onChange(render);
});
