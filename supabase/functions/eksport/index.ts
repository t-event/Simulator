// B-345: daglig eksport av spilltabellene. Kalles av pg_cron (jobben `eksport-daglig` i 073_eksport.sql) hver natt.
// Henter tabellene én og én (store tabeller i deler, B-484) fra backup_export_table(), pakker det med gzip og
// legger det i den private mappa `eksport` som stalverk-ÅÅÅÅ-MM-DD.json.gz. Filer eldre enn 14 dager slettes. Høyst
// én eksport per dag: kaller noen funksjonen flere ganger, hoppes resten over. pg_cron prøver hver time til 06:17 UTC;
// jobben «eksport» i world_health viser om det gikk. Nøkkelen (service_role) settes av Supabase i miljøet – den står
// aldri i repoet.
import { createClient } from "npm:@supabase/supabase-js@2";

const BUCKET = "eksport";
const KEEP_DAYS = 14;
const JOB = "eksport";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

Deno.serve(async () => {
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
  const day = new Date().toISOString().slice(0, 10);
  const name = `stalverk-${day}.json.gz`;

  const { data: files, error: listError } = await db.storage.from(BUCKET).list("", { limit: 1000 });
  if (listError) return json({ ok: false, error: listError.message }, 500);
  if (files?.some((f) => f.name === name)) return json({ ok: true, skipped: name });

  // Ett kall per del: hele eksporten i ett kall nådde tidsgrensen på 8 s (B-484)
  await db.rpc("world_job_start", { p_job: JOB });
  const fail = async (message: string) => {
    await db.rpc("world_job_error", { p_job: JOB, p_error: message });
    return json({ ok: false, error: message }, 500);
  };
  const { data: list, error: listTablesError } = await db.rpc("backup_export_tables");
  if (listTablesError) return fail(listTablesError.message);
  const tabeller: Record<string, unknown[]> = {};
  for (const { name: table, parts } of list as { name: string; parts: number }[]) {
    const rows: unknown[] = [];
    for (let part = 0; part < parts; part++) {
      const { data: chunk, error } = await db.rpc("backup_export_table", {
        p_table: table,
        p_part: part,
        p_parts: parts,
      });
      if (error) return fail(`${table} ${part + 1}/${parts}: ${error.message}`);
      for (const row of chunk as unknown[]) rows.push(row);
    }
    tabeller[table] = rows;
  }
  const data = { laget: new Date().toISOString(), versjon: 1, tabeller };

  const gz = await new Response(
    new Blob([JSON.stringify(data)]).stream().pipeThrough(new CompressionStream("gzip")),
  ).arrayBuffer();
  const { error: upError } = await db.storage
    .from(BUCKET)
    .upload(name, gz, { contentType: "application/gzip", upsert: false });
  if (upError) return fail(upError.message);

  // Gamle filer ut (navnet har datoen)
  const cutoff = new Date(Date.now() - KEEP_DAYS * 86_400_000).toISOString().slice(0, 10);
  const old = (files ?? [])
    .map((f) => f.name)
    .filter((n) => /^stalverk-\d{4}-\d{2}-\d{2}\.json\.gz$/.test(n) && n.slice(9, 19) < cutoff);
  // Feil ved sletting meldes (B-428): før svarte funksjonen «removed» selv om de gamle filene ble liggende
  const { error: rmError } = old.length ? await db.storage.from(BUCKET).remove(old) : { error: null };

  const tables = Object.keys(tabeller).length;
  await db.rpc("world_job_finish", { p_job: JOB, p_ok: tables, p_failed: 0 });
  return json({
    ok: true,
    file: name,
    kb: Math.round(gz.byteLength / 1024),
    tables,
    removed: rmError ? 0 : old.length,
    ...(rmError ? { removeError: rmError.message, notRemoved: old } : {}),
  });
});
