import path from "path";

import { saveImage } from "../database/image.js";
import { downloadFile, buildFilename } from "../utils/download.js";
import logger from "../utils/logger.js";
import config from "../config/index.js";

export default {
    name: "save_image",

    description:
        "Download and save an image attachment that the user has shared. " +
        "ONLY use this tool if the user EXPLICITLY asks you to 'save', 'store', 'download', or 'keep' the image. " +
        "DO NOT use this tool if the user is merely asking you to describe, look at, or analyze the image.",

    parameters: {
        url: {
            type:        "string",
            description: "The direct URL of the image to download.",
            required:    true,
        },
        description: {
            type:        "string",
            description: "A brief description of the image content. CRITICAL: If you cannot actually see the image, DO NOT invent or guess a description. Leave this blank or use a very generic name.",
            required:    false,
        },
        filename: {
            type:        "string",
            description: "Optional custom filename (without extension).",
            required:    false,
        },
    },

    async execute({ url, description, filename }, _client, context = {}) {
        if (!url) {
            return { error: "A URL is required to save an image." };
        }

        let parsedUrl;
        try {
            parsedUrl = new URL(url);
        } catch {
            return { error: `Invalid URL: "${url}"` };
        }

        const ext          = path.extname(parsedUrl.pathname) || ".png";
        const safeFilename = buildFilename(url, ext);
        const overrideName = filename
            ? `${filename.replace(/[^a-z0-9_-]/gi, "_")}_${Date.now()}${ext}`
            : safeFilename;

        const destPath = path.join(config.storage.imagesDir, overrideName);

        logger.info(`Downloading image: ${url}`, "Tools");

        let downloadResult;
        try {
            downloadResult = await downloadFile(url, destPath);
        } catch (error) {
            logger.error(`Failed to download image from ${url}`, "Tools", error);
            return { error: `Failed to download image: ${error.message}` };
        }

        const mimeMap = {
            ".jpg":  "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png":  "image/png",
            ".gif":  "image/gif",
            ".webp": "image/webp",
            ".svg":  "image/svg+xml",
        };
        const mimeType = mimeMap[ext.toLowerCase()] ?? "application/octet-stream";

        const image = await saveImage({
            originalUrl: url,
            filename:    overrideName,
            localPath:   downloadResult.path,
            mimeType,
            sizeBytes:   downloadResult.sizeBytes,
            description: description ?? null,
            userId:      context.userId   ?? null,
            channelId:   context.channelId ?? null,
            guildId:     context.guildId   ?? null,
        });

        return {
            success:   true,
            imageId:   image.id,
            filename:  overrideName,
            sizeBytes: downloadResult.sizeBytes,
            mimeType,
            message:   `Image saved successfully (${Math.round(downloadResult.sizeBytes / 1024)} KB).`,
        };
    },
};
