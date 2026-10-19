import { SlashCommandBuilder } from "discord.js";
import { setLoopMode } from "../music/Player.js";

export default {
    data: new SlashCommandBuilder()
        .setName("loop")
        .setDescription("Set the loop mode for the music player")
        .addStringOption(option =>
            option.setName("mode")
                .setDescription("Loop mode")
                .setRequired(true)
                .addChoices(
                    { name: "Off (Don't loop)", value: "off" },
                    { name: "Track (Loop current song)", value: "track" },
                    { name: "Queue (Loop entire queue)", value: "queue" }
                )
        ),
    async execute(interaction) {
        await interaction.deferReply();
        
        const mode = interaction.options.getString("mode");
        const guildId = interaction.guildId;
        
        setLoopMode(guildId, mode);
        
        const modeStr = mode === "off" ? "Off ❌" : mode === "track" ? "Track 🔂" : "Queue 🔁";
        await interaction.editReply(`Loop mode set to: **${modeStr}**`);
    }
};
