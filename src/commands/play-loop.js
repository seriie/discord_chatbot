import { SlashCommandBuilder } from "discord.js";
import { addToQueue, joinVoice, setLoopMode } from "../music/Player.js";

export default {
    data: new SlashCommandBuilder()
        .setName("play-loop")
        .setDescription("Play a song and loop it immediately")
        .addStringOption(option =>
            option.setName("query")
                .setDescription("Song name, YouTube URL, or Spotify URL")
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
            
            setLoopMode(interaction.guildId, "track");
            
            const tracks = await addToQueue(interaction.guildId, query, interaction.user.username, interaction.channel, interaction.user.id);
            
            if (tracks.length === 1) {
                await interaction.editReply(`Added **${tracks[0].title}** by ${tracks[0].artist} to the queue and set loop mode to **Track 🔂**.`);
            } else {
                await interaction.editReply(`Added **${tracks.length} tracks** to the queue and set loop mode to **Track 🔂**.`);
            }
        } catch (error) {
            await interaction.editReply(`Failed to play music: ${error.message}`);
        }
    }
};
