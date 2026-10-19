import axios from "axios";

import config from "../../config/index.js";
import logger from "../../utils/logger.js";

const TAG = "Gemini";


function convertMessages(messages) {
    let systemInstruction = null;
    const contents        = [];

    for (const msg of messages) {
        if (msg.role === "system") {
            systemInstruction = typeof msg.content === "string"
                ? msg.content
                : msg.content.map((p) => p.text ?? "").join("\n");
            continue;
        }

        const role = msg.role === "assistant" ? "model" : "user";

        if (msg.role === "tool") {
            contents.push({
                role: "user",
                parts: [{
                    functionResponse: {
                        name:     msg.toolName ?? "tool",
                        response: { content: msg.content },
                    },
                }],
            });
            continue;
        }

        if (Array.isArray(msg.content)) {
            const parts = msg.content.map((part) => {
                if (part.type === "text") {
                    return { text: part.text };
                }
                if (part.type === "image_url") {
                    return { text: `[Image: ${part.image_url.url}]` };
                }
                return { text: "" };
            });
            contents.push({ role, parts });
        } else {
            contents.push({ role, parts: [{ text: msg.content ?? "" }] });
        }
    }

    return { systemInstruction, contents };
}

function convertTools(tools) {
    if (!tools.length) return [];

    return [{
        functionDeclarations: tools.map((t) => ({
            name:        t.function.name,
            description: t.function.description,
            parameters:  t.function.parameters,
        })),
    }];
}


export async function chat(messages, tools = []) {
    const apiKey  = config.ai.apiKeys.gemini || config.ai.apiKey;
    const baseUrl = config.ai.baseUrls.gemini;
    const model   = config.ai.model;

    if (!apiKey) {
        throw new Error("Gemini API key is not configured (GEMINI_API_KEY).");
    }

    const { systemInstruction, contents } = convertMessages(messages);
    const geminiTools = convertTools(tools);

    const payload = {
        contents,
        generationConfig: {
            temperature:     config.ai.temperature,
            maxOutputTokens: config.ai.maxTokens,
        },
    };

    if (systemInstruction) {
        payload.system_instruction = {
            parts: [{ text: systemInstruction }],
        };
    }

    if (geminiTools.length > 0) {
        payload.tools           = geminiTools;
        payload.tool_config     = { function_calling_config: { mode: "AUTO" } };
    }

    logger.debug(`Sending ${contents.length} turns to Gemini (${model})`, TAG);

    let response;
    try {
        response = await axios.post(
            `${baseUrl}/models/${model}:generateContent?key=${apiKey}`,
            payload,
            {
                headers: { "Content-Type": "application/json" },
                timeout: 120_000,
            },
        );
    } catch (error) {
        if (error.response) {
            logger.error(`Gemini API Error ${error.response.status}: ${JSON.stringify(error.response.data)}`, TAG);
        }
        throw error;
    }

    const candidate    = response.data.candidates[0];
    const finishReason = candidate.finishReason ?? "STOP";
    const parts        = candidate.content?.parts ?? [];

    logger.debug(`Response received. finishReason=${finishReason}`, TAG);

    const textParts = parts.filter((p) => p.text).map((p) => p.text);
    const content   = textParts.length > 0 ? textParts.join("") : null;

    const funcParts = parts.filter((p) => p.functionCall);
    const toolCalls = funcParts.length > 0
        ? funcParts.map((p, idx) => ({
              id:        `gemini_call_${idx}`,
              name:      p.functionCall.name,
              arguments: p.functionCall.args ?? {},
          }))
        : null;

    return { content, toolCalls, finishReason };
}
