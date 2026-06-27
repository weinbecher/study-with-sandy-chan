# Study with Sandy-chan

A single-page Japanese N2 grammar practice site with question narration, a persistent mistake notebook, and Sandy the calico cat.

Live site: https://weinbecher.github.io/study-with-sandy-chan/

## AI vocab generation

`vocab.html` calls the hosted Supabase Edge Function at `supabase/functions/generate-vocab`.
Approved AI entries are saved in `generated_vocab_entries`, scoped to the signed-in learner.

Run the SQL in `supabase/schema.sql` once in the Supabase SQL editor, then set the OpenAI secret and deploy the function:

```sh
supabase secrets set OPENAI_API_KEY=your_api_key
supabase functions deploy generate-vocab
```

Optional:

```sh
supabase secrets set OPENAI_MODEL=gpt-5.5
```
