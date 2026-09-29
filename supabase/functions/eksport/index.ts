// B-345: daglig eksport av spilltabellene. Kalles av pg_cron (jobben `eksport-daglig` i 073_eksport.sql) hver natt.
// Henter alt fra backup_export(), pakker det med gzip og legger det i den private mappa `eksport` som
// stalverk-ÅÅÅÅ-MM-DD.json.gz. Filer eldre enn 14 dager slettes. Høyst én eksport per dag: kaller noen funksjonen
// flere ganger, hoppes resten over. Nøkkelen (service_role) settes av Supabase i miljøet – den står aldri i repoet.
import { createClient } from "npm:@supabase/supabase-js@2";

const BUCKET = "eksport";
const KEEP_DAYS = 14;

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

  const { data, error } = await db.rpc("backup_export");
  if (error) return json({ ok: false, error: error.message }, 500);

  const gz = await new Response(
    new Blob([JSON.stringify(data)]).stream().pipeThrough(new CompressionStream("gzip")),
  ).arrayBuffer();
  const { error: upError } = await db.storage
    .from(BUCKET)
    .upload(name, gz, { contentType: "application/gzip", upsert: false });
  if (upError) return json({ ok: false, error: upError.message }, 500);

  // Gamle filer ut (navnet har datoen)
  const cutoff = new Date(Date.now() - KEEP_DAYS * 86_400_000).toISOString().slice(0, 10);
  const old = (files ?? [])
    .map((f) => f.name)
    .filter((n) => /^stalverk-\d{4}-\d{2}-\d{2}\.json\.gz$/.test(n) && n.slice(9, 19) < cutoff);
  if (old.length) await db.storage.from(BUCKET).remove(old);

  const tables = Object.keys((data as { tabeller?: Record<string, unknown> })?.tabeller ?? {}).length;
  return json({ ok: true, file: name, kb: Math.round(gz.byteLength / 1024), tables, removed: old.length });
});
