import "dotenv/config";

import path from "path";
import { fileURLToPath } from "url";
import { Client, Collection, GatewayIntentBits, Partials } from "discord.js";

import config                              from "./config/index.js";
import logger                              from "./utils/logger.js";
import { loadEvents, loadCommands, loadTools } from "./utils/loader.js";
import { initPrismaClient, disconnectPrisma } from "./database/prisma.js";
import { startWebServer } from "./web/server.js";
import { initSpotify } from "./music/spotify.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);


const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildEmojisAndStickers,
        GatewayIntentBits.GuildIntegrations,
        GatewayIntentBits.GuildWebhooks,
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.GuildScheduledEvents,
        GatewayIntentBits.DirectMessageReactions,
    ],
    partials: [Partials.Channel, Partials.Message],
});

client.commands = new Collection();
client.tools    = new Map();


async function bootstrap() {
    logger.info("Starting Discord AI Chatbot...", "Bootstrap");
    logger.info(`Environment: ${config.discord.development ? "development" : "production"}`, "Bootstrap");
    logger.info(`AI Provider: ${config.ai.provider} / Model: ${config.ai.model}`, "Bootstrap");

    await initPrismaClient();

    startWebServer();
    await initSpotify();

    const eventsDir   = path.join(__dirname, "events");
    const commandsDir = path.join(__dirname, "commands");
    const toolsDir    = path.join(__dirname, "tools");

    const events = await loadEvents(eventsDir);

    for (const event of events) {
        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args, client));
        } else {
            client.on(event.name, (...args) => event.execute(...args, client));
        }
        logger.debug(`Registered event: ${event.name}`, "Bootstrap");
    }

    logger.info(`Loaded ${events.length} event(s).`, "Bootstrap");

    const commands = await loadCommands(commandsDir);

    for (const command of commands) {
        client.commands.set(command.data.name, command);
        logger.debug(`Registered command: /${command.data.name}`, "Bootstrap");
    }

    logger.info(`Loaded ${commands.length} slash command(s).`, "Bootstrap");

    const tools = await loadTools(toolsDir);
    client.tools = tools;

    logger.info(`Loaded ${tools.size} AI tool(s): [${[...tools.keys()].join(", ")}]`, "Bootstrap");

    if (!config.discord.token) {
        logger.error("DISCORD_TOKEN is not set. Cannot login.", "Bootstrap");
        process.exit(1);
    }

    client.once('ready', async (c) => {
        logger.info(`Ready! Logged in as ${c.user.tag}`, "Bootstrap");
        
        try {
            const { REST, Routes } = await import("discord.js");
            const rest = new REST({ version: '10' }).setToken(config.discord.token);
            
            const commandData = [];
            for (const cmd of client.commands.values()) {
                commandData.push(cmd.data.toJSON());
            }

            logger.info(`Started refreshing ${commandData.length} application (/) commands.`, "Bootstrap");
            const data = await rest.put(
                Routes.applicationCommands(c.user.id),
                { body: commandData },
            );
            logger.info(`Successfully reloaded ${data.length} application (/) commands.`, "Bootstrap");
        } catch (error) {
            logger.error("Failed to deploy application commands.", "Bootstrap", error);
        }
    });

    await client.login(config.discord.token);
}


async function shutdown(signal) {
    logger.info(`Received ${signal}. Shutting down gracefully...`, "Bootstrap");

    try {
        client.destroy();
        await disconnectPrisma();
        logger.info("Goodbye.", "Bootstrap");
    } catch (error) {
        logger.error("Error during shutdown.", "Bootstrap", error);
    } finally {
        process.exit(0);
    }
}

process.on("SIGINT",  () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));


process.on("unhandledRejection", (reason, promise) => {
    logger.error("Unhandled Promise Rejection.", "Bootstrap", reason);
});

process.on("uncaughtException", (error) => {
    logger.error("Uncaught Exception — bot will NOT crash.", "Bootstrap", error);
});


bootstrap().catch((error) => {
    logger.error("Fatal error during bootstrap.", "Bootstrap", error);
    process.exit(1);
});