import { Client, GatewayIntentBits, Partials, Events } from "discord.js";
import { Bot, handleMessageCreate } from "./src/bot.ts";

const token = process.env.DISCORD_BOT_TOKEN;

if (!token) {
  console.error("DISCORD_BOT_TOKEN environment variable is required");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

const bot = new Bot(client);

client.once(Events.ClientReady, () => {
  console.log(`Bot logged in as ${client.user?.tag}`);
  console.log(`Connected to ${client.guilds.cache.size} guild(s)`);
});

client.on(Events.MessageCreate, (message) => handleMessageCreate(bot, message));

client.login(token).catch((error) => {
  console.error("Failed to login:", error);
  process.exit(1);
});

process.on("SIGINT", () => {
  console.log("\nShutting down...");
  client.destroy();
  process.exit(0);
});
