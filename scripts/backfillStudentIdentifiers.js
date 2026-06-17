const dotenv = require("dotenv");
const { neon } = require("@neondatabase/serverless");

dotenv.config({ path: ".env.local" });

async function main() {
  const sql = neon(process.env.NEXT_PUBLIC_DB_CONNECTION_STRING, { fullResults: true });

  const before = await sql`
    select count(*)::int as count
    from users
    where "studentIdentifier" is null or trim("studentIdentifier") = ''
  `;

  await sql`
    update users
    set
      "studentIdentifier" = concat(
        'STU-',
        extract(year from coalesce("createdAt", now()))::int,
        '-',
        lpad(id::text, 5, '0')
      ),
      "updatedAt" = now()
    where "studentIdentifier" is null or trim("studentIdentifier") = ''
  `;

  const after = await sql`
    select count(*)::int as count
    from users
    where "studentIdentifier" is null or trim("studentIdentifier") = ''
  `;

  const result = {
    missingBefore: before.rows[0]?.count ?? 0,
    missingAfter: after.rows[0]?.count ?? 0,
    updatedCount: (before.rows[0]?.count ?? 0) - (after.rows[0]?.count ?? 0),
  };

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error("Failed to backfill student identifiers:", error);
  process.exit(1);
});