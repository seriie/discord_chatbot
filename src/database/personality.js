import prisma from "./prisma.js";
import logger from "../utils/logger.js";

export async function getPersonality(userId) {
    if (!userId) return null;
    return prisma.personality.findUnique({
        where: { userId },
    });
}

export async function updatePersonality(userId, { tone, style, language, notes }) {
    const personality = await prisma.personality.upsert({
        where:  { userId },
        update: {
            ...(tone !== undefined ? { tone } : {}),
            ...(style !== undefined ? { style } : {}),
            ...(language !== undefined ? { language } : {}),
            ...(notes !== undefined ? { notes } : {}),
        },
        create: {
            userId,
            tone:     tone     ?? "casual",
            style:    style    ?? "friendly",
            language: language ?? null,
            notes:    notes    ?? null,
        },
    });

    logger.debug(`Updated personality profile for user ${userId}: tone=${tone}, style=${style}`, "Database");
    return personality;
}

export async function deletePersonality(userId) {
    await prisma.personality.deleteMany({
        where: { userId },
    });
}
