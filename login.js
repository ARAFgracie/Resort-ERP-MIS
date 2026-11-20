/* login.js - sign in, then send each role to its own home screen. Owner: Claude A. */
HERP.page('login', function () {
  var form = document.getElementById('loginForm');
  var err = document.getElementById('loginError');
  var user = document.getElementById('username');
  var pass = document.getElementById('password');
  var role = document.getElementById('role');

  var DEMO = [['admin', 'Admin'], ['owner', 'Owner'], ['manager', 'Manager'], ['frontdesk', 'Front Desk'], ['housekeeper', 'Housekeeper'], ['service', 'Service Staff']];
  var chips = document.getElementById('demoChips');
  chips.innerHTML = DEMO.map(function (d) { return '<button type="button" class="login__chip" data-u="' + d[0] + '">' + d[1] + '</button>'; }).join('');
  chips.addEventListener('click', function (e) {
    var b = e.target.closest('[data-u]'); if (!b) return;
    user.value = b.getAttribute('data-u'); pass.value = 'demo123'; role.value = b.getAttribute('data-u');
    err.hidden = true; form.querySelector('[type=submit]').focus();
  });

  /* typing a known username picks the matching role, so staff do not have to choose it */
  user.addEventListener('blur', function () {
    var u = HERP.state().users.filter(function (x) { return x.username === user.value.trim().toLowerCase(); })[0];
    if (u) role.value = u.role;
  });

  function fail(msg, field) {
    err.textContent = msg; err.hidden = false;
    [user, pass].forEach(function (f) { f.removeAttribute('aria-invalid'); });
    if (field) { field.setAttribute('aria-invalid', 'true'); field.focus(); }
  }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!user.value.trim()) return fail('Enter your username.', user);
    if (!pass.value) return fail('Enter your password.', pass);
    var res = HERP.login(user.value, pass.value, role.value);
    if (!res.ok) return fail(res.error, pass);
    window.location.href = HERP.home(res.role);
  });
});
