const DEFAULT_MODEL = "gemini-flash-latest";

export async function onRequestPost(context) {
  const geminiApiKey = context.env.GEMINI_API_KEY || "";
  const geminiModel = context.env.GEMINI_MODEL || DEFAULT_MODEL;

  if (!geminiApiKey) {
    return json({ error: "GEMINI_API_KEY is missing." }, 500);
  }

  let body;

  try {
    body = await context.request.json();
  } catch {
    return json({ error: "Invalid JSON request body." }, 400);
  }

  const imageDataUrl = body.imageDataUrl || "";
  const matches = imageDataUrl.match(/^data:(.*?);base64,(.*)$/);

  if (!matches) {
    return json({ error: "A valid note image is required." }, 400);
  }

  const mimeType = matches[1];
  const imageBase64 = matches[2];

  const geminiResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(geminiModel)}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-goog-api-key": geminiApiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text:
                  "Transcribe the handwritten notes from this image. Return only the cleaned transcription. Preserve headings, lists, dates, and paragraph breaks. If a word is unclear, mark it as [unclear].",
              },
              {
                inlineData: {
                  mimeType,
                  data: imageBase64,
                },
              },
            ],
          },
        ],
      }),
    },
  );

  if (!geminiResponse.ok) {
    const errorText = await geminiResponse.text();
    console.error("Gemini transcription failed:", geminiResponse.status, errorText);
    return json(
      {
        error: errorText || `Gemini request failed with status ${geminiResponse.status}.`,
      },
      502,
    );
  }

  const geminiPayload = await geminiResponse.json();
  const text =
    geminiPayload?.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .join("")
      .trim() || "";

  if (!text) {
    return json({ error: "Gemini returned no transcription text." }, 502);
  }

  return json({ text }, 200);
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
