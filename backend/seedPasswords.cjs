const bcrypt = require("bcrypt");
const { Pool } = require("pg");
require("dotenv").config({ path: "../.env" });

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || "ayu",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "dacexpertsys",
});

const PASSWORDS = {
  student: "Student@123",
  warden: "Warden@123",
  chief_warden: "Chief@123",
  dsw: "DSW@123",
  admin: "Admin@123",
};

async function seedPasswords() {
  const client = await pool.connect();

  try {
    console.log("Connected to PostgreSQL");

    await client.query("BEGIN");

    for (const [role, plainPassword] of Object.entries(PASSWORDS)) {
      const hashedPassword = await bcrypt.hash(plainPassword, 10);

      const result = await client.query(
        `
        UPDATE users
        SET password = $1
        WHERE role = $2
        `,
        [hashedPassword, role]
      );

      console.log(
        `${role}: ${result.rowCount} users updated`
      );
    }

    await client.query("COMMIT");

    console.log("\n✅ All passwords seeded successfully.");
    console.log("\nDevelopment login credentials:");

    console.log("Student:       Student@123");
    console.log("Warden:        Warden@123");
    console.log("Chief Warden:  Chief@123");
    console.log("DSW:           DSW@123");
    console.log("Admin:         Admin@123");
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("❌ Password seeding failed:");
    console.error(error);

    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

seedPasswords();