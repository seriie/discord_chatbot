import { PrismaClient } from "../generated/prisma/index.js";

import logger from "../utils/logger.js";
import config from "../config/index.js";

let _client = null;

function detectProvider(url) {
    if (!url) throw new Error("DATABASE_URL is not set.");
    const lower = url.toLowerCase();
    if (lower.startsWith("file:") || lower.startsWith("sqlite:")) return "sqlite";
    if (lower.startsWith("mysql:") || lower.startsWith("mysql2:")) return "mysql";
    if (lower.startsWith("postgresql:") || lower.startsWith("postgres:")) return "postgresql";
    throw new Error(`Unsupported DATABASE_URL scheme: "${url.split(":")[0]}". Expected mysql://, postgresql://, or file:.`);
}

function parseMysqlUrl(url) {
    const parsed   = new URL(url);
    const host     = parsed.hostname;
    const isRemote = host !== "localhost" && host !== "127.0.0.1" && host !== "::1";

    return {
        host,
        port:            parseInt(parsed.port, 10) || 3306,
        user:            decodeURIComponent(parsed.username),
        password:        decodeURIComponent(parsed.password),
        database:        parsed.pathname.replace(/^\//, ""),
        ssl:             isRemote ? { rejectUnauthorized: false } : undefined,
        connectionLimit: 5,
        connectTimeout:  15000,
    };
}

export function getPrismaClient() {
    if (_client) return _client;

    const dbUrl    = config.database.url;
    const provider = detectProvider(dbUrl);

    if (provider === "sqlite") {
        const { PrismaBetterSqlite3 } = await_import_or_throw(
            () => import("@prisma/adapter-better-sqlite3"),
            "@prisma/adapter-better-sqlite3",
        );
        const adapter = new PrismaBetterSqlite3({ url: dbUrl });
        _client = new PrismaClient({ adapter });

    } else if (provider === "mysql") {
        const { PrismaMariaDb } = await_import_or_throw(
            () => import("@prisma/adapter-mariadb"),
            "@prisma/adapter-mariadb",
        );
        const opts    = parseMysqlUrl(dbUrl);
        const adapter = new PrismaMariaDb(opts);
        _client = new PrismaClient({ adapter });

    } else if (provider === "postgresql") {
        const { PrismaPg } = await_import_or_throw(
            () => import("@prisma/adapter-pg"),
            "@prisma/adapter-pg",
        );
        const adapter = new PrismaPg({ connectionString: dbUrl });
        _client = new PrismaClient({ adapter });
    }

    logger.info(`Database connected: ${provider.toUpperCase()} (${dbUrl.slice(0, 40)}...)`, "Prisma");
    return _client;
}

function await_import_or_throw() {
    throw new Error(
        "Internal: await_import_or_throw should never be called. " +
        "Use the async init() factory below instead.",
    );
}


let _initPromise = null;

export async function initPrismaClient() {
    if (_client) return _client;
    if (_initPromise) return _initPromise;

    _initPromise = (async () => {
        const dbUrl    = config.database.url;
        const provider = detectProvider(dbUrl);

        if (provider === "sqlite") {
            const { PrismaBetterSqlite3 } = await import("@prisma/adapter-better-sqlite3");
            const adapter = new PrismaBetterSqlite3({ url: dbUrl });
            _client = new PrismaClient({ adapter });

        } else if (provider === "mysql") {
            const { PrismaMariaDb } = await import("@prisma/adapter-mariadb");
            const opts    = parseMysqlUrl(dbUrl);
            const adapter = new PrismaMariaDb(opts);
            _client = new PrismaClient({ adapter });

        } else if (provider === "postgresql") {
            const { PrismaPg } = await import("@prisma/adapter-pg");
            const adapter = new PrismaPg({ connectionString: dbUrl });
            _client = new PrismaClient({ adapter });
        }

        logger.info(`Database connected: ${provider.toUpperCase()} (${dbUrl.slice(0, 40)}...)`, "Prisma");
        return _client;
    })();

    return _initPromise;
}

export async function disconnectPrisma() {
    if (_client) {
        await _client.$disconnect();
        _client = null;
        logger.info("Database disconnected.", "Prisma");
    }
}

const prismaProxy = new Proxy({}, {
    get(_target, prop) {
        if (!_client) {
            throw new Error(
                `PrismaClient not initialized yet. ` +
                `Did you call "await initPrismaClient()" in bootstrap?`
            );
        }
        const val = _client[prop];
        return typeof val === "function" ? val.bind(_client) : val;
    },
});

export default prismaProxy;
