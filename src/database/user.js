import prisma from "./prisma.js";
import logger from "../utils/logger.js";

export async function findOrCreateUser(discordId, username, displayName) {
    const user = await prisma.user.upsert({
        where:  { discordId },
        update: { username, displayName: displayName ?? username },
        create: { discordId, username, displayName: displayName ?? username },
    });

    logger.debug(`User resolved: ${username} (${discordId})`, "Database");
    return user;
}

export async function updateUser(discordId, data) {
    return prisma.user.update({
        where: { discordId },
        data,
    });
}

export async function searchUsers(query, limit = 10) {
    return prisma.user.findMany({
        where: {
            OR: [
                { username:    { contains: query } },
                { displayName: { contains: query } },
                { discordId:   { contains: query } },
            ],
        },
        take: limit,
        orderBy: { createdAt: "desc" },
    });
}

export async function findUserById(id) {
    return prisma.user.findUnique({ where: { id } });
}

export async function countUsers() {
    return prisma.user.count();
}
