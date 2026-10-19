import { SlashCommandBuilder } from "discord.js";

import { findOrCreateUser }                       from "../database/user.js";
import { getConversationHistory, appendMessage }  from "../database/memory.js";
import { getPersonality }                         from "../database/personality.js";
import { buildSystemPrompt, buildMessages }       from "../ai/prompt.js";
import { runAgentLoop }                           from "../ai/client.js";
import { chunkText }                              from "../utils/index.js";
import logger                                     from "../utils/logger.js";
import config                                     from "../config/index.js";

const TAG = "ChatCommand";

export default {
    data: new SlashCommandBuilder()
        .setName("chat")
        .setDescription("Send a message to the AI assistant.")
        .addStringOption((option) =>
            option
                .setName("message")
                .setDescription("What would you like to ask or say?")
                .setRequired(true)
                .setMaxLength(2000),
        ),

    async execute(interaction, client) {
        const userContent = interaction.options.getString("message", true);

        logger.info(
            `/chat from ${interaction.user.tag}: ${userContent.slice(0, 80)}`,
            TAG,
        );

        await interaction.deferReply();

        try {
            const dbUser = await findOrCreateUser(
                interaction.user.id,
                interaction.user.username,
                interaction.member?.displayName ?? interaction.user.globalName ?? undefined,
            );

            const history     = await getConversationHistory(
                interaction.channelId,
                interaction.guildId ?? undefined,
            );
            const personality = await getPersonality(dbUser.id);

            const systemPrompt = buildSystemPrompt(client.tools, personality);
            const messages     = buildMessages(systemPrompt, history, userContent);

            const context = {
                userId:    dbUser.id,
                channelId: interaction.channelId,
                guildId:   interaction.guildId ?? undefined,
                interaction,
            };

            const { response, toolsUsed } = await runAgentLoop(
                messages,
                client.tools,
                client,
                context,
            );

            if (toolsUsed.length > 0) {
                logger.info(`Tools used: ${toolsUsed.join(", ")}`, TAG);
            }

            await appendMessage(
                interaction.channelId,
                interaction.guildId ?? undefined,
                dbUser.id,
                "user",
                userContent,
            );

            await appendMessage(
                interaction.channelId,
                interaction.guildId ?? undefined,
                null,
                "assistant",
                response,
            );

            const chunks = chunkText(response, config.discord.maxMessageLength);

            await interaction.editReply(chunks[0]);

            for (const chunk of chunks.slice(1)) {
                await interaction.followUp(chunk);
            }

        } catch (error) {
            logger.error("Error in /chat command.", TAG, error);

            const errorMessage = "⚠️ Something went wrong. Please try again.";

            if (interaction.deferred) {
                await interaction.editReply(errorMessage).catch(() => {});
            } else {
                await interaction.reply({ content: errorMessage, ephemeral: true }).catch(() => {});
            }
        }
    },
};
