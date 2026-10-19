import { getMemories, getMemory } from "../database/memory.js";

export default {
    name: "get_memory",

    description:
        "Retrieve facts you've previously saved about the current user. " +
        "Use this before answering questions about the user's preferences, name, or any personal details " +
        "to ensure your response is personalized and accurate. " +
        "Provide a key to fetch a specific memory, or omit it to get all memories.",

    parameters: {
        key: {
            type:        "string",
            description: "Optional: the specific memory key to retrieve (e.g., 'favorite_color'). Omit to get all memories.",
            required:    false,
        },
    },

    async execute({ key }, _client, context = {}) {
        if (!context.userId) {
            return { error: "Cannot retrieve memory: user context is not available." };
        }

        if (key) {
            const normalizedKey = key.trim().toLowerCase().replace(/\s+/g, "_");
            const memory        = await getMemory(context.userId, normalizedKey);

            if (!memory) {
                return { found: false, message: `No memory found for key "${normalizedKey}".` };
            }

            return {
                found: true,
                key:   memory.key,
                value: memory.value,
            };
        }

        const memories = await getMemories(context.userId);

        if (memories.length === 0) {
            return { found: false, count: 0, message: "No memories saved for this user yet." };
        }

        return {
            found:   true,
            count:   memories.length,
            memories: memories.map((m) => ({ key: m.key, value: m.value })),
        };
    },
};
