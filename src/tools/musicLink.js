import { getLoginUrl } from "../music/spotify.js";

export default {
    name: "link_spotify",
    description: "Generate a Spotify Login URL for the user to connect their Spotify account to the bot. Use this when the user asks to connect or link their Spotify account.",
    parameters: {},
    async execute(args, client, context) {
        const discordId = context.message?.author?.id;
        if (!discordId) return { error: "Could not determine Discord user ID." };
        
        const url = getLoginUrl(discordId);
        return { 
            success: true, 
            message: `Generated login URL. Show this to the user and tell them to click it: ${url}` 
        };
    }
};
