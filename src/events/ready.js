import { REST, Routes } from "discord.js";

import config from "../config/index.js";
import logger from "../utils/logger.js";

export default {
    name:  "ready",
    once:  true,

    async execute(client) {
        logger.info(`✅ Logged in as ${client.user.tag}`, "Discord");
        logger.info(`Serving ${client.guilds.cache.size} guild(s)`, "Discord");
        logger.info(`Tools loaded: ${client.tools.size}`, "Discord");
        logger.info(`Commands loaded: ${client.commands.size}`, "Discord");

        if (!config.discord.development) {
            logger.info("Production mode — skipping auto slash command registration.", "Discord");
            return;
        }

        try {
            const rest         = new REST({ version: "10" }).setToken(config.discord.token);
            const commandsData = client.commands.map((cmd) => cmd.data.toJSON());

            logger.info(`Registering ${commandsData.length} slash command(s)...`, "Discord");

            await rest.put(
                Routes.applicationCommands(client.user.id),
                { body: commandsData },
            );

            logger.info("✅ Slash commands registered successfully.", "Discord");
        } catch (error) {
            logger.error("Failed to register slash commands.", "Discord", error);
        }
    },
};
