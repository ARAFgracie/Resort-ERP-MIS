/* seed.js - demo data for the preview build. Owner: Claude A.
   Builds one realistic day for the 417-room hotel, relative to "today", so the app always looks current.
   In production this file goes away: the same shapes come from the SQL database (see db/schema.sql). */
(function (global) {
  'use strict';

  var RATES = { STD: 6000, DLX: 8500, FAM: 11000, STE: 15000 };
  var TAX = 0.15;

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  var pad = function (n) { return String(n).padStart(2, '0'); };
  var iso = function (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  var parse = function (s) { var p = s.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); };
  var add = function (s, n) { var d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
  var diff = function (a, b) { return Math.round((parse(b) - parse(a)) / 86400000); };

  var BD_FIRST = ['Md. Tanvir', 'Nusrat', 'Farhan', 'Tasnim', 'Sabrina', 'Imran', 'Mehedi', 'Shaila', 'Arif', 'Mitu', 'Zahid', 'Anika', 'Rubel', 'Sumaiya', 'Tareq', 'Lamia', 'Shakil', 'Kamrul', 'Nadia', 'Habib', 'Rumana', 'Sajib', 'Ishrat', 'Jahid', 'Moushumi'];
  var BD_LAST = ['Rahman', 'Hossain', 'Ahmed', 'Islam', 'Khan', 'Chowdhury', 'Akter', 'Begum', 'Sarker', 'Mahmud', 'Uddin', 'Siddique', 'Karim', 'Mia', 'Talukder'];
  var INTL = ['Daniel Carter', 'Emily Roberts', 'David Wilson', 'Liam O\'Connor', 'Chen Wei', 'Anna Kowalski', 'Omar Haddad', 'Sophie Martin', 'Jonas Weber', 'Aisha Malik', 'Rahul Verma', 'Elena Petrova', 'James Taylor', 'Yuki Sato', 'Carlos Mendes', 'Fatima Al-Sayed', 'Noah Brown', 'Grace Lee', 'Marco Rossi', 'Ingrid Berg'];
  var ISSUES = ['Air conditioner fault', 'Leaking bathroom tap', 'Broken door lock', 'TV not working', 'Water heater fault', 'Light fixture replacement'];

  function build(today) {
    var rnd = mulberry32(417);
    var pick = function (a) { return a[Math.floor(rnd() * a.length)]; };
    var rint = function (a, b) { return a + Math.floor(rnd() * (b - a + 1)); };
    var now = new Date();
    var nowMin = now.getHours() * 60 + now.getMinutes();
    var hm = function (m) { m = Math.max(0, Math.min(1439, m)); return pad(Math.floor(m / 60)) + ':' + pad(m % 60); };
    var ago = function (m) { return hm(nowMin - m); };

    var st = {
      version: 1, seedDate: today,
      counters: { BK: 20300, RC: 7700, GU: 1000, RQ: 100, TK: 300, TS: 500, DA: 1, ST: 1 },
      rooms: [], guests: [], bookings: [], receipts: [], requests: [], tickets: [],
      tasks: [], staff: [], users: [], activity: [], approvals: [], closes: {}, access: null
    };

    /* ---------- rooms ---------- */
    var SMAP = { V: 'vacant', O: 'occupied', D: 'dirty', M: 'maintenance', R: 'reserved' };
    var rm = {};
    (global.HERP_ROOMS || '').split(',').forEach(function (e) {
      var p = e.split(' ');
      var r = { no: p[0], floor: p[0][0] === 'G' ? 0 : Math.floor(parseInt(p[0], 10) / 100), type: p[1], status: SMAP[p[2]], bookingId: null };
      st.rooms.push(r); rm[r.no] = r;
    });
    var setS = function (no, s) { if (rm[no]) rm[no].status = s; };

    ['806', '1004', '1112', '523', '330', '604'].forEach(function (n) { setS(n, 'occupied'); });
    ['322', '309', '733', '229', '1019', '1022'].forEach(function (n) { setS(n, 'reserved'); });
    [['217', 'dirty'], ['204', 'dirty'], ['512', 'occupied'], ['906', 'dirty'], ['1108', 'dirty'], ['317', 'dirty'], ['118', 'dirty'],
     ['423', 'dirty'], ['721', 'dirty'], ['105', 'vacant'], ['230', 'vacant'], ['614', 'vacant'], ['815', 'vacant'],
     ['826', 'maintenance'], ['518', 'maintenance']].forEach(function (x) { setS(x[0], x[1]); });

    var keepD = { '204': 1, '906': 1, '1108': 1, '317': 1, '118': 1, '423': 1, '721': 1, '217': 1 };
    var extraD = 0, extraM = 0;
    st.rooms.forEach(function (r) {
      if (r.status === 'dirty' && !keepD[r.no]) { if (extraD < 6) extraD++; else r.status = 'vacant'; }
      if (r.status === 'maintenance' && r.no !== '826' && r.no !== '518') { if (extraM < 3) extraM++; else r.status = 'vacant'; }
    });

    /* ---------- guests, bookings, receipts ---------- */
    var mkPhone = function () { return '+880 1' + pick(['7', '8', '9', '3']) + rint(10, 99) + '-' + rint(100000, 999999); };
    var mkGuest = function (name, phone, idType, idNo, notes) {
      idType = idType || pick(['NID', 'NID', 'Passport', 'Driving License']);
      var g = {
        id: 'G-' + (st.counters.GU++), name: name, phone: phone || mkPhone(), idType: idType,
        idNo: idNo || (idType === 'Passport' ? pick(['AB', 'TK', 'US', 'GB']) + rint(1000000, 9999999) : String(rint(1000000000, 9999999999))),
        notes: notes || ''
      };
      st.guests.push(g); return g;
    };
    var randName = function () { return rnd() < 0.62 ? pick(BD_FIRST) + ' ' + pick(BD_LAST) : pick(INTL); };
    var FD = ['Farzana Akter', 'Sarah Mitchell'];
    var mkReceipt = function (o) {
      var r = {
        id: o.id || ('RC-' + (st.counters.RC++)), bookingId: o.bookingId, guest: o.guest, room: o.room,
        amount: o.amount, method: o.method || pick(['Cash', 'Cash', 'Card', 'Mobile Banking']),
        by: o.by || pick(FD), date: o.date, time: o.time, status: o.status || 'Received', note: o.note || ''
      };
      st.receipts.push(r); return r;
    };
    var mkBooking = function (o) {
      var type = rm[o.room].type, rate = RATES[type], nights = diff(o.checkIn, o.checkOut);
      var subtotal = rate * nights, tax = Math.round(subtotal * TAX), total = subtotal + tax;
      var due = o.due == null ? 0 : Math.min(o.due, total);
      var b = {
        id: o.id || ('BK-' + (st.counters.BK++)), guestId: o.guest.id, guest: o.guest.name, phone: o.guest.phone, room: o.room, type: type,
        checkIn: o.checkIn, checkOut: o.checkOut, nights: nights, rate: rate, subtotal: subtotal, tax: tax,
        discount: 0, discountStatus: 'none', total: total, paid: total - due, due: due, status: o.status,
        eta: o.eta || null, arrivedAt: o.arrivedAt || null, departedAt: o.departedAt || null,
        adults: rint(1, 3), children: rint(0, 2), source: o.source || pick(['Walk-in', 'Phone', 'Website', 'Agent']),
        createdAt: o.checkIn
      };
      st.bookings.push(b);
      if (o.status === 'in-house') rm[o.room].bookingId = b.id;
      if (b.paid > 0 && o.receipt !== false) {
        var t = o.checkIn === today ? hm(rint(390, Math.max(391, nowMin))) : hm(rint(480, 1200));
        mkReceipt({ bookingId: b.id, guest: b.guest, room: b.room, amount: b.paid, date: o.checkIn, time: t });
      }
      return b;
    };

    /* named guests used across the screens by B, C and D */
    var named = [
      ['Sarah Johnson', '806', 0, 2, 0, null, { arrivedAt: ago(25) }],
      ['Hiroshi Tanaka', '1004', -3, 0, 4200, ['+81 90 1234 5678', 'Passport', 'TK1234567', 'Late check-out requested until 14:00. Prefers high floor.']],
      ['Maria Gonzalez', '1112', -2, 0, 0],
      ['Kamal Hossain', '523', -2, 1, 9500],
      ['Priya Sharma', '330', -1, 4, 0]
    ];
    named.forEach(function (n) {
      var d = n[5] || [];
      var g = mkGuest(n[0], d[0], d[1], d[2], d[3]);
      var o = { guest: g, room: n[1], checkIn: add(today, n[2]), checkOut: add(today, n[3]), status: 'in-house', due: n[4] };
      if (n[6]) o.arrivedAt = n[6].arrivedAt;
      mkBooking(o);
    });
    /* Tanvir Rahman (shown in the search screen) with a pending mobile banking receipt */
    var tv = mkGuest('Md. Tanvir Rahman', '+880 1711-234567', 'NID', '1987654321');
    var tvB = mkBooking({ id: 'BK-20418', guest: tv, room: '604', checkIn: add(today, -1), checkOut: add(today, 2), status: 'in-house', due: 12500, receipt: false });
    mkReceipt({ id: 'RC-7731', bookingId: tvB.id, guest: tv.name, room: '604', amount: tvB.paid, method: 'Mobile Banking', status: 'Pending', date: add(today, -1), time: '16:20', by: 'Farzana Akter' });
    /* checked out this morning */
    var nj = mkGuest('Nusrat Jahan');
    mkBooking({ guest: nj, room: '217', checkIn: add(today, -2), checkOut: today, status: 'checked-out', departedAt: ago(45), due: 0 });

    /* expected arrivals today */
    var arrivals = [
      ['Rafiqul Islam', '322', 2, '11:30', 0], ['Farhan Ahmed', '309', 3, '14:00', 0], ['Emily Clarke', '733', 4, '15:30', 0.2],
      ['Tasnim Akter', '229', 2, '16:00', 0], ['David Miller', '1019', 1, '18:45', 0], ['Nusrat Jahan Rahman', '1022', 2, '13:00', 0]
    ];
    arrivals.forEach(function (a) {
      var g = mkGuest(a[0], a[0] === 'Nusrat Jahan Rahman' ? '+880 1819-556677' : null);
      var type = rm[a[1]].type, tot = Math.round(RATES[type] * a[2] * (1 + TAX));
      var dep = a[4] ? Math.round(tot * a[4] / 100) * 100 : 0;
      var b = mkBooking({ guest: g, room: a[1], checkIn: today, checkOut: add(today, a[2]), status: 'expected', eta: a[3], due: tot - dep });
      if (a[0] === 'Farhan Ahmed') {
        b.discount = 1500; b.discountStatus = 'pending';
        st.approvals.push({ id: 'DA-' + (st.counters.DA++), bookingId: b.id, guest: b.guest, room: b.room, amount: 1500, reason: 'Returning guest', by: 'Sarah Mitchell', date: today, time: ago(40), status: 'pending' });
      }
    });

    /* everyone else, generated */
    var nArr = 0;
    st.rooms.forEach(function (r) {
      if (r.bookingId || st.bookings.some(function (b) { return b.room === r.no && b.status === 'expected'; })) return;
      if (r.status === 'occupied') {
        var g = mkGuest(randName()), n, ci, co;
        if (rnd() < 0.12) { n = rint(1, 4); co = today; ci = add(today, -n); }
        else { n = rint(1, 5); var k = rint(0, n - 1); ci = add(today, -k); co = add(ci, n); }
        var tot = Math.round(RATES[r.type] * diff(ci, co) * (1 + TAX));
        var due = rnd() < 0.15 ? Math.round(tot * (0.2 + rnd() * 0.4) / 100) * 100 : 0;
        mkBooking({ guest: g, room: r.no, checkIn: ci, checkOut: co, status: 'in-house', due: due, arrivedAt: ci === today ? hm(rint(360, Math.max(361, nowMin))) : null });
      } else if (r.status === 'reserved') {
        var g2 = mkGuest(randName()), today1 = nArr++ < 6;
        var ci2 = today1 ? today : add(today, rint(1, 6)), n2 = rint(1, 4);
        var tot2 = Math.round(RATES[r.type] * n2 * (1 + TAX));
        mkBooking({ guest: g2, room: r.no, checkIn: ci2, checkOut: add(ci2, n2), status: 'expected', eta: today1 ? hm(rint(Math.max(nowMin, 600), 1260)) : '14:00', due: tot2 });
      }
    });

    /* ---------- staff and logins ---------- */
    var S = function (name, role, dept, shift, phone, status, joined, days) {
      var id = 'S-' + (st.counters.ST++);
      st.staff.push({ id: id, name: name, role: role, dept: dept, shift: shift, phone: phone, status: status,
        email: name.toLowerCase().replace(/[^a-z ]/g, '').replace(/ +/g, '.') + '@example.com', joined: joined, days: days });
      return id;
    };
    var six = [1, 1, 1, 1, 1, 1, 0], sixB = [1, 1, 1, 1, 1, 0, 1], five = [1, 1, 0, 1, 1, 1, 1];
    var sRahim = S('Rahim Uddin', 'Manager', 'Administration', 'Morning', '+880 1711-100201', 'On duty', '2021-03-12', six);
    var sFarz = S('Farzana Akter', 'Front Desk', 'Front Office', 'Morning', '+880 1819-100202', 'On duty', '2022-01-09', six);
    S('Sarah Mitchell', 'Front Desk', 'Front Office', 'Evening', '+880 1913-100203', 'Off duty', '2022-06-20', sixB);
    S('Abdur Rahman', 'Housekeeper', 'Housekeeping', 'Morning', '+880 1712-100204', 'On duty', '2020-11-02', six);
    S('Shirin Sultana', 'Housekeeper', 'Housekeeping', 'Evening', '+880 1815-100205', 'On leave', '2021-08-15', sixB);
    var sKarim = S('Karim Hossain', 'Service Staff', 'Guest Services', 'Morning', '+880 1916-100206', 'On duty', '2023-02-01', five);
    var sRina = S('Rina Begum', 'Housekeeper', 'Housekeeping', 'Morning', '+880 1717-100207', 'On duty', '2021-05-30', six);
    S('Jamal Sheikh', 'Housekeeper', 'Housekeeping', 'Morning', '+880 1818-100208', 'On duty', '2022-09-12', six);
    S('Mizanur Rahman', 'Housekeeper', 'Housekeeping', 'Evening', '+880 1919-100209', 'On duty', '2023-04-18', sixB);
    S('Sabina Akter', 'Service Staff', 'Guest Services', 'Evening', '+880 1711-100210', 'On duty', '2022-12-05', six);

    var U = function (username, role, name, staffId) { st.users.push({ username: username, password: 'demo123', role: role, name: name, staffId: staffId || null }); };
    U('admin', 'admin', 'System Admin');
    U('owner', 'owner', 'Hotel Owner');
    U('manager', 'manager', 'Rahim Uddin', sRahim);
    U('frontdesk', 'frontdesk', 'Farzana Akter', sFarz);
    U('housekeeper', 'housekeeper', 'Rina Begum', sRina);
    U('service', 'service', 'Karim Hossain', sKarim);

    /* ---------- housekeeping tasks ---------- */
    var T = function (room, type, assignee, state, note, extra) {
      var t = { id: 'TK-' + (st.counters.TK++), room: room, type: type, assignee: assignee || '', priority: 'Normal', state: state, note: note || '', time: ago(rint(20, 200)), requested: false };
      for (var k in extra) t[k] = extra[k];
      st.tasks.push(t); return t;
    };
    T('204', 'Checkout cleaning', 'Rina Begum', 'dirty', 'Checked out ' + ago(150));
    T('317', 'Checkout cleaning', 'Rina Begum', 'progress', 'Rina Begum, started ' + ago(30), { startedAt: ago(30) });
    T('512', 'Stay-over service', 'Rina Begum', 'dirty', 'Stay-over service');
    T('906', 'Deep clean', 'Rina Begum', 'dirty', 'Checked out ' + ago(100));
    T('1108', 'Checkout cleaning', '', 'dirty', 'Checked out ' + ago(85));
    T('217', 'Checkout cleaning', '', 'dirty', 'Checked out ' + ago(45));
    T('118', 'Checkout cleaning', 'Rina Begum', 'progress', 'Rina Begum, started ' + ago(95), { startedAt: ago(95) });
    T('423', 'Checkout cleaning', 'Jamal Sheikh', 'progress', 'Jamal Sheikh, started ' + ago(70), { startedAt: ago(70) });
    T('721', 'Checkout cleaning', 'Rina Begum', 'progress', 'Rina Begum, started ' + ago(55), { startedAt: ago(55) });
    [['105', 'Rina Begum', 140], ['230', 'Jamal Sheikh', 125], ['614', 'Jamal Sheikh', 110], ['815', 'Rina Begum', 95]].forEach(function (x) {
      T(x[0], 'Checkout cleaning', x[1], 'ready', 'Inspected ' + ago(x[2]), { doneAt: ago(x[2]) });
    });
    var iss = 0;
    st.rooms.forEach(function (r) {
      if (r.status === 'dirty' && !st.tasks.some(function (t) { return t.room === r.no; })) T(r.no, 'Checkout cleaning', '', 'dirty', 'Checked out ' + ago(rint(60, 240)));
      if (r.status === 'maintenance') T(r.no, 'Maintenance', '', 'maintenance', r.no === '826' ? 'Leaking bathroom tap' : r.no === '518' ? 'Air conditioner fault' : ISSUES[iss++ % ISSUES.length]);
    });

    /* ---------- room requests and guest support ---------- */
    var Q = function (room, text, kind, pri, staff, status, mins) {
      st.requests.push({ id: 'RQ-' + (st.counters.RQ++), room: room, text: text, kind: kind, priority: pri, staff: staff, status: status, date: today, time: ago(mins) });
    };
    Q('204', 'Extra towels', 'amenity', 'Low', 'Karim Hossain', 'Pending', 190);
    Q('312', 'Extra bedding', 'amenity', 'Medium', 'Karim Hossain', 'Pending', 160);
    Q('518', 'Air conditioner not cooling', 'maintenance', 'High', 'Karim Hossain', 'In progress', 130);
    Q('701', 'Amenity refill', 'amenity', 'Low', 'Unassigned', 'Pending', 105);
    Q('826', 'Leaking bathroom tap', 'maintenance', 'High', 'Karim Hossain', 'Pending', 75);
    Q('1015', 'Extra towels', 'amenity', 'Low', 'Sabina Akter', 'Done', 60);
    Q('1102', 'Amenity refill', 'amenity', 'Medium', 'Sabina Akter', 'Done', 35);
    Q('407', 'Extra bedding', 'amenity', 'Medium', 'Unassigned', 'Pending', 12);

    var K = function (kind, title, guest, room, mins, status, body) {
      st.tickets.push({ id: 'TS-' + (st.counters.TS++), kind: kind, title: title, guest: guest, room: room, date: today, time: ago(mins), status: status, body: body, replies: [] });
    };
    K('Complaint', 'Noisy corridor late at night', 'Mr. Daniel Carter', '905', 120, 'Open', 'Guest reports loud voices in the corridor on floor 9 between 1 AM and 2 AM. Requests that night security checks the floor.');
    K('Inquiry', 'Airport pickup arrangement', 'Farzana Islam', '318', 170, 'New', 'Guest asks whether the hotel can arrange an airport pickup for tomorrow at 6 PM and what the fare would be.');
    K('Feedback', 'Friendly and fast check-in', 'Priya Sharma', '330', 210, 'Closed', 'Guest praised the front desk team for a quick and friendly check-in.');
    K('Complaint', 'Wi-Fi keeps disconnecting', 'Nusrat Jahan', '1104', 20, 'Urgent', 'Wi-Fi drops every few minutes. Guest needs a stable connection for video calls today.');

    /* ---------- recent activity ---------- */
    var A = function (mins, text, kind) { st.activity.push({ date: today, time: ago(mins), text: text, kind: kind }); };
    A(25, 'Room 806 checked in, Sarah Johnson', 'checkin');
    A(45, 'Room 217 checked out, Nusrat Jahan', 'checkout');
    A(85, 'Room 1108 marked dirty after check-out', 'housekeeping');
    A(110, 'Cash receipt received for Room 330', 'cash');
    A(130, 'Maintenance reported in Room 518 (air conditioner)', 'maintenance');
    A(160, 'Walk-in booking confirmed, Room 309', 'booking');
    return st;
  }

  global.HERP_SEED = { build: build, RATES: RATES, TAX: TAX };
})(typeof window !== 'undefined' ? window : globalThis);
