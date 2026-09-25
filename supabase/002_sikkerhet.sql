-- Stålverket: rettelser fra sikkerhetsrådene i Supabase (B-125). Kjørt som migrasjon «sikkerhet_funksjoner».
-- Funksjonene som kjøres av triggere skal ikke kunne kalles fra API-et, og search_path skal være låst.

alter function public.set_updated_at() set search_path = public;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;

-- Slett konto: bare for innloggede, aldri anonymt
revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
