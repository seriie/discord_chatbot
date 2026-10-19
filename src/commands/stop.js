import { SlashCommandBuilder } from "discord.js";
import { stopMusic } from "../music/Player.js";

export default {
    data: new SlashCommandBuilder()
        .setName("stop")
        .setDescription("Stop the music and clear the queue"),
        
    async execute(interaction) {
        const stopped = stopMusic(interaction.guildId);
        if (stopped) {
            await interaction.reply("Stopped the music and cleared the queue. Bye!");
        } else {
            await interaction.reply({ content: "Nothing is currently playing.", ephemeral: true });
        }
    }
};
