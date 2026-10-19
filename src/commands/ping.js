import { SlashCommandBuilder, EmbedBuilder } from "discord.js";

export default {
    data: new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Check the bot's latency and status."),

    async execute(interaction, client) {
        const wsPing = client.ws.ping;

        const sent = await interaction.reply({
            content:    "🏓 Pinging...",
            fetchReply: true,
        });

        const roundTrip = sent.createdTimestamp - interaction.createdTimestamp;

        const embed = new EmbedBuilder()
            .setColor(0x5865f2)
            .setTitle("🏓 Pong!")
            .addFields(
                {
                    name:   "🌐 WebSocket Latency",
                    value:  `\`${wsPing}ms\``,
                    inline: true,
                },
                {
                    name:   "⏱️ Round-trip",
                    value:  `\`${roundTrip}ms\``,
                    inline: true,
                },
            )
            .setFooter({ text: `Bot: ${client.user.tag}` })
            .setTimestamp();

        await interaction.editReply({ content: "", embeds: [embed] });
    },
};