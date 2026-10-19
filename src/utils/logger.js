const RESET  = "\x1b[0m";
const GREY   = "\x1b[90m";
const CYAN   = "\x1b[36m";
const YELLOW = "\x1b[33m";
const RED    = "\x1b[31m";
const BOLD   = "\x1b[1m";

const LEVEL_CONFIG = {
    debug: { color: GREY,   label: "DEBUG", priority: 0 },
    info:  { color: CYAN,   label: "INFO ",  priority: 1 },
    warn:  { color: YELLOW, label: "WARN ",  priority: 2 },
    error: { color: RED,    label: "ERROR", priority: 3 },
};

const MIN_PRIORITY = LEVEL_CONFIG[process.env.LOG_LEVEL || "info"]?.priority ?? 1;

function timestamp() {
    return new Date().toTimeString().slice(0, 8);
}

function formatTag(tag) {
    return tag ? ` ${BOLD}[${tag}]${RESET}` : "";
}

function log(level, message, tag, extra) {
    const cfg = LEVEL_CONFIG[level];

    if (cfg.priority < MIN_PRIORITY) return;

    const stream  = level === "error" ? process.stderr : process.stdout;
    const ts      = `${GREY}${timestamp()}${RESET}`;
    const lvl     = `${cfg.color}${cfg.label}${RESET}`;
    const tagStr  = formatTag(tag);

    stream.write(`${ts} ${lvl}${tagStr} ${message}\n`);

    if (extra !== undefined) {
        const formatted =
            extra instanceof Error
                ? extra.stack ?? extra.message
                : typeof extra === "object"
                  ? JSON.stringify(extra, null, 2)
                  : String(extra);

        stream.write(`${GREY}${formatted}${RESET}\n`);
    }
}


const logger = {
    debug: (message, tag, extra) => log("debug", message, tag, extra),

    info:  (message, tag, extra) => log("info",  message, tag, extra),

    warn:  (message, tag, extra) => log("warn",  message, tag, extra),

    error: (message, tag, extra) => log("error", message, tag, extra),
};

export default logger;
