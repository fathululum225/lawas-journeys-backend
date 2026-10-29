# Lawas Journeys — Backend API

REST API untuk website reservasi tur heritage Lawas Journeys.

- **Runtime**: Node.js 22+ · **Framework**: Express 5
- **Database**: SQLite (`better-sqlite3`), dibuat dan diisi otomatis saat server pertama kali berjalan
- **Auth**: JWT (HS256) + hash password `scrypt` — tanpa paket tambahan
- **Paket**: `express`, `better-sqlite3`, `cors`, `dotenv` (dan `nodemon` untuk development). `.npmrc` berisi `ignore-scripts=true` supaya `better-sqlite3` memakai biner bawaannya dan tidak di-compile ulang.

Panduan lengkap (instalasi dari nol di VS Code, kustomisasi, integrasi) ada di [`../README.md`](../README.md). Dokumen ini khusus backend.

---

## Mulai cepat

```bash
cd backend
npm install
cp .env.example .env        # Windows: copy .env.example .env
npm run dev                 # http://localhost:3000/api/health
```

Saat pertama kali berjalan server akan: membuat file database → menjalankan migrasi → membuat akun admin dari `.env` → mengisi data contoh (13 paket, 4 destinasi, 14 artikel, booking demo).

## Script npm

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Server dengan nodemon (restart otomatis saat file berubah) |
| `npm start` | Server biasa (`node server.js`) |
| `npm run migrate` | Jalankan migrasi database saja |
| `npm run seed` | Isi data contoh bila database masih kosong |
| `npm run db:reset` | Hapus semua data lalu isi ulang data contoh |
| `npm run smoke` | Tes end-to-end seluruh endpoint terhadap server yang sedang berjalan (`API_URL` bisa diatur) |

## Arsitektur

```
request → routes → middlewares → controllers → services → models → SQLite
                                      │
                                      └→ utils (validator, response, pagination, slug)
```

| Folder | Tanggung jawab |
|---|---|
| `routes/` | Memetakan URL ke controller dan memasang middleware (auth, admin). `index.routes.js` menggabungkan semuanya di bawah `/api`. |
| `controllers/` | Membaca & memvalidasi input, memanggil model/service, mengirim response. Tidak ada SQL di sini. |
| `services/` | Logika yang berbicara dengan dunia luar: `payment.service.js`, `whatsapp.service.js`, `auth.service.js`. |
| `models/` | Semua query SQL; mengubah baris database (`snake_case`) menjadi objek `camelCase`. |
| `middlewares/` | `auth.middleware.js` (`authenticate`, `optionalAuthenticate`, `requireAdmin`), `error.middleware.js`, `not-found.middleware.js`, `request-logger.middleware.js`. |
| `utils/` | `Validator`, `AppError`, `sendSuccess/sendError`, pagination, slug, helper JSON. |
| `config/` | `env.config.js` (membaca `.env` + default) dan `database.config.js`. |
| `database/` | Skema (`migrations/`), runner migrasi, dan seeder dengan data contoh (`seeders/data/`). |
| `scripts/` | `smoke-test.js`. |

### Format response

Sukses:

```json
{ "success": true, "message": "OK", "data": { }, "meta": { "page": 1, "limit": 12, "total": 13, "totalPages": 2 } }
```

`meta` hanya ada pada daftar yang berpaginasi. Gagal:

```json
{ "success": false, "message": "Validation failed", "data": null,
  "errors": [ { "field": "customerEmail", "message": "Customer email must be a valid email address" } ] }
```

| HTTP | Arti |
|---|---|
| 200 / 201 | Berhasil / berhasil dibuat |
| 400 | Request tidak valid (mis. body kosong) |
| 401 | Token tidak ada atau salah |
| 403 | Bukan admin |
| 404 | Data / URL tidak ditemukan |
| 409 | Konflik (mis. menghapus destinasi yang masih punya paket) |
| 422 | Validasi gagal — lihat array `errors` per field |
| 500 | Kesalahan server (detailnya hanya tampil saat `NODE_ENV=development`) |

### Autentikasi

Login mengembalikan `token`. Kirim di header untuk endpoint yang butuh login:

```
Authorization: Bearer <token>
```

Role: `customer` (default saat registrasi) dan `admin` (dibuat seeder dari `ADMIN_EMAIL` / `ADMIN_PASSWORD`).

---

## Konfigurasi (`.env`)

