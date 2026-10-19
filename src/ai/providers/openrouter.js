import axios from "axios";

import config from "../../config/index.js";
import logger from "../../utils/logger.js";

const TAG = "OpenRouter";

export async function chat(messages, tools = []) {
    const apiKey  = config.ai.apiKeys.openrouter || config.ai.apiKey;
    const baseUrl = config.ai.baseUrls.openrouter;
    const model   = config.ai.model;

    if (!apiKey) {
        throw new Error("OpenRouter API key is not configured (OPENROUTER_API_KEY).");
    }

    const payload = {
        model,
        messages,
        temperature:  config.ai.temperature,
        max_tokens:   config.ai.maxTokens,
    };

    if (tools.length > 0) {
        payload.tools       = tools;
        payload.tool_choice = "auto";
    }

    logger.debug(`Sending ${messages.length} messages to OpenRouter (${model})`, TAG);

    let response;
    try {
        response = await axios.post(
            `${baseUrl}/chat/completions`,
            payload,
            {
                headers: {
                    Authorization:   `Bearer ${apiKey}`,
                    "Content-Type":  "application/json",
                    "HTTP-Referer":  "https://github.com/discord-chatbot",
                    "X-Title":       "Discord AI Chatbot",
                },
                timeout: 120_000,
            },
        );
    } catch (error) {
        if (error.response) {
            logger.error(`OpenRouter API Error ${error.response.status}: ${JSON.stringify(error.response.data)}`, TAG);
        }
        throw error;
    }

    const choice       = response.data.choices[0];
    const message      = choice.message;
    const finishReason = choice.finish_reason;

    logger.debug(`Response received. finish_reason=${finishReason}`, TAG);

    const toolCalls = message.tool_calls?.map((tc) => ({
        id:        tc.id,
        name:      tc.function.name,
        arguments: typeof tc.function.arguments === "string"
            ? JSON.parse(tc.function.arguments)
            : tc.function.arguments,
    })) ?? null;

    return {
        content:     message.content ?? null,
        toolCalls:   toolCalls?.length ? toolCalls : null,
        finishReason,
    };
}
