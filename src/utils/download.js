import fs   from "fs";
import path from "path";
import axios from "axios";

import logger from "./logger.js";

export function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        logger.debug(`Created directory: ${dir}`, "Download");
    }
}

export async function downloadFile(url, destPath) {
    ensureDir(path.dirname(destPath));

    const response = await axios.get(url, {
        responseType: "stream",
        timeout: 30_000,
    });

    return new Promise((resolve, reject) => {
        const writer    = fs.createWriteStream(destPath);
        let sizeBytes   = 0;

        response.data.on("data", (chunk) => {
            sizeBytes += chunk.length;
        });

        response.data.pipe(writer);

        writer.on("finish", () => {
            logger.debug(`Downloaded ${sizeBytes} bytes → ${destPath}`, "Download");
            resolve({ path: destPath, sizeBytes });
        });

        writer.on("error", (err) => {
            fs.unlink(destPath, () => {});
            reject(err);
        });

        response.data.on("error", (err) => {
            writer.destroy();
            reject(err);
        });
    });
}

export function buildFilename(url, extOverride) {
    const urlObj    = new URL(url);
    const basename  = path.basename(urlObj.pathname) || "file";
    const ext       = extOverride || path.extname(basename) || "";
    const name      = path.basename(basename, path.extname(basename));
    const timestamp = Date.now();

    const safeName = name.replace(/[^a-z0-9_-]/gi, "_").slice(0, 64);

    return `${safeName}_${timestamp}${ext}`;
}
