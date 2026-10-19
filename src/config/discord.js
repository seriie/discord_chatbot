export default {
    token: process.env.DISCORD_TOKEN,

    clientId: process.env.CLIENT_ID,

    ownerId: process.env.OWNER_ID,

    development: process.env.NODE_ENV !== "production",

    prefix: process.env.BOT_PREFIX || "!",

    maxMessageLength: 1990,

    typingDelay: 300,

    allowedChannels: (process.env.ALLOWED_CHANNELS || "")
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean),
};