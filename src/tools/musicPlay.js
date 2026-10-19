import { joinVoice, addToQueue } from "../music/Player.js";
import logger from "../utils/logger.js";

export default {
    name: "play_music",
    description: "Play a song, track, or playlist from Spotify or YouTube in the user's voice channel.",
    parameters: {
        query: {
            type: "string",
            description: "The name of the song to search for, or a direct Spotify/YouTube URL.",
            required: true,
        }
    },
    async execute({ query }, client, context) {
        try {
            const voiceChannel = context.message?.member?.voice?.channel;

            if (!voiceChannel) {
                return { error: "The user must be inside a Voice Channel to play music. Tell them to join one." };
            }

            const channel = await client.channels.fetch(context.channelId);

            await joinVoice(voiceChannel);
            const tracks = await addToQueue(context.guildId, query, context.message?.author?.username, channel, context.userId);
            
            if (tracks.length === 1) {
                return { success: true, message: `Added ${tracks[0].title} by ${tracks[0].artist} to the queue.` };
            } else {
                return { success: true, message: `Added ${tracks.length} tracks to the queue.` };
            }
        } catch (error) {
            logger.error("play_music error", "Tools", error);
            return { error: `Failed to play music: ${error.message}` };
        }
    }
};
