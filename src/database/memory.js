import prisma from "./prisma.js";
import logger from "../utils/logger.js";
import config from "../config/index.js";


async function findOrCreateConversation(channelId, guildId) {
    return prisma.conversation.upsert({
        where:  { channelId },
        update: { guildId: guildId ?? null },
        create: { channelId, guildId: guildId ?? null },
    });
}

export async function getConversationHistory(channelId, guildId, limit) {
    const maxMessages = limit ?? config.ai.contextWindow;

    const conversation = await prisma.conversation.findUnique({
        where: { channelId },
    });

    if (!conversation) return [];

    const messages = await prisma.message.findMany({
        where:   { conversationId: conversation.id },
        orderBy: { createdAt: "desc" },
        take:    maxMessages,
        select: {
            role:       true,
            content:    true,
            toolName:   true,
            toolCallId: true,
            user: {
                select: {
                    displayName: true,
                    username: true,
                },
            },
        },
    });

    return messages.reverse().map(msg => {
        let content = msg.content;
        
        if (msg.role === "user" && msg.user) {
            const name = msg.user.displayName || msg.user.username;
            content = `[${name}]: ${content}`;
        }

        return {
            role: msg.role,
            content,
            ...(msg.toolName ? { toolName: msg.toolName } : {}),
            ...(msg.toolCallId ? { toolCallId: msg.toolCallId } : {}),
        };
    });
}

export async function appendMessage(channelId, guildId, userId, role, content, toolMeta = {}) {
    const conversation = await findOrCreateConversation(channelId, guildId);

    await prisma.message.create({
        data: {
            conversationId: conversation.id,
            userId:         userId ?? null,
            role,
            content,
            toolName:       toolMeta.toolName   ?? null,
            toolCallId:     toolMeta.toolCallId ?? null,
        },
    });

    logger.debug(`Appended [${role}] message to channel ${channelId}`, "Memory");
}

export async function clearHistory(channelId) {
    const conversation = await prisma.conversation.findUnique({
        where: { channelId },
    });

    if (!conversation) return 0;

    const { count } = await prisma.message.deleteMany({
        where: { conversationId: conversation.id },
    });

    logger.info(`Cleared ${count} messages for channel ${channelId}`, "Memory");
    return count;
}


export async function saveMemory(userId, key, value) {
    const memory = await prisma.memory.upsert({
        where:  { userId_key: { userId, key } },
        update: { value },
        create: { userId, key, value },
    });

    logger.debug(`Saved memory for user ${userId}: ${key} = ${value}`, "Memory");
    return memory;
}

export async function getMemories(userId) {
    return prisma.memory.findMany({
        where:   { userId },
        orderBy: { updatedAt: "desc" },
    });
}

export async function getMemory(userId, key) {
    return prisma.memory.findUnique({
        where: { userId_key: { userId, key } },
    });
}

export async function deleteMemory(userId, key) {
    await prisma.memory.deleteMany({
        where: { userId, key },
    });
}
