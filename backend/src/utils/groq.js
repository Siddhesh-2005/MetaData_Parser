import Groq from "groq-sdk";

let groqClient = null;

function getGroqClient() {
  if (groqClient) return groqClient;

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  groqClient = new Groq({ apiKey });
  return groqClient;
}

// async function main() {
//   const chatCompletion = await getGroqChatCompletion();
//   // Print the completion returned by the LLM.
//   console.log(chatCompletion.choices[0]?.message?.content || "");
// }

function toArrayResult(content) {
  if (!content) return [];

  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed?.items)) return parsed.items;
    return [];
  } catch {
    return [];
  }
}

export async function groqResponse(candidates) {
  if (!Array.isArray(candidates) || candidates.length === 0) return [];

  const groq = getGroqClient();
  if (!groq) {
    console.warn('[groq] GROQ_API_KEY is missing, skipping fallback enrichment');
    return [];
  }

  const payload = candidates.map(item => ({
    index: item.index,
    filename: item.filename,
    rawPath: item.rawPath,
  }));

  const completion = await groq.chat.completions.create({
    messages: [
      {
        role: "system",
        content:
          "You are a filename parser for university exam paper PDFs. Return valid JSON only using the schema. Keep one output item per input item and preserve index for mapping.",
      },
      {
        role: "user",
        content: `Parse and enrich these PDF path items. Return one result for each input item:\n${JSON.stringify(payload)}`,
      },
    ],
    model: "meta-llama/llama-4-scout-17b-16e-instruct",
   
    response_format: {
    "type": "json_schema",
    "json_schema": {
      "name": "schema_name",
      "strict": false,  
      "schema": {
        "type": "object",
        "properties": {
          "items": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "index": { "type": "integer" },
                "degree": { "type": "string" },
                "branch": { "type": "string" },
                "semester": { "type": "integer" },
                "subject_slug": { "type": "string" },
                "subject_name": { "type": "string" },
                "subject_code": { "type": "string" },
                "exam_month": { "type": "string" },
                "year": { "type": "integer" }
              },
              "required": ["index"]
            }
          }
        },
        "required": ["items"]
      }
    }
  }


  });

  const content = completion.choices?.[0]?.message?.content || "";
  return toArrayResult(content);
}

// export default main();
