import { SlashCommandBuilder } from "discord.js";
import { joinVoice, addToQueue } from "../music/Player.js";
import logger from "../utils/logger.js";

export default {
    data: new SlashCommandBuilder()
        .setName("play")
        .setDescription("Play a song or playlist from Spotify/YouTube")
        .addStringOption(option => 
            option.setName("query")
            .setDescription("URL or search query")
            .setRequired(true)
        ),
        
    async execute(interaction) {
        await interaction.deferReply();
        const query = interaction.options.getString("query");
        const voiceChannel = interaction.member.voice.channel;

        if (!voiceChannel) {
            return interaction.editReply("You need to be in a voice channel to play music!");
        }

        try {
            await joinVoice(voiceChannel);
            const tracks = await addToQueue(interaction.guildId, query, interaction.user.username, interaction.channel, interaction.user.id);
            if (tracks.length === 1) {
                await interaction.editReply(`Added to queue: **${tracks[0].title}**`);
            } else {
                await interaction.editReply(`Added ${tracks.length} tracks to the queue!`);
            }
        } catch (error) {
            logger.error("Play command error", "Music", error);
            await interaction.editReply(`Failed to play: ${error.message}`);
        }
    }
};
