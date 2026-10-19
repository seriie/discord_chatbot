import { stopMusic } from "../music/Player.js";

export default {
    name: "stop_music",
    description: "Stop the music playback, clear the queue, and make the bot leave the voice channel.",
    parameters: {},
    async execute(args, client, context) {
        if (!context.guildId) return { error: "Not in a server." };
        const stopped = stopMusic(context.guildId);
        if (stopped) {
            return { success: true, message: "Stopped the music and cleared the queue." };
        } else {
            return { error: "Nothing is currently playing." };
        }
    }
};
