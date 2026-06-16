# TODO

## Goal: Fix “Edge Function returned a non-2xx status code”

### 1) Confirm failing edge function path
- Inspect frontend invoke: `supabase.functions.invoke("legal-ai")`
- Confirm legal-ai always returns valid JSON with consistent status codes.

### 2) Improve edge function error handling (legal-ai)
- Ensure non-2xx responses from `https://ai.gateway.lovable.dev` don’t lead to thrown errors without a proper JSON response.
- Return structured JSON `{ error, details? }` for all non-2xx cases and include CORS headers.

### 3) Add request/response logging to identify exact upstream status
- Log upstream status code + response body (truncated) for embeddings/router/chat completion.

### 4) Update frontend (optional)
- Handle `functions.invoke` error body properly (if supabase-js returns `error.message` from non-2xx).

### 5) Run tests/build
- Run `npm test` and `npm run build` (if applicable). 

