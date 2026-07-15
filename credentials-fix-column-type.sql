-- Fix column type drift: password_enc / additional_info_enc were somehow
-- changed to bytea (probably during a past security-hardening pass done
-- directly in the dashboard), but the app has always written/read them as
-- text ciphertext ("v1:<iv>:<cipher>"). Reading a bytea back over the API
-- returns Postgres's hex-escaped wire format instead of the original
-- string, which is why decrypt() failed with "Unrecognized ciphertext
-- format". The underlying bytes are untouched — this only fixes the type.
-- Run once in the Supabase SQL editor. Verified safe: convert_from(...,
-- 'UTF8') was previewed first and returns the original ciphertext intact.

alter table public.hub_credentials
  alter column password_enc type text using convert_from(password_enc, 'UTF8'),
  alter column additional_info_enc type text using convert_from(additional_info_enc, 'UTF8');
