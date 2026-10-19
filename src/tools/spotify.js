import axios from "axios";

import config from "../config/index.js";
import logger from "../utils/logger.js";

const TAG = "SpotifyTool";

let cachedToken     = null;
let tokenExpiresAt  = 0;

async function getAccessToken() {
    if (cachedToken && Date.now() < tokenExpiresAt) {
        return cachedToken;
    }

    const { clientId, clientSecret } = config.spotify;

    if (!clientId || !clientSecret) {
        throw new Error(
            "Spotify credentials are not configured. " +
            "Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in .env."
        );
    }

    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    const response = await axios.post(
        "https://accounts.spotify.com/api/token",
        "grant_type=client_credentials",
        {
            headers: {
                Authorization:  `Basic ${credentials}`,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            timeout: 10_000,
        },
    );

    cachedToken    = response.data.access_token;
    tokenExpiresAt = Date.now() + (response.data.expires_in - 60) * 1000;

    logger.debug("Spotify access token refreshed.", TAG);
    return cachedToken;
}

export default {
    name: "get_spotify_playlist",

    description:
        "Fetch information about a public Spotify playlist, including its name, " +
        "description, owner, track count, and the first 10 tracks. " +
        "Use this when the user asks about a Spotify playlist or shares a Spotify link. " +
        "The playlistId can be extracted from a Spotify URL: " +
        "https://open.spotify.com/playlist/<playlistId>",

    parameters: {
        playlistId: {
            type:        "string",
            description: "The Spotify playlist ID (22-character alphanumeric string).",
            required:    true,
        },
    },

    async execute({ playlistId }) {
        if (!playlistId || typeof playlistId !== "string") {
            return { error: "A valid Spotify playlist ID is required." };
        }

        const idMatch = playlistId.match(/playlist\/([A-Za-z0-9]+)/);
        const resolvedId = idMatch ? idMatch[1] : playlistId.trim();

        logger.info(`Fetching Spotify playlist: ${resolvedId}`, TAG);

        const token = await getAccessToken();

        let response;
        try {
            response = await axios.get(
                `https://api.spotify.com/v1/playlists/${resolvedId}`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                    params:  { market: "ID" },
                    timeout: 15_000,
                },
            );
        } catch (error) {
            if (error.response) {
                const status  = error.response.status;
                const body    = error.response.data;
                const message = body?.error?.message ?? JSON.stringify(body);

                logger.warn(`Spotify ${status} for playlist ${resolvedId}: ${message}`, TAG);

                if (status === 403) {
                    return {
                        error: `Spotify API returned 403 Forbidden: "${message}". ` +
                               "This may happen if the playlist is private, " +
                               "or if your Spotify Developer app hasn't enabled Web API access. " +
                               "Make sure to check: developer.spotify.com/dashboard → your app → Settings → and confirm Web API is enabled.",
                    };
                }
                if (status === 404) {
                    return { error: `Spotify playlist with ID "${resolvedId}" was not found.` };
                }
                if (status === 401) {
                    cachedToken    = null;
                    tokenExpiresAt = 0;
                    return { error: "Spotify authentication failed. The token may have expired — please try again." };
                }
            }
            throw error;
        }

        const playlist = response.data;

        if (!playlist.public) {
            return { error: "This playlist is private and cannot be accessed." };
        }

        const tracks = (playlist.tracks?.items ?? [])
            .filter((item) => item?.track)
            .slice(0, 10)
            .map((item) => ({
                name:     item.track.name,
                artists:  item.track.artists.map((a) => a.name).join(", "),
                duration: formatDuration(item.track.duration_ms),
                url:      item.track.external_urls?.spotify ?? null,
            }));

        return {
            id:          playlist.id,
            name:        playlist.name,
            description: playlist.description || "(no description)",
            owner:       playlist.owner?.display_name ?? "Unknown",
            followers:   playlist.followers?.total ?? 0,
            totalTracks: playlist.tracks?.total ?? 0,
            url:         `https://open.spotify.com/playlist/${playlist.id}`,
            previewTracks: tracks,
        };
    },
};

function formatDuration(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes      = Math.floor(totalSeconds / 60);
    const seconds      = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}