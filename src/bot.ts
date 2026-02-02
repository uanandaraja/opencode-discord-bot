import type { Client, ThreadChannel, Message } from "discord.js";
import { createSession, sendPrompt } from "./opencode.ts";

export interface Session {
  sessionId: string;
  directory: string;
  active: boolean;
}

export class Bot {
  sessions: Map<string, Session> = new Map();

  constructor(public client: Client) {}

  channelToDirectory(channelName: string): string {
    return "/" + channelName.replace(/^#/, "").replace(/-/g, "/");
  }

  async getOrCreateSession(thread: ThreadChannel): Promise<Session | null> {
    const existing = this.sessions.get(thread.id);
    if (existing) return existing;

    const parent = thread.parent;
    if (!parent) {
      console.log(`Thread ${thread.id} has no parent channel`);
      return null;
    }

    const directory = this.channelToDirectory(parent.name);

    try {
      const session = await createSession(thread.name, directory);

      const sessionData: Session = {
        sessionId: session.id,
        directory,
        active: true,
      };

      this.sessions.set(thread.id, sessionData);
      console.log(
        `Created session ${session.id} for thread ${thread.id} in ${directory}`,
      );

      return sessionData;
    } catch (error) {
      console.error(`Failed to create session for ${directory}:`, error);
      return null;
    }
  }

  async sendMessage(
    sessionId: string,
    content: string,
    directory: string,
  ): Promise<string> {
    const response = await sendPrompt(sessionId, content, directory);

    return response.parts
      .filter((part) => part.type === "text" && part.text)
      .map((part) => part.text)
      .join("\n");
  }
}

export async function handleMessageCreate(bot: Bot, message: Message) {
  if (message.author.bot) return;
  if (!message.channel.isThread()) return;

  const thread = message.channel as ThreadChannel;
  const session = bot.sessions.get(thread.id);

  if (!session) {
    const botMention = `<@${bot.client.user?.id}>`;
    if (!message.content.includes(botMention)) return;

    const newSession = await bot.getOrCreateSession(thread);
    if (!newSession) {
      await message.reply(
        "❌ Failed to create OpenCode session. Check if the directory exists.",
      );
      return;
    }

    await message.reply(
      "✅ OpenCode session activated! You can now chat with me.",
    );
  }

  const activeSession = bot.sessions.get(thread.id);
  if (!activeSession) return;

  await thread.sendTyping();

  try {
    const content = message.content
      .replace(new RegExp(`<@!?${bot.client.user?.id}>`, "g"), "")
      .trim();
    if (!content) return;

    const response = await bot.sendMessage(
      activeSession.sessionId,
      content,
      activeSession.directory,
    );

    const chunks = response.match(/[\s\S]{1,2000}/g) || [response];

    for (const chunk of chunks) {
      await message.reply(chunk);
    }
  } catch (error) {
    console.error("Error sending message to OpenCode:", error);
    await message.reply("❌ Error communicating with OpenCode server.");
  }
}