| Variabel | Default | Keterangan |
|---|---|---|
| `PORT` | `3000` | Port server. Jika diubah, ubah juga `API_BASE_URL` di `frontend-legacy/assets/js/config.js` (HTML lama) atau `NEXT_PUBLIC_API_BASE_URL` di `frontend/.env.local` (Next.js). |
| `NODE_ENV` | `development` | `production` menyembunyikan detail error. |
| `CORS_ORIGIN` | `*` | Daftar origin frontend dipisah koma, mis. `http://127.0.0.1:5500,http://localhost:5500`. |
| `SERVE_FRONTEND` | `false` | `true` = folder `../frontend-legacy` (HTML lama) ikut disajikan di `http://localhost:PORT`. |
| `DATABASE_PATH` | `./database/lawas-journeys.sqlite` | Lokasi file SQLite (relatif terhadap folder `backend`). `:memory:` untuk database sementara. |
| `AUTO_SEED` | `true` | Isi data contoh saat database kosong. |
| `JWT_SECRET` | `change-this-development-secret` | **Wajib diganti** di produksi. |
| `JWT_EXPIRES_IN_HOURS` | `24` | Masa berlaku token. |
| `ADMIN_NAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` | `Lawas Admin` / `admin@lawasjourneys.com` / `admin12345` | Akun admin yang dibuat seeder. |
| `PAYMENT_GATEWAY_PROVIDER` | `midtrans` | `midtrans` atau `xendit`. |
| `PAYMENT_GATEWAY_SERVER_KEY` | — | Server key (rahasia). |
| `PAYMENT_GATEWAY_CLIENT_KEY` | — | Client key. |
| `PAYMENT_GATEWAY_MODE` | `sandbox` | `sandbox` atau `production`. |
| `PAYMENT_SIMULATION` | `true` | `true` = pembayaran simulasi; set `false` setelah gateway asli terpasang. |
| `WHATSAPP_API_PROVIDER` | `wa_business_api` | `wa_business_api` atau `wa_link`. |
| `WHATSAPP_API_TOKEN` | — | Token WhatsApp Business Cloud API. |
| `WHATSAPP_BUSINESS_NUMBER` | `628xxxxxxxxxx` | Format internasional tanpa `+`. Jika masih placeholder, dipakai nomor demo. |

Nilai yang diawali `isi_` atau mengandung `xxxx` dianggap placeholder (belum diisi).

---

## Titik integrasi (TODO)

| File | Fungsi | Isi TODO |
|---|---|---|
| `services/payment.service.js` | `createTransaction()` | Panggil Midtrans Snap / Xendit Invoice, kembalikan `snapToken` dan `redirectUrl`. |
| `services/payment.service.js` | `verifyTransaction()` | Ambil status dari gateway, petakan ke `pending / settlement / expire / cancel / deny`. |
| `controllers/payment.controller.js` | `handleNotification()` | Verifikasi signature webhook sebelum memproses. |
| `services/whatsapp.service.js` | `sendBookingNotification()` | Kirim lewat WhatsApp Business Cloud API saat `WHATSAPP_API_TOKEN` tersedia; fallback ke link `wa.me`. |

Bentuk nilai kembalian setiap fungsi sudah didokumentasikan di JSDoc masing-masing, jadi controller dan frontend tidak perlu diubah ketika implementasinya diganti.

---

## Referensi endpoint

Semua path berawalan `/api`. **Admin** = butuh token admin. Parameter `:code` adalah kode booking (mis. `LJ-261029-XY2B`), `:slug` adalah slug URL, `:id` adalah id numerik.

