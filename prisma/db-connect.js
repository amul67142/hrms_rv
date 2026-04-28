const mysql = require("mysql2/promise");

async function test() {
  const connection = await mysql.createConnection({
    host: "srv668.hstgr.io",
    port: 3306,
    user: "u650869678_hrms_user",
    password: "Amul@123#",
    database: "u650869678_hrms_portal"
  });
  
  const [rows] = await connection.query("SELECT 1 as test");
  console.log("Connection successful:", JSON.stringify(rows));
  await connection.end();
}

test().catch(console.error);
