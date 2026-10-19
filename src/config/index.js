import ai from "./ai.js";
import database from "./database.js";
import discord from "./discord.js";

const spotify = {
    clientId:     process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
};

const storage = {
    imagesDir: process.env.IMAGES_DIR || "./storage/images",
};

export default {
    ai,
    database,
    discord,
    spotify,
    storage,
};