| Method | Path | Akses | Deskripsi |
|---|---|---|---|
| GET | `/health` | publik | Status server & uptime |
| GET | `/categories` | publik | Kategori minat tur |
| POST | `/auth/register` | publik | Daftar → `{ user, token }` |
| POST | `/auth/login` | publik | Masuk → `{ user, token }` |
| GET | `/auth/me` | login | Profil pengguna |
| GET | `/packages` | publik | Daftar paket (filter: `q`, `destination`, `category`, `minPrice`, `maxPrice`, `minDays`, `maxDays`, `guests`, `featured`, `sort`, `page`, `limit`) |
| GET | `/packages/:slug` | publik | Detail paket |
| POST | `/packages` | admin | Tambah paket |
| PUT | `/packages/:id` | admin | Ubah paket |
| DELETE | `/packages/:id` | admin | Hapus paket |
| GET | `/destinations` | publik | Daftar destinasi |
| GET | `/destinations/:slug` | publik | Detail + `attractions` + `packages` |
| POST | `/destinations` | admin | Tambah destinasi |
| PUT | `/destinations/:id` | admin | Ubah destinasi |
| DELETE | `/destinations/:id` | admin | Hapus destinasi (409 bila masih punya paket) |
| GET | `/articles` | publik | Daftar artikel (filter: `category`, `tag`, `q`, `featured`, `page`, `limit`) |
| GET | `/articles/categories` | publik | `{ total, categories: [{ name, count }] }` |
| GET | `/articles/tags` | publik | `[{ tag, count }]` |
| GET | `/articles/:slug` | publik | Detail artikel + `related` |
| POST | `/articles` | admin | Tambah artikel (`readMinutes` dihitung otomatis bila kosong) |
| PUT | `/articles/:id` | admin | Ubah artikel |
| DELETE | `/articles/:id` | admin | Hapus artikel |
| POST | `/bookings` | publik (login opsional) | Buat booking |
| GET | `/bookings` | admin | Semua booking (`status`, `q`, `page`, `limit`) |
| GET | `/bookings/mine` | login | Booking milik sendiri |
| GET | `/bookings/lookup?code=&email=` | publik | Cek booking dengan kode + email |
| GET | `/bookings/:code` | publik | Detail booking berdasarkan kode |
| PATCH | `/bookings/:code/status` | admin | Ubah status: `pending` / `confirmed` / `cancelled` |
| POST | `/payments/create` | publik | Buka sesi pembayaran `{ bookingCode }` |
| POST | `/payments/verify` | publik | Cek status `{ orderId }` |
| POST | `/payments/notification` | gateway | Webhook notifikasi pembayaran |
| GET | `/payments/:orderId` | publik | Detail pembayaran |
| POST | `/payments/:orderId/simulate` | publik (hanya bila `PAYMENT_SIMULATION=true`) | Simulasi pembayaran berhasil `{ method }` |
| GET | `/whatsapp/config` | publik | Nomor & link chat |
| POST | `/whatsapp/notify` | publik | Pesan + link konfirmasi booking `{ bookingCode }` |
| POST | `/custom-trips` | publik | Kirim permintaan trip khusus |
| GET | `/custom-trips` | admin | Daftar permintaan |
| PATCH | `/custom-trips/:id/status` | admin | `new` / `contacted` / `quoted` / `closed` |
| DELETE | `/custom-trips/:id` | admin | Hapus permintaan |
| POST | `/newsletter` | publik | Berlangganan newsletter `{ email }` |
| GET | `/admin/dashboard` | admin | Total, pendapatan, booking terbaru |

---

## Contoh pemakaian (`curl`)

```bash
# Login admin dan simpan token
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@lawasjourneys.com","password":"admin12345"}' \
  | node -pe "JSON.parse(require('fs').readFileSync(0,'utf8')).data.token")

# Daftar paket, dengan filter
curl "http://localhost:3000/api/packages?category=Culture&maxPrice=4000000&sort=price_asc"

# Buat booking
curl -X POST http://localhost:3000/api/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "packageSlug": "ancient-yogyakarta-borobudur",
    "customerName": "Rina Sari",
    "customerEmail": "rina@example.com",
    "customerPhone": "081234567890",
    "travelDate": "2027-03-15",
    "guests": 2,
    "notes": "Vegetarian meals, please"
  }'

# Buka pembayaran, lalu simulasikan (sandbox)
curl -X POST http://localhost:3000/api/payments/create \
  -H "Content-Type: application/json" -d '{"bookingCode":"LJ-XXXXXX-XXXX"}'
curl -X POST http://localhost:3000/api/payments/ORDER_ID/simulate \
  -H "Content-Type: application/json" -d '{"method":"qris"}'

# Ubah status booking (admin)
curl -X PATCH http://localhost:3000/api/bookings/LJ-XXXXXX-XXXX/status \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"status":"confirmed"}'
```

Untuk menjalankan seluruh skenario di atas secara otomatis (71 pemeriksaan): `npm run smoke`.

---

## Database

Skema ada di `database/migrations/001_init.sql`. Tabel: `users`, `categories`, `destinations`, `attractions`, `packages`, `articles`, `bookings`, `payments`, `custom_trips`, `subscribers`, serta `schema_migrations` untuk mencatat migrasi yang sudah berjalan.

Menambah kolom atau tabel: buat berkas baru `database/migrations/002_nama_perubahan.sql`. Migrasi dijalankan berurutan sekali saja pada saat server start (atau `npm run migrate`). Jangan mengubah migrasi yang sudah pernah dijalankan.

File `*.sqlite` tidak ikut di-commit (lihat `.gitignore`). Menghapus file itu lalu menjalankan server lagi menghasilkan database baru yang bersih.

## Menambah endpoint baru

1. Tambah fungsi query di `models/`.
2. Tambah controller di `controllers/` (validasi dengan `validate(req.body)` dari `utils/validators.util.js`, lempar `AppError` untuk error yang diharapkan).
3. Daftarkan route di `routes/` (pakai `authenticate` / `requireAdmin` dari `auth.middleware.js` bila perlu), lalu pasang di `routes/index.routes.js`.
4. Tambah pemanggilan di `frontend/src/lib/api.ts` — satu-satunya tempat frontend memanggil API.
