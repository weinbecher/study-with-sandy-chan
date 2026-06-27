const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type RequestBody = {
  text?: string;
  file?: {
    name?: string;
    type?: string;
    data?: string;
  };
  existingWords?: string[];
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    return json({ error: "OPENAI_API_KEY is not configured" }, 500);
  }

  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const text = String(body.text || "").trim().slice(0, 18000);
  let file: ReturnType<typeof normaliseFile>;
  try {
    file = normaliseFile(body.file);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Invalid file" }, 400);
  }
  if (text.length < 20 && !file) {
    return json({ error: "Please provide document text or a supported file" }, 400);
  }

  const existingWords = Array.isArray(body.existingWords)
    ? body.existingWords.map((word) => String(word).trim()).filter(Boolean).slice(0, 240)
    : [];

  const userContent: Array<Record<string, string>> = [];
  if (file) {
    userContent.push({
      type: "input_file",
      filename: file.name,
      file_data: file.data,
    });
  }
  userContent.push({
    type: "input_text",
    text: JSON.stringify({
      documentText: text || "Use the uploaded document as the source text.",
      existingWords,
      desiredCount: 10,
      outputLanguage: "Chinese meanings, Japanese words/readings/examples",
    }),
  });

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: Deno.env.get("OPENAI_MODEL") || "gpt-5.5",
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: [
                "You create Japanese vocabulary cards for a Chinese-speaking JLPT N2 learner.",
                "Pick useful words or short phrases from the document.",
                "Avoid duplicates from the existing word list.",
                "Return concise Chinese meanings and natural Japanese example sentences.",
              ].join(" "),
            },
          ],
        },
        {
          role: "user",
          content: userContent,
        },
      ],
      reasoning: { effort: "low" },
      text: {
        verbosity: "low",
        format: {
          type: "json_schema",
          name: "generated_vocab_entries",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              entries: {
                type: "array",
                minItems: 1,
                maxItems: 12,
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    word: { type: "string" },
                    reading: { type: "string" },
                    meaning: { type: "string" },
                    example: { type: "string" },
                    category: { type: "string" },
                  },
                  required: ["word", "reading", "meaning", "example", "category"],
                },
              },
            },
            required: ["entries"],
          },
        },
      },
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    return json({ error: data?.error?.message || "OpenAI request failed" }, response.status);
  }

  const outputText = data.output_text || data.output?.flatMap((item: { content?: Array<{ text?: string }> }) => item.content || []).map((item: { text?: string }) => item.text || "").join("");
  try {
    const parsed = JSON.parse(outputText);
    return json({ entries: parsed.entries || [] });
  } catch {
    return json({ error: "AI response could not be parsed" }, 502);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normaliseFile(file: RequestBody["file"]) {
  if (!file?.data) return null;
  const data = String(file.data);
  if (!data.startsWith("data:")) return null;
  const name = String(file.name || "document").replace(/[^\w.\-()\s]/g, "").slice(0, 120) || "document";
  const type = String(file.type || "application/octet-stream");
  if (data.length > 65_000_000) {
    throw new Error("File is too large");
  }
  return { name, type, data };
}
