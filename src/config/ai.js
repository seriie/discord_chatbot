export default {
    provider: process.env.AI_PROVIDER || "huggingface",

    model: process.env.AI_MODEL || "Qwen/Qwen3-235B-A22B-Instruct-2507",

    apiKey: process.env.AI_API_KEY || process.env.HF_API_KEY,

    temperature: parseFloat(process.env.AI_TEMPERATURE || "0.7"),

    maxTokens: parseInt(process.env.AI_MAX_TOKENS || "4096", 10),

    maxToolIterations: parseInt(process.env.AI_MAX_TOOL_ITERATIONS || "5", 10),

    visionEnabled: process.env.AI_VISION_ENABLED === "true",

    contextWindow: parseInt(process.env.AI_CONTEXT_WINDOW || "20", 10),

    baseUrls: {
        huggingface: process.env.HF_BASE_URL || "https://router.huggingface.co/v1",
        openrouter:  process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
        openai:      process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
        gemini:      process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta",
    },

    apiKeys: {
        huggingface: process.env.HF_API_KEY,
        openrouter:  process.env.OPENROUTER_API_KEY,
        openai:      process.env.OPENAI_API_KEY,
        gemini:      process.env.GEMINI_API_KEY,
    },
};