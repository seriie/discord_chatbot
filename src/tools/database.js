import { searchUsers, countUsers } from "../database/user.js";

export default {
    name: "search_users",

    description:
        "Search registered users in the bot's database by username, display name, or Discord ID. " +
        "Use this when the user asks about other members, or when you need to find a user's database ID. " +
        "Also useful for counting total registered users.",

    parameters: {
        query: {
            type:        "string",
            description: "The search term — username, display name, or Discord ID. Pass an empty string to count all users.",
            required:    true,
        },
        limit: {
            type:        "number",
            description: "Maximum number of results to return (default: 10, max: 25).",
            required:    false,
        },
    },

    async execute({ query, limit = 10 }) {
        const safeLimit = Math.min(Math.max(1, limit), 25);

        if (!query || query.trim() === "") {
            const totalCount = await countUsers();
            return { users: [], totalCount, message: `There are ${totalCount} registered user(s) in the database.` };
        }

        const users = await searchUsers(query.trim(), safeLimit);
        const totalCount = await countUsers();

        return {
            totalCount,
            resultCount: users.length,
            users: users.map((u) => ({
                id:          u.id,
                discordId:   u.discordId,
                username:    u.username,
                displayName: u.displayName,
                createdAt:   u.createdAt.toISOString(),
            })),
        };
    },
};
