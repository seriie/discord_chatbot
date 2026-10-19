import { saveMemory } from "../database/memory.js";
import logger from "../utils/logger.js";

export default {
    name: "save_memory",

    description:
        "Save an important fact, relationship, or preference about the current user into long-term memory in the database. " +
        "You MUST execute this tool IMMEDIATELY whenever the user shares personal information, " +
        "such as their name, girlfriend/boyfriend, location, preferences, or any custom detail (e.g., key: 'girlfriend', value: 'ayaaa'). " +
        "Each memory is a key/value pair stored per user in the database.",

    parameters: {
        key: {
            type:        "string",
            description: "A short, descriptive key for the memory (e.g., 'favorite_color', 'real_name', 'timezone').",
            required:    true,
        },
        value: {
            type:        "string",
            description: "The value to store (e.g., 'blue', 'Alice', 'UTC+7').",
            required:    true,
        },
    },

    async execute({ key, value }, _client, context = {}) {
        if (!context.userId) {
            return { error: "Cannot save memory: user context is not available." };
        }

        if (!key || !value) {
            return { error: "Both 'key' and 'value' are required to save a memory." };
        }

        const normalizedKey = key.trim().toLowerCase().replace(/\s+/g, "_");

        await saveMemory(context.userId, normalizedKey, value.trim());

        logger.debug(`Memory saved: ${context.userId} → ${normalizedKey}=${value}`, "Tools");

        return {
            success: true,
            message: `Got it! I've remembered your ${normalizedKey}: "${value}".`,
            key:     normalizedKey,
            value:   value.trim(),
        };
    },
};
