export async function onRequestGet(context) {
  const googleClientId = context.env.GOOGLE_CLIENT_ID || "";

  return json(
    {
      googleClientId,
    },
    200,
  );
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
