export default {
    url: process.env.DATABASE_URL || "file:./dev.db",

    logging: process.env.NODE_ENV !== "production",
};