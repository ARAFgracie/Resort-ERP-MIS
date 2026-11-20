# Hotel ERP - static client preview

Pure static site (HTML/CSS/JS). No database, no server code, no build step.

- Open `index.html` (or `login.html`) in a browser, or upload the whole folder to any static host (Netlify, Vercel, GitHub Pages, cPanel).
- Demo logins (password `demo123`): admin, owner, manager, frontdesk, housekeeper, service.
- All changes are saved in the visitor's browser (localStorage). Admin menu > "Reset demo data" restores the sample data.
- Analytics history is generated sample data. Passwords are demo-only.
- If the project is confirmed, `HERP.ops.*` in `js/core.js` is where a real backend plugs in.
