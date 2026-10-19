import { ChannelType }  from "discord.js";

import config          from "../config/index.js";
import logger          from "../utils/logger.js";
import { chunkText }   from "../utils/index.js";
import { findOrCreateUser }                  from "../database/user.js";
import { getConversationHistory, appendMessage } from "../database/memory.js";
import { getPersonality }                    from "../database/personality.js";
import { buildSystemPrompt, buildMessages }  from "../ai/prompt.js";
import { runAgentLoop }                      from "../ai/client.js";

const TAG = "MessageCreate";

const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

function shouldRespond(message, client) {
    if (message.channel.type === ChannelType.DM) return true;

    if (message.mentions.has(client.user)) return true;

    if (config.discord.allowedChannels.includes(message.channelId)) return true;

    return false;
}

function extractImageUrls(message) {
    return message.attachments
        .filter((att) => {
            if (att.contentType && IMAGE_MIME_TYPES.has(att.contentType.split(";")[0].trim())) {
                return true;
            }
            const ext = att.name?.split(".").pop()?.toLowerCase();
            return ["jpg", "jpeg", "png", "gif", "webp"].includes(ext ?? "");
        })
        .map((att) => att.url);
}

function stripMention(content, botId) {
    return content
        .replace(new RegExp(`<@!?${botId}>`, "g"), "")
        .trim();
}

export default {
    name: "messageCreate",

    async execute(message, client) {
        if (message.author.bot || message.system) return;

        if (!shouldRespond(message, client)) return;

        const userContent = stripMention(message.content, client.user.id);
        const imageUrls   = extractImageUrls(message);

        if (!userContent && imageUrls.length === 0) return;

        logger.info(
            `Message from ${message.author.tag} in ${message.guildId ?? "DM"}: ${userContent.slice(0, 80)}`,
            TAG,
        );

        try {
            const dbUser = await findOrCreateUser(
                message.author.id,
                message.author.username,
                message.member?.displayName ?? message.author.globalName ?? undefined,
            );

            const history = await getConversationHistory(
                message.channelId,
                message.guildId ?? undefined,
            );

            const personality = await getPersonality(dbUser.id);

            const systemPrompt = buildSystemPrompt(client.tools, personality);
            const effectiveContent = userContent || "(User shared an image)";
            
            const name = dbUser.displayName || dbUser.username;
            const prefixedContent = `[${name}]: ${effectiveContent}`;

            const messages = buildMessages(
                systemPrompt,
                history,
                prefixedContent,
                imageUrls,
            );

            await message.channel.sendTyping();

            const typingInterval = setInterval(() => {
                message.channel.sendTyping().catch(() => {});
            }, 8_000);

            let response;
            let toolsUsed;

            try {
                const context = {
                    userId:    dbUser.id,
                    channelId: message.channelId,
                    guildId:   message.guildId ?? undefined,
                    message,
                };

                const result = await runAgentLoop(messages, client.tools, client, context);
                response  = result.response;
                toolsUsed = result.toolsUsed;
            } finally {
                clearInterval(typingInterval);
            }

            if (toolsUsed.length > 0) {
                logger.info(`Tools used: ${toolsUsed.join(", ")}`, TAG);
            }

            await appendMessage(
                message.channelId,
                message.guildId ?? undefined,
                dbUser.id,
                "user",
                effectiveContent,
            );

            await appendMessage(
                message.channelId,
                message.guildId ?? undefined,
                null,
                "assistant",
                response,
            );

            const chunks = chunkText(response, config.discord.maxMessageLength);

            for (const chunk of chunks) {
                await message.reply(chunk);
            }

        } catch (error) {
            logger.error("Failed to process message.", TAG, error);

            await message.reply(
                "⚠️ Something went wrong while processing your message. Please try again."
            ).catch(() => {});
        }
    },
};