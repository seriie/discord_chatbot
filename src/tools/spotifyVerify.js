import { handleCallback } from "../music/spotify.js";
import { URL } from "url";

export default {
    name: "spotify_verify_url",
    description: "Use this tool when the user pastes a Spotify callback URL (e.g. http://localhost:3000/auth/spotify/callback?code=...) in the chat after trying to login.",
    parameters: {
        url: {
            type: "string",
            description: "The full callback URL the user pasted."
        }
    },
    async execute({ url }, client, context) {
        try {
            const parsedUrl = new URL(url);
            const code = parsedUrl.searchParams.get("code");
            const state = parsedUrl.searchParams.get("state");
            
            if (!code || !state) {
                return { error: "URL tidak valid. Pastikan URL mengandung 'code' dan 'state'." };
            }
            
            await handleCallback(code, state);
            return { success: true, message: "Spotify account successfully linked!" };
        } catch (error) {
            console.error("[SpotifyVerify] Error linking spotify:", error);
            return { error: `Failed to link Spotify: ${error.message}` };
        }
    }
};
