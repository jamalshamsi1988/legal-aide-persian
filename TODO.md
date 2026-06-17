# TODO

## Goal: Fix “Edge Function returned a non-2xx status code” — DONE

### What was fixed
- `supabase/functions/legal-ai/index.ts`:
  - Changed validation error (question too short) from HTTP 400 → 200 JSON.
  - Changed missing `LOVABLE_API_KEY` throw → 200 JSON.
  - Changed all AI gateway error responses (`!response.ok`, 429, 402, generic) from non-2xx → 200 JSON while preserving Persian error messages.
  - Changed catch-all handler return from 500 → 200 JSON.

### Why this works
- `supabase.functions.invoke()` throws on non-2xx HTTP status and surfaces `error.message`.
- By always returning HTTP 200 with a JSON body `{ error, status?, details? }` on failures, the invoke call succeeds:
  - `error` is `null`, `data` contains the error payload, and the frontend’s existing `if (data?.error) throw new Error(data.error)` safely handles it.

### Follow-up
- Run `npm test` and `npm run build` to verify no regressions.
- Deploy the edge function and reproduce a failing scenario (e.g., empty/minimal question, network error from gateway) to confirm the user sees Persian error text instead of “Edge Function returned a non-2xx status code”. 

