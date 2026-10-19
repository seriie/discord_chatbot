import prisma from "./prisma.js";
import logger from "../utils/logger.js";

export async function saveImage(data) {
    const image = await prisma.image.create({
        data: {
            originalUrl: data.originalUrl,
            filename:    data.filename,
            localPath:   data.localPath   ?? null,
            mimeType:    data.mimeType    ?? null,
            sizeBytes:   data.sizeBytes   ?? null,
            description: data.description ?? null,
            userId:      data.userId      ?? null,
            channelId:   data.channelId   ?? null,
            guildId:     data.guildId     ?? null,
        },
    });

    logger.debug(`Saved image record: ${image.id} (${data.filename})`, "Database");
    return image;
}

export async function countImages(userId) {
    return prisma.image.count({
        where: userId ? { userId } : undefined,
    });
}

export async function findImages(query, limit = 10) {
    return prisma.image.findMany({
        where: {
            OR: [
                { description: { contains: query } },
                { filename:    { contains: query } },
            ],
        },
        take:    limit,
        orderBy: { createdAt: "desc" },
    });
}

export async function getRecentImages(limit = 5) {
    return prisma.image.findMany({
        orderBy: { createdAt: "desc" },
        take: limit,
    });
}

export async function getLatestImage(channelId, userId) {
    return prisma.image.findFirst({
        where: {
            OR: [
                channelId ? { channelId } : undefined,
                userId    ? { userId }    : undefined,
            ].filter(Boolean),
        },
        orderBy: { createdAt: "desc" },
    });
}

export async function updateImageDescription(imageId, description) {
    return prisma.image.update({
        where: { id: imageId },
        data:  { description },
    });
}

export async function deleteImage(id) {
    await prisma.image.delete({ where: { id } });
}

export async function searchImagesWithFilters({ query, discordId, limit = 10 }) {
    const where = {};

    if (query) {
        where.OR = [
            { description: { contains: query } },
            { filename:    { contains: query } },
        ];
    }

    if (discordId) {
        where.user = { discordId };
    }

    return prisma.image.findMany({
        where,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: { user: true },
    });
}
