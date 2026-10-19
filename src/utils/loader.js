import fs   from "fs";
import path from "path";
import { pathToFileURL } from "url";

import logger from "./logger.js";

export async function loadModules(dir) {
    if (!fs.existsSync(dir)) {
        logger.warn(`Directory does not exist, skipping: ${dir}`, "Loader");
        return [];
    }

    const files = fs
        .readdirSync(dir)
        .filter((file) => file.endsWith(".js"));

    const modules = [];

    for (const file of files) {
        const filePath = path.join(dir, file);
        try {
            const mod = await import(pathToFileURL(filePath).href);
            if (mod.default) {
                modules.push(mod.default);
            } else {
                logger.warn(`No default export found in ${file}`, "Loader");
            }
        } catch (error) {
            logger.error(`Failed to load module: ${file}`, "Loader", error);
        }
    }

    return modules;
}

export async function loadEvents(dir) {
    const modules = await loadModules(dir);

    return modules.filter((mod) => {
        if (!mod.name || typeof mod.execute !== "function") {
            logger.warn(`Invalid event module skipped (missing name or execute)`, "Loader");
            return false;
        }
        return true;
    });
}

export async function loadCommands(dir) {
    const modules = await loadModules(dir);

    return modules.filter((mod) => {
        if (!mod.data || typeof mod.execute !== "function") {
            logger.warn(`Invalid command module skipped (missing data or execute)`, "Loader");
            return false;
        }
        return true;
    });
}

export async function loadTools(dir) {
    const modules = await loadModules(dir);
    const toolMap  = new Map();

    for (const tool of modules) {
        if (!tool.name || !tool.description || typeof tool.execute !== "function") {
            logger.warn(`Invalid tool skipped (missing name, description, or execute)`, "Loader");
            continue;
        }

        if (toolMap.has(tool.name)) {
            logger.warn(`Duplicate tool name "${tool.name}" — skipping`, "Loader");
            continue;
        }

        toolMap.set(tool.name, tool);
        logger.debug(`Loaded tool: ${tool.name}`, "Loader");
    }

    return toolMap;
}
