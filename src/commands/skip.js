import { SlashCommandBuilder } from "discord.js";
import { skipTrack } from "../music/Player.js";

export default {
    data: new SlashCommandBuilder()
        .setName("skip")
        .setDescription("Skip the currently playing song"),
        
    async execute(interaction) {
        const skipped = skipTrack(interaction.guildId);
        if (skipped) {
            await interaction.reply("Skipped!");
        } else {
            await interaction.reply({ content: "Nothing is currently playing.", ephemeral: true });
        }
    }
};
