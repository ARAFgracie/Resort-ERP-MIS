/* mobile-service.js - service staff request list on a phone. No guest personal data is shown. Owner: Claude A. */
HERP.page('mobile-service', function (ctx) {
  var $ = HERP.$, esc = HERP.esc, view = 'tasks';
  var staff = HERP.staffRecord(ctx.user), PRI = { High: 0, Medium: 1, Low: 2 };
  $('.mhead__name').textContent = ctx.user.name;
  $('.mhead__shift').textContent = 'Service Staff' + (staff ? ' · ' + staff.shift + ' shift' : '');

  function mine(done) { return HERP.state().requests.filter(function (q) { return q.staff === ctx.user.name && (done ? q.status === 'Done' : q.status !== 'Done'); }); }
  function card(q) {
    var going = q.status === 'In progress';
    return '<li class="task task--' + q.priority.toLowerCase() + '"><article><header class="task__head"><strong class="task__room">Room ' + esc(q.room) + '</strong>' + HERP.priBadge(q.priority) + '</header>' +
      '<p class="task__type">' + esc(q.text) + '</p><p class="task__time">' + (going ? 'On the way &middot; ' : '') + 'Requested ' + esc(q.time) + '</p>' +
      '<div class="task__actions"><button class="btn btn--primary btn--big" type="button" data-act="go" data-id="' + q.id + '"' + (going ? ' disabled' : '') + '>On My Way</button>' +
      '<button class="btn btn--big" type="button" data-act="done" data-id="' + q.id + '">Done</button></div></article></li>';
  }
  function render() {
    var main = $('.mmain'), tabs = HERP.$$('.bottombar__link');
    tabs.forEach(function (a, i) { var on = ['tasks', 'done', 'profile'][i] === view; a.classList.toggle('bottombar__link--active', on); if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    if (view === 'tasks') {
      var list = mine(false).sort(function (a, b) { return PRI[a.priority] - PRI[b.priority]; });
      main.innerHTML = '<h2 class="mmain__title">Incoming requests <span class="badge">' + list.length + '</span></h2>' +
        (list.length ? '<ul class="tasks">' + list.map(card).join('') + '</ul>' : '<div class="card"><p class="muted" style="margin:0">No requests right now.</p></div>');
    } else if (view === 'done') {
      var d = mine(true);
      main.innerHTML = '<h2 class="mmain__title">Done today <span class="badge">' + d.length + '</span></h2>' +
        (d.length ? '<ul class="tasks">' + d.map(function (q) { return '<li class="task"><article><header class="task__head"><strong class="task__room">Room ' + esc(q.room) + '</strong>' + HERP.badge('vacant', 'Done') + '</header><p class="task__type">' + esc(q.text) + '</p></article></li>'; }).join('') + '</ul>' : '<div class="card"><p class="muted" style="margin:0">Nothing finished yet.</p></div>');
    } else {
      main.innerHTML = '<h2 class="mmain__title">Profile</h2><div class="card"><p style="margin:0"><span class="avatar avatar--lg" aria-hidden="true">' + esc(HERP.initials(ctx.user.name)) + '</span></p><h3 style="margin:8px 0 4px">' + esc(ctx.user.name) + '</h3>' +
        '<p class="muted" style="margin:0 0 12px">Service Staff' + (staff ? ' &middot; ' + esc(staff.shift) + ' shift &middot; ' + esc(staff.phone) : '') + '</p><button class="btn btn--big" type="button" data-act="logout">Sign out</button></div>';
    }
  }
  $('.mmain').addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]'); if (!b) return;
    var act = b.getAttribute('data-act'), q = HERP.state().requests.filter(function (x) { return x.id === b.getAttribute('data-id'); })[0];
    if (act === 'logout') return HERP.logout();
    if (!q) return;
    if (act === 'go') { q.status = 'In progress'; HERP.log('Service staff on the way to Room ' + q.room, 'service'); HERP.save(); HERP.toast('Marked on the way.'); }
    if (act === 'done') { q.status = 'Done'; HERP.log('Request done in Room ' + q.room + ': ' + q.text, 'service'); HERP.save(); HERP.toast('Request completed.'); }
  });
  HERP.$$('.bottombar__link').forEach(function (a, i) { a.addEventListener('click', function (e) { e.preventDefault(); view = ['tasks', 'done', 'profile'][i]; render(); }); });
  render();
  HERP.onChange(render);
});
