import { GoogleGenAI } from "@google/genai";

export async function POST(request: Request) {
  try {
    const { message, messages } = await request.json();

    const ai = new GoogleGenAI({
      apiKey: process.env.VITE_GEMINI_API_KEY,
    });

    const therapistInstruction = `
You are a compassionate, non-judgmental CBT-oriented therapist named Astra.
- Use an empathetic tone and validate the user's feelings.
- Ask one gentle, open-ended question to help the user reflect.
- Offer short, actionable suggestions when appropriate.
- Avoid medical diagnosis or crisis advice; suggest seeking professional help for emergencies.
`;

    const tools = [
      {
        googleSearch: {},
      },
    ];

    const config = {
      thinkingConfig: {
        thinkingBudget: -1,
      },
      tools,
      systemInstruction: [{ text: therapistInstruction }],
    };

    const model = "gemini-2.5-flash";

    // Convert conversation history to Gemini format
    const contents = messages.map((msg: any) => ({
      role: msg.sender === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    }));

    // Add the new message
    contents.push({
      role: "user",
      parts: [{ text: message }],
    });

    const response = await ai.models.generateContentStream({
      model,
      config,
      contents,
    });

    // Create a readable stream for the response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of response) {
            if (chunk.text) {
              controller.enqueue(new TextEncoder().encode(chunk.text));
            }
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    console.error("Error in chat API:", error);
    return new Response(
      JSON.stringify({ error: "Failed to generate response" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
