import { GoogleGenAI } from "@google/genai";

function cleanGeneratedTitle(raw: string, fallback: string): string {
  const cleaned = raw.trim().replace(/^["'#*\-–\s]+|["'#*\-–\s]+$/g, "");
  return cleaned.slice(0, 80) || fallback;
}

export async function POST(request: Request) {
  try {
    const { message, messages, wantTitle, conversationId } =
      await request.json();

    let generatedTitle = null;
    if (wantTitle) {
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
      });

      const baseText = (typeof message === "string" ? message : "") || "";
      const fallback =
        baseText.trim().slice(0, 60) ||
        (messages?.[0]?.content?.slice(0, 60) ?? "Untitled Chat"); // Use first message or "Untitled Chat"

      const titlePrompt = [
        "Summarize the following user message into a very short, human-readable chat title:",
        "- Max 8 words",
        "- No surrounding quotes",
        "- No trailing punctuation",
        "",
        `Message: """${baseText}"""`,
        "",
        "Title:",
      ].join("\n");

      const titleStream = await ai.models.generateContentStream({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user",
            parts: [{ text: titlePrompt }],
          },
        ],
      });

      let titleText = "";
      for await (const chunk of titleStream) {
        if ((chunk as any).text) {
          titleText += (chunk as any).text;
        }
      }

      generatedTitle = cleanGeneratedTitle(titleText, fallback);
    }

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });

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
    };

    const model = "gemini-2.5-flash";

    const contents = messages.map((msg: any) => ({
      role: msg.sender === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    }));

    contents.push({
      role: "user",
      parts: [{ text: message }],
    });

    const response = await ai.models.generateContentStream({
      model,
      config,
      contents,
    });

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of response) {
            if ((chunk as any).text) {
              controller.enqueue(new TextEncoder().encode((chunk as any).text));
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
        "X-Conversation-Id": conversationId || "",
        ...(generatedTitle ? { "X-Generated-Title": generatedTitle } : {}),
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
