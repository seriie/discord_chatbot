import { SlashCommandBuilder, EmbedBuilder } from "discord.js";

import { clearHistory }    from "../database/memory.js";
import { getMemories }     from "../database/memory.js";
import { findOrCreateUser } from "../database/user.js";
import logger              from "../utils/logger.js";

const TAG = "MemoryCommand";

export default {
    data: new SlashCommandBuilder()
        .setName("memory")
        .setDescription("Manage your conversation context and bot memories.")
        .addSubcommand((sub) =>
            sub
                .setName("clear")
                .setDescription("Clear the conversation history for this channel."),
        )
        .addSubcommand((sub) =>
            sub
                .setName("list")
                .setDescription("List all facts the bot has saved about you."),
        ),

    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();

        await interaction.deferReply({ ephemeral: true });

        try {
            if (subcommand === "clear") {
                const deleted = await clearHistory(interaction.channelId);

                logger.info(
                    `/memory clear used by ${interaction.user.tag} — deleted ${deleted} messages`,
                    TAG,
                );

                await interaction.editReply({
                    content: `✅ Cleared **${deleted}** message(s) from the conversation history for this channel. The bot will start fresh.`,
                });
                return;
            }

            if (subcommand === "list") {
                const dbUser = await findOrCreateUser(
                    interaction.user.id,
                    interaction.user.username,
                    interaction.member?.displayName ?? undefined,
                );

                const memories = await getMemories(dbUser.id);

                if (memories.length === 0) {
                    await interaction.editReply({
                        content: "📭 The bot has no saved memories about you yet.",
                    });
                    return;
                }

                const embed = new EmbedBuilder()
                    .setColor(0x5865f2)
                    .setTitle(`🧠 Memories for ${interaction.user.displayName}`)
                    .setDescription(
                        memories
                            .map((m) => `**${m.key}**: ${m.value}`)
                            .join("\n"),
                    )
                    .setFooter({ text: `${memories.length} memory/memories stored` })
                    .setTimestamp();

                await interaction.editReply({ embeds: [embed] });
                return;
            }

        } catch (error) {
            logger.error(`Error in /memory ${subcommand}`, TAG, error);

            await interaction.editReply({
                content: "⚠️ An error occurred. Please try again.",
            }).catch(() => {});
        }
    },
};
