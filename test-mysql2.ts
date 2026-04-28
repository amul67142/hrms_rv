const mysql = require("mysql2/promise");

async function test() {
  const connection = await mysql.createConnection({
    host: "127.0.0.1",
    user: "u650869678_hrms_user",
    password: "Amul@123#",
    database: "u650869678_hrms_portal",
    port: 3306
  });
  const [rows] = await connection.query("SELECT 1 as test");
  console.log("Connection successful:", JSON.stringify(rows));
  await connection.end();
}

test().catch(console.error);
