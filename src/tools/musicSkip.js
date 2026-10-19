import { skipTrack } from "../music/Player.js";

export default {
    name: "skip_music",
    description: "Skip the currently playing song in the voice channel.",
    parameters: {},
    async execute(args, client, context) {
        if (!context.guildId) return { error: "Not in a server." };
        const skipped = skipTrack(context.guildId);
        if (skipped) {
            return { success: true, message: "Skipped the current track." };
        } else {
            return { error: "Nothing is currently playing to skip." };
        }
    }
};
