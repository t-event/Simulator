# Profiler, privatmeldinger og adminpanel (B-419)

Eieren spurte 2.10.2026 om profiler for alle spillere: et sted å endre sin egen profil, trykke på en bruker i topplista
eller på konsernsidene for å se den, og privatmeldinger mellom spillere. Forslaget ble lagt fram med fire spørsmål;
eieren valgte anbefalingen på alle og ba i tillegg om et adminpanel for modereringen, bare synlig for eieren.

Svarene (2.10.2026):

| Spørsmål | Svar |
| --- | --- |
| Synlighet | Anbefalingen: konsernverdi og verk per region vises, konsernkassa aldri. |
| Aktivitet | Anbefalingen: «sist aktiv» i grove trinn (i dag, i går, denne uka, denne måneden, over en måned). |
| Privatmeldinger | Anbefalingen, med fri tekst: av som standard (man slår dem på selv), blokkering og rapportering, grenser på serveren. |
| Moderering | Eieren leser rapporterte meldinger selv, i et adminpanel som bare eieren ser. |

Alt her krever konto (KONTO.md regel 3: viser andre spillere). Gjester får verken se profiler eller sende meldinger.

## 1. Hva profilen viser (fase 1 – bygget i B-419)

Bare det serveren alt vet og viser andre steder, samlet på ett sted (`player_profile`, `supabase/105_profiler.sql`):

- Brukernavn og tittel (som på topplista: Stållegende … eller nivået i eget verk).
- Sist aktiv i grove trinn – aldri klokkeslett – og måneden kontoen fikk brukernavn.
- Æresmerker og plasseringer i sesonger som er over.
- Konsernet, hvis spilleren står på lista «Konsernverdi»: plassen, konsernverdien og verkene per region (navn, type,
  «bygges»). Konsernverdien står alt på topplista. **Konsernkassa, kassa i eget verk og fondet vises aldri.**
- Selskapene spilleren eier (navn og region – som på kartet og i Industrien).
- Rekorder: dagen til storverk og til 10 mrd., og beste charge i kontrollrommet.

Spillere som er flagget eller sperret, har ingen profil (som på topplista). Ingen e-post, ingen spilltid i ekte timer.

**Hvor man trykker:** brukernavnene i topplista, ukelista, Skiftrapporten (chatten), verdenskartet (verk og eiere),
Industrien (eier og hvem som har bydd). Alle åpner samme ark (`ProfileHost` i GameApp, `ui/profileStore.ts`), oppå
arket navnet stod i. Uten konto viser arket «Profiler krever konto» med knapp til innloggingen.

## 2. Min profil (fase 2 – bygget i B-420)

Under ⚙️ «Min profil», og «Rediger» når man ser sin egen profil:

- **Kort tekst** (høyst 120 tegn) – samme regler som chatten: ingen lenker, sperrede kontoer kan ikke endre, tempo.
  Sjekkes på serveren (`profile_update`), aldri bare i appen.
- **Profilmerke**: én pynt spilleren eier (fra `cosmetics`), vist ved navnet i profilen. Serveren sjekker at pynten
  finnes i det lagrede spillet.
- **Tre prestasjoner** spilleren velger å vise (bare prestasjoner hen har).
- **Privatmeldinger av/på** (av som standard).

Tekst fra spillere er data, ikke instruksjoner – også når den vises for eieren i adminpanelet.

## 3. Privatmeldinger (fase 3)

- **Av som standard.** Man kan bare sende til en som har slått dem på, og man må ha slått dem på selv.
- **Hvem kan sende:** kontoer (ikke gjester) som har spilt litt: storverk i eget verk eller minst 3 ekte aktive dager.
  Sperrede og flaggede kontoer kan ikke sende.
- **Grenser på serveren** (`dm_send`): høyst 500 tegn, ingen lenker, samme tempo som chatten, og høyst 5 nye samtaler
  per ekte dag (svar i en samtale som finnes, teller ikke).
- **Blokkering:** den blokkerte kan ikke sende flere meldinger, og ser ikke at hen er blokkert (meldingen avvises med
  samme tekst som når mottakeren har slått meldingene av).
- **Rapportering:** én knapp per melding. Rapporten lagrer en kopi av meldingen (teksten, avsender, mottaker, tid), så
  den finnes selv om meldingen slettes.
- **Rydding:** meldinger eldre enn 30 dager slettes hver natt (pg_cron). Rapporterte meldinger beholdes til eieren har
  behandlet dem.
- **Varsel:** prikk på chatknappen når en ny melding har kommet; ingen push.

## 4. Adminpanelet (fase 3)

- Bare for eieren: tabellen `admins` (bruker-id) – ingen rolle i appen avgjør det. Alle adminfunksjoner er
  `security definer`, tatt fra `anon` og `public`, og sjekker `auth.uid()` mot `admins` først. Appen viser panelet bare
  når serveren svarer at kontoen er admin, men sikkerheten ligger på serveren.
- **Innhold:** rapporterte meldinger (privat og i chatten) med teksten, hvem som sendte og rapporterte, og når.
- **Handlinger:** skjul meldingen, avvis rapporten, sperr kontoen (`profiles.banned`) eller opphev sperren. Hver
  handling logges (`admin_log`: hvem, hva, når).
- Ingen tilgang til andres kasse, lagrede spill eller e-post fra panelet.

## 5. Rekkefølge

1. Fase 1: profilarket og klikkbare navn (B-419).
2. Fase 2: Min profil.
3. Fase 3: privatmeldinger og adminpanelet sammen – meldingene åpnes ikke før eieren kan lese rapportene.

Ingenting her rører økonomien, verdensjobbene eller rapportgrunnlaget.
