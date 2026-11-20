/* index.js - customer home page: theme toggle and booking request form. Static demo, nothing is sent anywhere. */
(function () {
  var D = document, root = D.documentElement;
  function setTheme(t) { root.setAttribute('data-theme', t); try { HERP_STORE.set('herp.theme', t); } catch (e) {} label(); }
  function label() { D.getElementById('themeBtn').textContent = root.getAttribute('data-theme') === 'dark' ? 'Light mode' : 'Dark mode'; }
  D.getElementById('themeBtn').addEventListener('click', function () { setTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'); });
  label();

  function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  var inp = D.getElementById('a-in'), out = D.getElementById('a-out'), t = new Date(), n = new Date(t.getTime() + 864e5);
  inp.min = iso(t); inp.value = iso(t); out.min = iso(n); out.value = iso(n);
  inp.addEventListener('change', function () {
    var nx = new Date(new Date(inp.value).getTime() + 864e5); out.min = iso(nx);
    if (out.value <= inp.value) out.value = iso(nx);
  });

  var PRICE = { STD: 6000, DLX: 8500, FAM: 11000, STE: 15000 }, NAME = { STD: 'Standard', DLX: 'Deluxe', FAM: 'Family', STE: 'Suite' };
  var msg = D.getElementById('availMsg');
  D.getElementById('availForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var name = D.getElementById('a-name').value.trim(), ph = D.getElementById('a-ph').value.trim();
    var nights = Math.round((new Date(out.value) - new Date(inp.value)) / 864e5), ty = D.getElementById('a-type').value;
    msg.classList.add('is-error');
    if (!(nights > 0)) { msg.textContent = 'Check-out must be after check-in.'; return; }
    if (!name || ph.replace(/\D/g, '').length < 7) { msg.textContent = 'Please enter your name and a valid phone number.'; return; }
    var total = Math.round(PRICE[ty] * nights * 1.15);
    msg.classList.remove('is-error');
    msg.textContent = 'Thank you, ' + name + '. ' + NAME[ty] + ' room, ' + nights + (nights === 1 ? ' night' : ' nights') + ', about BDT ' + total.toLocaleString('en-IN') + ' with tax. Our team will call you to confirm. (Preview: nothing was sent.)';
  });
})();
