import SpotifyWebApi from "spotify-web-api-node";
import config from "../config/index.js";
import logger from "../utils/logger.js";
import prisma from "../database/prisma.js";

const TAG = "SpotifyAuth";

export const globalSpotify = new SpotifyWebApi({
    clientId: config.spotify.clientId,
    clientSecret: config.spotify.clientSecret,
});

const redirectUri = process.env.SPOTIFY_REDIRECT_URI || `http://localhost:3000/auth/spotify/callback`;
export const oauthSpotify = new SpotifyWebApi({
    clientId: config.spotify.clientId,
    clientSecret: config.spotify.clientSecret,
    redirectUri,
});

export async function initSpotify() {
    if (!config.spotify.clientId) return;
    logger.info(`Spotify OAuth Redirect URI in use: ${redirectUri}`, TAG);
    try {
        const data = await globalSpotify.clientCredentialsGrant();
        globalSpotify.setAccessToken(data.body["access_token"]);
        logger.info("Global Spotify API authenticated.", TAG);
        
        setTimeout(initSpotify, (data.body["expires_in"] - 60) * 1000);
    } catch (err) {
        logger.error("Failed to auth global Spotify.", TAG, err);
    }
}

export function getLoginUrl(discordId) {
    const scopes = ["playlist-read-private", "playlist-read-collaborative", "user-library-read"];
    return oauthSpotify.createAuthorizeURL(scopes, discordId);
}

export async function handleCallback(code, stateDiscordId) {
    const data = await oauthSpotify.authorizationCodeGrant(code);
    const { access_token, refresh_token, expires_in } = data.body;

    const expiresAt = new Date(Date.now() + expires_in * 1000);

    const user = await prisma.user.findUnique({
        where: { discordId: stateDiscordId },
    });

    if (!user) throw new Error("Discord user not found in DB.");

    await prisma.spotifyToken.upsert({
        where: { userId: user.id },
        update: {
            accessToken: access_token,
            refreshToken: refresh_token,
            expiresAt,
        },
        create: {
            userId: user.id,
            accessToken: access_token,
            refreshToken: refresh_token,
            expiresAt,
        }
    });

    return true;
}

export async function getUserSpotify(discordId) {
    const user = await prisma.user.findUnique({
        where: { discordId },
        include: { spotifyToken: true }
    });

    if (!user || !user.spotifyToken) return null;

    const token = user.spotifyToken;
    const client = new SpotifyWebApi({
        clientId: config.spotify.clientId,
        clientSecret: config.spotify.clientSecret,
        accessToken: token.accessToken,
        refreshToken: token.refreshToken,
    });

    if (new Date() >= token.expiresAt) {
        try {
            const data = await client.refreshAccessToken();
            const newAccess = data.body["access_token"];
            const newRefresh = data.body["refresh_token"] || token.refreshToken;
            const newExpires = new Date(Date.now() + data.body["expires_in"] * 1000);

            await prisma.spotifyToken.update({
                where: { userId: user.id },
                data: { accessToken: newAccess, refreshToken: newRefresh, expiresAt: newExpires }
            });
            client.setAccessToken(newAccess);
            client.setRefreshToken(newRefresh);
        } catch (err) {
            logger.error(`Failed to refresh token for ${discordId}`, TAG, err);
            return null;
        }
    }

    return client;
}
