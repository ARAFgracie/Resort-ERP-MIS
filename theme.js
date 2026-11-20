/* theme.js - runs in <head> before first paint (no wrong-theme flash) and provides HERP_STORE.
   HERP_STORE = localStorage with a window.name fallback, so login/session/data survive page changes
   even when the browser gives every file:// page its own storage (Firefox, some previews) or blocks storage. Owner: Claude A. */
(function () {
  var PFX = 'HERP:', mirror = {};
  try { if (String(window.name).indexOf(PFX) === 0) mirror = JSON.parse(String(window.name).slice(PFX.length)) || {}; } catch (e) { mirror = {}; }
  function flush() { try { window.name = PFX + JSON.stringify(mirror); } catch (e) { /* too large: ignore */ } }
  window.HERP_STORE = {
    get: function (k) {
      var v = null;
      try { v = localStorage.getItem(k); } catch (e) {}
      return v != null ? v : (Object.prototype.hasOwnProperty.call(mirror, k) ? mirror[k] : null);
    },
    set: function (k, v) {
      try { localStorage.setItem(k, v); } catch (e) {}
      mirror[k] = v; flush();
    },
    remove: function (k) {
      try { localStorage.removeItem(k); } catch (e) {}
      delete mirror[k]; flush();
    }
  };
  var t = window.HERP_STORE.get('herp.theme');
  if (t !== 'light' && t !== 'dark') {
    t = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  document.documentElement.setAttribute('data-theme', t);
})();
