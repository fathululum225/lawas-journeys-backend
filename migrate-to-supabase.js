const Database = require('better-sqlite3');
const { Client } = require('pg');

// 1. Lokasi database SQLite Anda
const sqliteFile = './database/lawas-journeys.sqlite';

// 2. URL SUPABASE YANG SUDAH DIPERBAIKI (Perhatikan tanda @ dan ID Proyek)
// GANTI "PASSWORD_BARU_ANDA" dengan password Supabase Anda
const pgConnectionString = 'postgresql://postgres.hwhqsgtmwxpnwddihzkw:Moen14sameya@aws-0-eu-west-1.pooler.supabase.com:6543/postgres';

async function migrate() {
  console.log('Membuka database SQLite lokal...');
  const sqliteDb = new Database(sqliteFile, { readonly: true });
  
  console.log('Menghubungkan ke Supabase...');
  const pgClient = new Client({
    connectionString: pgConnectionString,
    ssl: { rejectUnauthorized: false }
  });
  await pgClient.connect();

  const tables = sqliteDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
  
  for (const table of tables) {
    const tableName = table.name;
    console.log(`\nMemproses tabel: ${tableName}`);

    const rows = sqliteDb.prepare(`SELECT * FROM "${tableName}"`).all();
    if (rows.length === 0) {
      console.log(`  - Kosong, dilewati.`);
      continue;
    }

    // Mengubah tipe data menjadi TEXT semua agar aman dari error
    const columns = Object.keys(rows[0]).map(col => `"${col}" TEXT`).join(', ');
    await pgClient.query(`CREATE TABLE IF NOT EXISTS "${tableName}" (${columns})`);

    const placeholders = Object.keys(rows[0]).map((_, i) => `$${i + 1}`).join(', ');
    const insertQuery = `INSERT INTO "${tableName}" (${Object.keys(rows[0]).map(c => `"${c}"`).join(', ')}) VALUES (${placeholders})`;
    
    for (const row of rows) {
      await pgClient.query(insertQuery, Object.values(row));
    }
    console.log(`  - Berhasil memindahkan ${rows.length} baris.`);
  }

  await pgClient.end();
  sqliteDb.close();
  console.log('\n✅ Migrasi Selesai! Silakan cek Table Editor di Supabase.');
}

migrate().catch(err => {
  console.error('❌ Error saat migrasi:', err);
  process.exit(1);
});