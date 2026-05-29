// Next.js instrumentation hook. Runs once when the server process starts.
// We use it to run the better-auth schema migrations and create the bookings
// table, mirroring the startup migrations that the legacy Node server ran in
// `src/server.ts`.
export async function register() {
  // Guard against the Edge runtime: the database layer (`node:sqlite`) and
  // better-auth migrations require the Node.js runtime.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { getMigrations } = await import("better-auth/db/migration");
  const { authOptions } = await import("./src/auth.ts");
  const { db } = await import("./src/db.ts");
  const { runBookingsMigrations } = await import("./src/bookings-db.ts");

  const { runMigrations } = await getMigrations(authOptions);
  await runMigrations();
  runBookingsMigrations(db);
}
