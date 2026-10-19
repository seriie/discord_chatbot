import { getLatestImage, updateImageDescription } from "../database/image.js";
import logger from "../utils/logger.js";

export default {
    name: "update_image_description",

    description:
        "Update the description of a previously saved image in the database. " +
        "Use this when the user asks to add, edit, or change the description of an image " +
        "that has ALREADY been saved to the database. " +
        "Pass the specific imageId if available, or leave imageId blank to update the most recently saved image.",

    parameters: {
        description: {
            type:        "string",
            description: "The new description text for the image.",
            required:    true,
        },
        imageId: {
            type:        "string",
            description: "Optional: The specific image ID (e.g. 'cms4tz...'). If omitted, updates the most recent image saved in this channel.",
            required:    false,
        },
    },

    async execute({ description, imageId }, _client, context = {}) {
        if (!description || typeof description !== "string") {
            return { error: "A valid description is required." };
        }

        let targetImage = null;

        if (imageId && imageId.trim()) {
            targetImage = { id: imageId.trim() };
        } else {
            targetImage = await getLatestImage(context.channelId, context.userId);
        }

        if (!targetImage) {
            return { error: "No saved image record found to update." };
        }

        try {
            const updated = await updateImageDescription(targetImage.id, description.trim());
            logger.info(`Updated image description for ${updated.id}: "${description}"`, "Tools");

            return {
                success:     true,
                imageId:     updated.id,
                filename:    updated.filename,
                description: updated.description,
                message:     `Description for image '${updated.filename}' updated successfully to: "${updated.description}".`,
            };
        } catch (error) {
            logger.error(`Failed to update image ${targetImage.id}`, "Tools", error);
            return { error: `Failed to update image: ${error.message}` };
        }
    },
};
