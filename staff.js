/* staff.js - staff records, shifts, and (Admin only) module permissions. Owner: Claude A. */
HERP.page('staff', function (ctx) {
  var $ = HERP.$, esc = HERP.esc;
  var selected = HERP.qs('id') || null, q = '';
  var DAYS = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'], SHIFTS = ['Morning', 'Evening', 'Night'];
  var SUMMARY = {
    'Manager': 'All operational modules, housekeeping assignment, staff schedules, cash reports, Analytics, discount and refund approval.',
    'Front Desk': 'Dashboard, Front Desk, Room Booking, Rooms, Guest Services, Cash Receiving and Search. Housekeeping is view only plus cleaning requests.',
    'Housekeeper': 'Mobile task list only: assigned rooms, start cleaning, mark ready, report issues.',
    'Service Staff': 'Mobile request list only: on my way, done. No guest data, cash or staff records.'
  };
  var STATUS = { 'On duty': 'vacant', 'Off duty': 'dirty', 'On leave': 'reserved' };
  function list() {
    return HERP.state().staff.filter(function (s) { return !q || (s.name + ' ' + s.role + ' ' + s.dept).toLowerCase().indexOf(q) > -1; });
  }
  function renderTable() {
    var rows = list();
    $('#staffBody').innerHTML = rows.length ? rows.map(function (s) {
      return '<tr class="row-sel' + (s.id === selected ? ' row-sel--on' : '') + '" data-id="' + s.id + '"><td><span class="avatar" aria-hidden="true">' + esc(HERP.initials(s.name)) + '</span></td><td>' + esc(s.name) + '</td><td>' + esc(s.role) + '</td><td>' + esc(s.dept) + '</td><td>' + esc(s.shift) + '</td><td class="nowrap">' + esc(s.phone) + '</td><td>' + HERP.badge(STATUS[s.status] || '', s.status) + '</td><td><button class="btn" type="button" data-view="' + s.id + '">View</button></td></tr>';
    }).join('') : '<tr><td colspan="8" class="empty-row">No staff match your search.</td></tr>';
  }
  function schedule(m) {
    var mates = HERP.state().staff.filter(function (s) { return s.dept === m.dept; }), html = '<div class="sched__head"></div>' + DAYS.map(function (d) { return '<div class="sched__head">' + d + '</div>'; }).join('');
    SHIFTS.forEach(function (sh) {
      html += '<div class="sched__label">' + sh + '</div>';
      DAYS.forEach(function (d, i) {
        var on = mates.filter(function (s) { return s.shift === sh && s.days && s.days[i]; });
        var txt = !on.length ? '-' : on.length === 1 ? on[0].name.split(' ')[0] + ' ' + on[0].name.split(' ').pop()[0] + '.' : on.length + ' staff';
        html += '<div class="sched__cell' + (on.length ? ' sched__cell--on' : '') + '" title="' + esc(on.map(function (s) { return s.name; }).join(', ')) + '">' + esc(txt) + '</div>';
      });
    });
    return html;
  }
  function renderDetail() {
    var box = $('#staffDetail'), m = HERP.state().staff.filter(function (s) { return s.id === selected; })[0];
    if (!m) { box.innerHTML = '<h2 class="card__title" id="detail-title">Staff details</h2><p class="muted">Select a staff member and press View.</p>'; return; }
    box.innerHTML = '<div class="detail__head"><span class="avatar avatar--lg" aria-hidden="true">' + esc(HERP.initials(m.name)) + '</span><div><h2 class="detail__name" id="detail-title">' + esc(m.name) + '</h2>' + HERP.badge(STATUS[m.status] || '', m.status) + '</div></div>' +
      '<label class="field__label role-manager" for="stStatus">Status</label><select class="select role-manager" id="stStatus">' + ['On duty', 'Off duty', 'On leave'].map(function (o) { return '<option' + (o === m.status ? ' selected' : '') + '>' + o + '</option>'; }).join('') + '</select>' +
      '<h3 class="detail__h">Personal info</h3><dl class="dl"><dt>Phone</dt><dd>' + esc(m.phone) + '</dd><dt>Email</dt><dd>' + esc(m.email) + '</dd><dt>Joined</dt><dd>' + HERP.date(m.joined) + '</dd><dt>Department</dt><dd>' + esc(m.dept) + '</dd><dt>Shift</dt><dd>' + esc(m.shift) + '</dd></dl>' +
      '<h3 class="detail__h">Role and permissions</h3><p class="detail__text"><strong>' + esc(m.role) + '.</strong> ' + esc(SUMMARY[m.role] || '') + '</p><button class="btn role-admin" type="button" data-act="perm">Edit permissions</button>' +
      '<h3 class="detail__h">Weekly shift schedule (' + esc(m.dept) + ')</h3><div class="sched" role="table" aria-label="Weekly shift schedule">' + schedule(m) + '</div>';
  }
  function render() { renderTable(); renderDetail(); }

  function editPerms(m) {
    var role = HERP.roleFromStaff(m.role), mods = HERP.PAGES;
    if (role === 'housekeeper' || role === 'service') return HERP.dialog({ title: 'Permissions: ' + m.role, html: '<p class="modal__text">This role only uses its own mobile task screen. There are no modules to change.</p>', ok: 'OK', cancel: false });
    var cur = HERP.allowed(role);
    HERP.dialog({
      title: 'Permissions: ' + m.role + ' role',
      html: '<p class="modal__text">Choose which modules every ' + esc(m.role) + ' can open. This applies to the whole role, not just ' + esc(m.name) + '.</p><ul class="perm-list">' + mods.map(function (p) { return '<li><label><input type="checkbox" value="' + p.key + '"' + (cur.indexOf(p.key) > -1 ? ' checked' : '') + '> ' + p.label + '</label></li>'; }).join('') + '</ul>',
      ok: 'Save permissions',
      read: function (f) { var v = HERP.$$('input:checked', f).map(function (i) { return i.value; }); return v.length ? v : { error: 'Keep at least one module.' }; }
    }).then(function (v) {
      if (!v) return;
      var s = HERP.state(); s.access = s.access || {}; s.access[role] = v;
      HERP.log('Permissions updated for the ' + m.role + ' role', 'admin'); HERP.save(); HERP.toast('Permissions saved for ' + m.role + '.');
    });
  }

  $('#staffBody').addEventListener('click', function (e) { var r = e.target.closest('[data-id]'); if (r) { selected = r.getAttribute('data-id'); render(); } });
  $('#staffDetail').addEventListener('click', function (e) { var b = e.target.closest('[data-act="perm"]'); if (b) editPerms(HERP.state().staff.filter(function (s) { return s.id === selected; })[0]); });
  $('#staffDetail').addEventListener('change', function (e) {
    if (e.target.id !== 'stStatus') return;
    var m = HERP.state().staff.filter(function (s) { return s.id === selected; })[0]; if (!m) return;
    m.status = e.target.value; HERP.log(m.name + ' set to ' + m.status.toLowerCase(), 'staff'); HERP.save(); HERP.toast(m.name + ' is now ' + m.status.toLowerCase() + '.');
  });
  $('#staffQ').addEventListener('input', function () { q = this.value.trim().toLowerCase(); renderTable(); });

  $('#addStaffForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var err = $('#addErr'), name = $('#s-name').value.trim(), phone = $('#s-phone').value.trim();
    function fail(m, id) { err.textContent = m; err.hidden = false; $('#' + id).setAttribute('aria-invalid', 'true'); $('#' + id).focus(); }
    $('#s-name').removeAttribute('aria-invalid'); $('#s-phone').removeAttribute('aria-invalid');
    if (name.length < 2) return fail('Enter the full name.', 's-name');
    if (phone.replace(/\D/g, '').length < 7) return fail('Enter a valid phone number.', 's-phone');
    var m = { id: HERP.nextId('staff'), name: name, role: $('#s-role').value, dept: $('#s-dept').value, shift: $('#s-shift').value, phone: phone, status: 'On duty', email: name.toLowerCase().replace(/[^a-z ]/g, '').replace(/ +/g, '.') + '@example.com', joined: HERP.today(), days: [1, 1, 1, 1, 1, 1, 0] };
    HERP.state().staff.push(m); HERP.log('Staff member added: ' + name + ' (' + m.role + ')', 'staff');
    selected = m.id; err.hidden = true; this.reset(); HERP.modal.close('add-staff'); HERP.save(); HERP.toast(name + ' added to the staff list.');
  });

  if (!selected) selected = (HERP.state().staff[0] || {}).id;
  render();
  HERP.onChange(render);
});
