import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// async function main() {
//   const chatCompletion = await getGroqChatCompletion();
//   // Print the completion returned by the LLM.
//   console.log(chatCompletion.choices[0]?.message?.content || "");
// }

export async function groqResponse([filename]) {
  return groq.chat.completions.create({
    messages: [
      {
        role: "system",
        content: "",
      },
      {
        role: "user",
        content: filename,
      },
    ],
    model: "meta-llama/llama-4-scout-17b-16e-instruct",
   
    response_format: {
    "type": "json_schema",
    "json_schema": {
      "name": "schema_name",
      "strict": false,  
      "schema": {}
    }
  }


  });
}

// export default main();
