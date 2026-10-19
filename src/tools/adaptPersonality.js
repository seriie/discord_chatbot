import { updatePersonality } from "../database/personality.js";
import logger from "../utils/logger.js";

export default {
    name: "adapt_personality",

    description:
        "Adapt your AI persona, tone, language style, or speaking habits specifically for the current user. " +
        "Use this when you notice the user prefers a certain communication style (e.g. casual slang, formal, sarcastic, humorous), " +
        "or when the user explicitly asks you to change your personality or tone when talking to them.",

    parameters: {
        tone: {
            type:        "string",
            description: "The desired emotional tone (e.g. 'casual, sarcastic, warm, professional, humorous').",
            required:    false,
        },
        style: {
            type:        "string",
            description: "Speaking style & formatting habits (e.g. 'uses Indonesian Jaksel slang, short answers, uses emojis, technical jargon').",
            required:    false,
        },
        notes: {
            type:        "string",
            description: "Additional personality notes or user preferences (e.g. 'User likes gaming banter and short bullet points').",
            required:    false,
        },
    },

    async execute({ tone, style, notes }, _client, context = {}) {
        if (!context.userId) {
            return { error: "Cannot adapt personality: user context is not available." };
        }

        if (!tone && !style && !notes) {
            return { error: "At least one of 'tone', 'style', or 'notes' must be provided." };
        }

        try {
            const updated = await updatePersonality(context.userId, { tone, style, notes });
            logger.info(`Adapted personality for user ${context.userId}: tone=${updated.tone}, style=${updated.style}`, "Tools");

            return {
                success: true,
                message: "AI persona & speaking style updated successfully for this user.",
                persona: {
                    tone:  updated.tone,
                    style: updated.style,
                    notes: updated.notes,
                },
            };
        } catch (error) {
            logger.error("Failed to update personality profile.", "Tools", error);
            return { error: `Failed to adapt personality: ${error.message}` };
        }
    },
};
