const baseUrl = process.env.OPENCODE_BASE_URL || "http://localhost:4096";

interface Session {
  id: string;
  title: string;
  directory: string;
}

interface PromptResponse {
  info: {
    id: string;
    sessionID: string;
    role: "assistant";
  };
  parts: Array<{
    type: string;
    text?: string;
  }>;
}

export async function createSession(
  title: string,
  directory: string,
): Promise<Session> {
  const response = await fetch(`${baseUrl}/session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-opencode-directory": directory,
    },
    body: JSON.stringify({ title, directory }),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to create session: ${response.status} ${response.statusText}`,
    );
  }

  return response.json();
}

export async function sendPrompt(
  sessionId: string,
  content: string,
  directory: string,
): Promise<PromptResponse> {
  const response = await fetch(`${baseUrl}/session/${sessionId}/message`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-opencode-directory": directory,
    },
    body: JSON.stringify({
      parts: [{ type: "text", text: content }],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Failed to send prompt: ${response.status} ${response.statusText} - ${text}`,
    );
  }

  // Read the stream and collect all chunks
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("No response body");
  }

  let result = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    result += new TextDecoder().decode(value);
  }

  try {
    return JSON.parse(result);
  } catch (e) {
    console.error("Failed to parse JSON:", result);
    throw new Error(`Invalid JSON response: ${result.substring(0, 200)}`);
  }
}
