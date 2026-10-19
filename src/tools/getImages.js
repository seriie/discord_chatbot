import { searchImagesWithFilters } from "../database/image.js";
import logger from "../utils/logger.js";

export default {
    name: "get_images",

    description:
        "Search or list images that have been saved in the database. " +
        "You can search by description/filename, filter by a specific user's Discord ID (extract numbers from <@1234> if mentioned), " +
        "or just list the most recent images. Use this when the user asks to 'find an image', 'list images', or get images by a specific person.",

    parameters: {
        query: {
            type:        "string",
            description: "Optional search term to match against image description or filename. e.g. 'kucing lucu'",
            required:    false,
        },
        discordId: {
            type:        "string",
            description: "Optional Discord User ID to filter images uploaded by a specific user. If the user mentions someone like <@123456>, extract the numbers '123456'.",
            required:    false,
        },
        limit: {
            type:        "number",
            description: "Optional maximum number of images to return (e.g., 5). Default is 5.",
            required:    false,
        },
    },

    async execute({ query, discordId, limit = 5 }, client) {
        let cleanDiscordId = discordId;
        if (cleanDiscordId && cleanDiscordId.startsWith("<@")) {
            cleanDiscordId = cleanDiscordId.replace(/[^0-9]/g, "");
        }

        const limitNum = Math.min(Math.max(1, limit), 20);

        logger.info(`Searching images: query="${query || ''}", discordId="${cleanDiscordId || ''}", limit=${limitNum}`, "Tools");

        try {
            const images = await searchImagesWithFilters({
                query,
                discordId: cleanDiscordId,
                limit: limitNum,
            });

            if (!images || images.length === 0) {
                let msg = "No images found.";
                if (query) msg += ` Query: "${query}".`;
                if (cleanDiscordId) msg += ` User ID: "${cleanDiscordId}".`;
                return { result: msg };
            }

            const results = images.map((img) => ({
                id: img.id,
                filename: img.filename,
                description: img.description || "(no description)",
                url: img.originalUrl,
                uploader: img.user ? (img.user.displayName || img.user.username) : "Unknown",
                uploadedAt: img.createdAt,
            }));

            return {
                message: `Found ${results.length} images.`,
                images: results,
            };
        } catch (error) {
            logger.error("Failed to search images", "Tools", error);
            return { error: `Database error while searching images: ${error.message}` };
        }
    },
};
