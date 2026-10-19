import { setLoopMode } from "../music/Player.js";

export default {
    name: "loop_music",
    description: "Sets the loop mode for the music player. Use 'off' to disable looping, 'track' to loop the current song, or 'queue' to loop the entire playlist/queue.",
    parameters: {
        mode: {
            type: "string",
            description: "The loop mode to set. Must be 'off', 'track', or 'queue'.",
            enum: ["off", "track", "queue"]
        }
    },
    async execute({ mode }, client, context) {
        try {
            setLoopMode(context.guildId, mode);
            const modeStr = mode === "off" ? "Off ❌" : mode === "track" ? "Track 🔂" : "Queue 🔁";
            return { success: true, message: `Loop mode has been set to: ${modeStr}` };
        } catch (error) {
            return { error: `Failed to set loop mode: ${error.message}` };
        }
    }
};
