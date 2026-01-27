import { poolPromise } from '../config/db.js'; // must match the actual filename and relative path

async function testDatabase() {
  try {
    const pool = await poolPromise;

    const dbCheck = await pool.request().query('SELECT DB_NAME() AS db');
    console.log('📦 Connected DB:', dbCheck.recordset[0].db);

    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'test_connection')
      BEGIN
        CREATE TABLE dbo.test_connection (
          id INT IDENTITY(1,1) PRIMARY KEY,
          test_name VARCHAR(100),
          created_at DATETIME DEFAULT GETDATE()
        )
      END
    `);

    console.log('✅ Test table verified/created');

    await pool.request()
      .input('name', 'DB TEST OK')
      .query('INSERT INTO dbo.test_connection (test_name) VALUES (@name)');

    const rows = await pool.request()
      .query('SELECT TOP 5 * FROM dbo.test_connection ORDER BY id DESC');

    console.log('📋 Test rows:', rows.recordset);

  } catch (err) {
    console.error('❌ DB Test Failed:', err);
  }
}

testDatabase();
