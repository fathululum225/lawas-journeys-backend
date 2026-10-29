'use strict';

/**
 * End-to-end smoke test for a running API.
 *
 *   1. npm run dev            (in one terminal)
 *   2. npm run smoke          (in another terminal)
 *
 * Override the target with:  API_URL=http://localhost:3100/api npm run smoke
 * It creates a few extra records (a test user, bookings and a throw-away package) but
 * only changes demo-level data, and it removes the package/article/destination it adds.
 */

const API_URL = process.env.API_URL || 'http://localhost:3000/api';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@lawasjourneys.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin12345';

let passed = 0;
let failed = 0;

const check = (label, condition, detail = '') => {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${label}`);
  } else {
    failed += 1;
    console.log(`  ✗ ${label} ${detail}`);
  }
};

const call = async (method, path, { body, token } = {}) => {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await response.json().catch(() => null);
  return { status: response.status, json, data: json?.data, meta: json?.meta };
};

const section = (title) => console.log(`\n${title}`);

const futureDate = (days) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

const testCatalogue = async () => {
  section('Catalogue');

  const health = await call('GET', '/health');
  check('GET /health responds ok', health.status === 200 && health.data.status === 'ok');

  const packages = await call('GET', '/packages?limit=50');
  check('GET /packages returns the seeded packages', packages.status === 200 && packages.meta.total >= 13);

  const featured = await call('GET', '/packages?featured=true&limit=5');
  check('GET /packages?featured=true returns 5 cards', featured.data.length === 5);

  const yogyakarta = await call('GET', '/packages?destination=yogyakarta');
  check('filter by destination', yogyakarta.data.length > 0 && yogyakarta.data.every((item) => item.destination.slug === 'yogyakarta'));

  const culinary = await call('GET', '/packages?category=Culinary');
  check('filter by category', culinary.data.length >= 1 && culinary.data.every((item) => item.categories.includes('Culinary')));

  const cheapest = await call('GET', '/packages?sort=price_asc&limit=3');
  check('sort by price ascending', cheapest.data[0].price <= cheapest.data[1].price);

  const search = await call('GET', '/packages?q=toraja');
  check('text search', search.data.length === 1);

  const detail = await call('GET', '/packages/ancient-yogyakarta-borobudur');
  check('GET /packages/:slug returns itinerary', detail.status === 200 && detail.data.itinerary.length === 3);

  const missing = await call('GET', '/packages/does-not-exist');
  check('unknown package returns 404 envelope', missing.status === 404 && missing.json.success === false);

  const destinations = await call('GET', '/destinations');
  check('GET /destinations returns 4', destinations.data.length === 4);

  const destination = await call('GET', '/destinations/yogyakarta');
  check('GET /destinations/:slug includes attractions and packages', destination.data.attractions.length === 5 && destination.data.packages.length > 0);

  const categories = await call('GET', '/categories');
  check('GET /categories returns 6 interests', categories.data.length === 6);

  const unknownRoute = await call('GET', '/nope');
  check('unknown route returns JSON 404', unknownRoute.status === 404 && unknownRoute.json.success === false);
};

const testArticles = async () => {
  section('Journal');

  const featured = await call('GET', '/articles?featured=true');
  check('3 featured articles', featured.data.length === 3);

  const latest = await call('GET', '/articles?featured=false&limit=5&page=1');
  check('latest articles are paginated', latest.data.length === 5 && latest.meta.totalPages >= 2);
  check('list items hide the full body', latest.data[0].content === undefined);

  const history = await call('GET', '/articles?category=History');
  check('filter by category', history.data.length > 0 && history.data.every((item) => item.category === 'History'));

  const tags = await call('GET', '/articles/tags');
  check('popular tags', tags.data.length === 12);

  const categories = await call('GET', '/articles/categories');
  check('article categories with counts', categories.data.categories.length >= 4 && categories.data.total >= 14);

  const article = await call('GET', '/articles/the-story-of-borobudur-more-than-a-temple');
  check('article detail with related stories', article.status === 200 && article.data.content.length > 100 && Array.isArray(article.data.related));
};

const testAuth = async () => {
  section('Authentication');

  const email = `smoke.${Date.now()}@example.com`;

  const weak = await call('POST', '/auth/register', { body: { name: 'Smoke Tester', email, password: 'short' } });
  check('weak password rejected with 422', weak.status === 422);

  const registered = await call('POST', '/auth/register', { body: { name: 'Smoke Tester', email, password: 'smoke-pass-123' } });
  check('register creates an account and token', registered.status === 201 && Boolean(registered.data.token));

  const duplicate = await call('POST', '/auth/register', { body: { name: 'Smoke Tester', email, password: 'smoke-pass-123' } });
  check('duplicate email returns 409', duplicate.status === 409);

  const wrong = await call('POST', '/auth/login', { body: { email, password: 'wrong-password' } });
  check('wrong password returns 401', wrong.status === 401);

  const login = await call('POST', '/auth/login', { body: { email, password: 'smoke-pass-123' } });
  check('login returns a token', login.status === 200 && Boolean(login.data.token));

  const me = await call('GET', '/auth/me', { token: login.data.token });
  check('GET /auth/me returns the user', me.status === 200 && me.data.email === email);

  const anonymous = await call('GET', '/auth/me');
  check('GET /auth/me without token returns 401', anonymous.status === 401);

  return { email, token: login.data.token };
};

const testBookingFlow = async (customer) => {
  section('Booking -> payment -> WhatsApp flow');

  const invalid = await call('POST', '/bookings', { body: { packageSlug: 'ancient-yogyakarta-borobudur', guests: 2 } });
  check('incomplete booking returns 422 with field errors', invalid.status === 422 && invalid.json.errors.length >= 3);

  const tooMany = await call('POST', '/bookings', {
    body: {
      packageSlug: 'ancient-yogyakarta-borobudur',
      customerName: 'Smoke Tester',
      customerEmail: customer.email,
      customerPhone: '+62 812 0000 1111',
      travelDate: futureDate(30),
      guests: 99,
    },
  });
  check('guests above the package limit are rejected', tooMany.status === 422);

  const pastDate = await call('POST', '/bookings', {
    body: {
      packageSlug: 'ancient-yogyakarta-borobudur',
      customerName: 'Smoke Tester',
      customerEmail: customer.email,
      customerPhone: '+62 812 0000 1111',
      travelDate: '2020-01-01',
      guests: 2,
    },
  });
  check('past travel date is rejected', pastDate.status === 422);

  const created = await call('POST', '/bookings', {
    token: customer.token,
    body: {
      packageSlug: 'ancient-yogyakarta-borobudur',
      customerName: 'Smoke Tester',
      customerEmail: customer.email,
      customerPhone: '+62 812 0000 1111',
      travelDate: futureDate(30),
      guests: 2,
      notes: 'Smoke test booking',
    },
  });
  check('POST /bookings creates a pending booking', created.status === 201 && created.data.status === 'pending');
  check('total price = unit price x guests', created.data.totalPrice === 2 * 2590000);

  const { code } = created.data;

  const byCode = await call('GET', `/bookings/${code}`);
  check('GET /bookings/:code', byCode.status === 200 && byCode.data.code === code);

  const lookup = await call('GET', `/bookings/lookup?code=${code}&email=${encodeURIComponent(customer.email)}`);
  check('lookup by code and email', lookup.status === 200);

  const badLookup = await call('GET', `/bookings/lookup?code=${code}&email=other@example.com`);
  check('lookup with a different email returns 404', badLookup.status === 404);

  const mine = await call('GET', '/bookings/mine', { token: customer.token });
  check('GET /bookings/mine lists the booking', mine.status === 200 && mine.data.some((booking) => booking.code === code));

  const payment = await call('POST', '/payments/create', { body: { bookingCode: code } });
  check('POST /payments/create opens a session', payment.status === 201 && payment.data.status === 'pending' && payment.data.amount === created.data.totalPrice);

  const resumed = await call('POST', '/payments/create', { body: { bookingCode: code } });
  check('creating again resumes the same pending session', resumed.status === 200 && resumed.data.orderId === payment.data.orderId);

  const { orderId } = payment.data;

  const fetched = await call('GET', `/payments/${orderId}`);
  check('GET /payments/:orderId', fetched.status === 200 && fetched.data.booking.code === code);

  const badMethod = await call('POST', `/payments/${orderId}/simulate`, { body: { method: 'bitcoin' } });
  check('unknown payment method rejected', badMethod.status === 400);

  const paid = await call('POST', `/payments/${orderId}/simulate`, { body: { method: 'qris' } });
  check('simulate settles the payment', paid.status === 200 && paid.data.status === 'settlement');
  check('booking becomes paid and confirmed', paid.data.booking.paymentStatus === 'paid' && paid.data.booking.status === 'confirmed');

  const verified = await call('POST', '/payments/verify', { body: { orderId } });
  check('POST /payments/verify reports settlement', verified.status === 200 && verified.data.status === 'settlement');

  const again = await call('POST', '/payments/create', { body: { bookingCode: code } });
  check('paying an already paid booking returns 409', again.status === 409);

  const whatsappConfig = await call('GET', '/whatsapp/config');
  check('GET /whatsapp/config', whatsappConfig.status === 200 && /^\d{8,15}$/.test(whatsappConfig.data.number));

  const notify = await call('POST', '/whatsapp/notify', { body: { bookingCode: code } });
  check('POST /whatsapp/notify returns a wa.me link', notify.status === 200 && notify.data.url.startsWith('https://wa.me/') && notify.data.url.includes(code));

  return code;
};

const testLeads = async () => {
  section('Custom trips & newsletter');

  const invalid = await call('POST', '/custom-trips', { body: { name: 'A' } });
  check('invalid custom trip returns 422', invalid.status === 422);

  const created = await call('POST', '/custom-trips', {
    body: {
      name: 'Smoke Tester',
      email: 'smoke@example.com',
      phone: '+62 812 0000 1111',
      destinations: ['Yogyakarta'],
      interests: ['Heritage'],
      guests: 2,
      message: 'Smoke test request',
    },
  });
  check('POST /custom-trips', created.status === 201 && created.data.status === 'new');

  const subscribed = await call('POST', '/newsletter', { body: { email: `news.${Date.now()}@example.com` } });
  check('POST /newsletter subscribes', subscribed.status === 201);

  const invalidEmail = await call('POST', '/newsletter', { body: { email: 'not-an-email' } });
  check('invalid newsletter email returns 422', invalidEmail.status === 422);

  return created.data.id;
};

const testAdmin = async ({ customerToken, bookingCode, customTripId }) => {
  section('Admin');

  const anonymous = await call('GET', '/admin/dashboard');
  check('dashboard without token returns 401', anonymous.status === 401);

  const forbidden = await call('GET', '/admin/dashboard', { token: customerToken });
  check('dashboard as customer returns 403', forbidden.status === 403);

  const login = await call('POST', '/auth/login', { body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD } });
  check('admin login', login.status === 200 && login.data.user.role === 'admin');
  const token = login.data.token;

  const dashboard = await call('GET', '/admin/dashboard', { token });
  check('dashboard totals and recent bookings', dashboard.status === 200 && dashboard.data.totals.packages >= 13 && dashboard.data.recentBookings.length > 0);

  const bookings = await call('GET', '/bookings?status=confirmed', { token });
  check('admin lists bookings with a status filter', bookings.status === 200 && bookings.data.every((booking) => booking.status === 'confirmed'));

  const cancelled = await call('PATCH', `/bookings/${bookingCode}/status`, { token, body: { status: 'cancelled' } });
  check('admin changes booking status', cancelled.status === 200 && cancelled.data.status === 'cancelled');

  const badStatus = await call('PATCH', `/bookings/${bookingCode}/status`, { token, body: { status: 'teleported' } });
  check('invalid booking status returns 422', badStatus.status === 422);

  const trips = await call('GET', '/custom-trips', { token });
  check('admin lists custom trip requests', trips.status === 200 && trips.data.length >= 3);

  const contacted = await call('PATCH', `/custom-trips/${customTripId}/status`, { token, body: { status: 'contacted' } });
  check('admin updates a custom trip status', contacted.status === 200 && contacted.data.status === 'contacted');

  const removedTrip = await call('DELETE', `/custom-trips/${customTripId}`, { token });
  check('admin deletes a custom trip request', removedTrip.status === 200);

  // Destination CRUD
  const destination = await call('POST', '/destinations', {
    token,
    body: { name: 'Smoke Island', tagline: 'Temporary', description: 'Temporary destination', bestTime: { summary: 'Always', dry: { months: 'All year', note: 'n/a' } } },
  });
  check('create destination', destination.status === 201 && destination.data.slug === 'smoke-island');

  const renamed = await call('PUT', `/destinations/${destination.data.id}`, { token, body: { name: 'Smoke Island Two', tagline: 'Renamed' } });
  check('update destination keeps its slug', renamed.status === 200 && renamed.data.slug === 'smoke-island' && renamed.data.name === 'Smoke Island Two');

  // Package CRUD
  const invalidPackage = await call('POST', '/packages', { token, body: { title: 'x' } });
  check('invalid package returns 422', invalidPackage.status === 422);

  const tourPackage = await call('POST', '/packages', {
    token,
    body: {
      title: 'Smoke Test Journey',
      destinationId: destination.data.id,
      categories: ['Heritage'],
      summary: 'A throw-away package',
      durationDays: 2,
      durationNights: 1,
      price: 1000000,
      originalPrice: 1200000,
      itinerary: [{ title: 'Day one', description: 'Arrive' }, { title: 'Day two', description: 'Leave' }],
      highlights: ['One', 'Two'],
    },
  });
  check('create package', tourPackage.status === 201 && tourPackage.data.itinerary[1].day === 2);

  const updatedPackage = await call('PUT', `/packages/${tourPackage.data.id}`, {
    token,
    body: { ...tourPackage.data, destinationId: destination.data.id, price: 900000 },
  });
  check('update package', updatedPackage.status === 200 && updatedPackage.data.price === 900000);

  const blockedDelete = await call('DELETE', `/destinations/${destination.data.id}`, { token });
  check('deleting a destination that still has packages returns 409', blockedDelete.status === 409);

  const removedPackage = await call('DELETE', `/packages/${tourPackage.data.id}`, { token });
  check('delete package', removedPackage.status === 200);

  const removedDestination = await call('DELETE', `/destinations/${destination.data.id}`, { token });
  check('delete destination', removedDestination.status === 200);

  // Article CRUD
  const article = await call('POST', '/articles', {
    token,
    body: { title: 'Smoke Test Article', category: 'Travel Guide', content: 'This is a throw-away article body used by the smoke test.', tags: ['Tips'] },
  });
  check('create article with a computed read time', article.status === 201 && article.data.readMinutes >= 1);

  const editedArticle = await call('PUT', `/articles/${article.data.id}`, {
    token,
    body: { ...article.data, excerpt: 'Edited excerpt' },
  });
  check('update article', editedArticle.status === 200 && editedArticle.data.excerpt === 'Edited excerpt');

  const removedArticle = await call('DELETE', `/articles/${article.data.id}`, { token });
  check('delete article', removedArticle.status === 200);
};

const run = async () => {
  console.log(`Smoke testing ${API_URL}`);

  const health = await call('GET', '/health').catch(() => null);
  if (!health || health.status !== 200) {
    console.error(`\nThe API is not reachable at ${API_URL}. Start it first with "npm run dev".`);
    process.exit(1);
  }

  await testCatalogue();
  await testArticles();
  const customer = await testAuth();
  const bookingCode = await testBookingFlow(customer);
  const customTripId = await testLeads();
  await testAdmin({ customerToken: customer.token, bookingCode, customTripId });

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
};

run().catch((error) => {
  console.error('Smoke test crashed:', error);
  process.exit(1);
});
