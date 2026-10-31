const path = require('path');
require('dotenv').config({ path: path.join('c:\\Baitap\\QLDA\\BackEnd', '.env') });
const mysql = require('mysql2/promise');

async function migrate() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '12345',
    database: process.env.DB_NAME || 'dacnpm',
  });

  const [cols] = await db.query('DESCRIBE sanpham');
  if (!cols.find(c => c.Field === 'HinhAnh')) {
    await db.query("ALTER TABLE sanpham ADD COLUMN HinhAnh VARCHAR(500) DEFAULT NULL");
    console.log('✅ Đã thêm cột HinhAnh vào sanpham');
  } else {
    console.log('ℹ️  HinhAnh đã tồn tại');
  }
  await db.end();
}
migrate().catch(console.error);
