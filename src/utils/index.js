export * from "./loader.js";
export * from "./download.js";
export { default as logger } from "./logger.js";

export function chunkText(text, maxLength = 1990) {
    const chunks = [];
    let remaining = text;

    while (remaining.length > 0) {
        if (remaining.length <= maxLength) {
            chunks.push(remaining);
            break;
        }

        let splitAt = remaining.lastIndexOf("\n", maxLength);

        if (splitAt <= 0) splitAt = maxLength;

        chunks.push(remaining.slice(0, splitAt));
        remaining = remaining.slice(splitAt).trimStart();
    }

    return chunks;
}

export function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export function truncate(str, max) {
    if (str.length <= max) return str;
    return str.slice(0, max - 1) + "…";
}