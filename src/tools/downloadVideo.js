import fs from "fs";
import path from "path";
import youtubedl from "youtube-dl-exec";

import config from "../config/index.js";
import logger from "../utils/logger.js";
import { ensureDir } from "../utils/download.js";

const MAX_DISCORD_UPLOAD_BYTES = 25 * 1024 * 1024;

export default {
    name: "download_video",

    description:
        "Download a video from a provided URL (TikTok, YouTube, Instagram, Facebook, etc.) " +
        "and send it directly to the chat as an attachment. " +
        "Use this ONLY when the user explicitly asks to download a video and provides a link.",

    parameters: {
        url: {
            type:        "string",
            description: "The full URL of the video to download.",
            required:    true,
        },
    },

    async execute({ url }, client, context) {
        if (!url) {
            return { error: "A URL is required." };
        }

        if (!context || !context.message) {
            return { error: "Cannot send video: context.message is not available." };
        }

        logger.info(`Extracting video info for: ${url}`, "DownloadVideo");
        
        try {
            await context.message.channel.sendTyping().catch(() => {});
            
            const info = await youtubedl(url, {
                dumpSingleJson: true,
                noWarnings: true,
                noCallHome: true,
                noCheckCertificate: true,
                youtubeSkipDashManifest: true,
            });

            const sizeBytes = info.filesize || info.filesize_approx || 0;
            
            if (sizeBytes > MAX_DISCORD_UPLOAD_BYTES) {
                const mb = (sizeBytes / 1024 / 1024).toFixed(1);
                return { 
                    error: `Video is too large to upload directly to Discord (${mb} MB, limit is 25 MB).`, 
                    title: info.title,
                    direct_url: info.webpage_url || url,
                    action: "Inform the user that the video is too large and provide the title and URL."
                };
            }

            const tempDir = path.join(config.storage.imagesDir, "..", "temp");
            ensureDir(tempDir);
            
            const tempFilename = `video_${Date.now()}_${Math.floor(Math.random() * 1000)}.mp4`;
            const tempPath = path.join(tempDir, tempFilename);

            logger.info(`Downloading video to ${tempPath}...`, "DownloadVideo");
            
            await youtubedl(url, {
                output: tempPath,
                format: "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
                maxFilesize: "25M",
                noWarnings: true,
            });

            if (!fs.existsSync(tempPath)) {
                return { error: "Failed to download video: file was not created. The video might be restricted or larger than 25MB." };
            }

            const stats = fs.statSync(tempPath);
            if (stats.size > MAX_DISCORD_UPLOAD_BYTES) {
                fs.unlinkSync(tempPath);
                return { error: "Downloaded video exceeds Discord's 25MB limit. File deleted." };
            }

            logger.info(`Uploading video to Discord (${stats.size} bytes)...`, "DownloadVideo");

            await context.message.reply({
                content: `🎥 **${info.title || 'Video'}**`,
                files: [{ attachment: tempPath, name: "video.mp4" }]
            });

            fs.unlinkSync(tempPath);

            return { 
                success: true, 
                message: "Video has been successfully downloaded and sent to the channel. You can just tell the user to enjoy the video." 
            };

        } catch (error) {
            logger.error(`Failed to download video from ${url}`, "DownloadVideo", error);
            const errMsg = error.stderr || error.message || String(error);
            return { error: `Download failed: ${errMsg.slice(0, 500)}` };
        }
    },
};
