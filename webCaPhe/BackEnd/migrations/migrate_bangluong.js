const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const db = require("../config/db");

async function migrate() {
  try {
    const colsToAdd = [
      { name: "LuongCoBan", type: "DECIMAL(18,2) DEFAULT 0.00" },
      { name: "SoCong", type: "DECIMAL(5,2) DEFAULT 0.00" },
      { name: "SoGioLam", type: "DECIMAL(8,2) DEFAULT 0.00" },
      { name: "GhiChu", type: "TEXT" }
    ];

    for (const col of colsToAdd) {
      const [res] = await db.query(
        "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bangluong' AND COLUMN_NAME = ?",
        [col.name]
      );
      if (res.length === 0) {
        await db.query(`ALTER TABLE bangluong ADD COLUMN ${col.name} ${col.type}`);
        console.log(`Added column ${col.name} to bangluong`);
      } else {
        console.log(`Column ${col.name} already exists`);
      }
    }
  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    process.exit(0);
  }
}

migrate();
