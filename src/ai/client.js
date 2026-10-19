import config from "../config/index.js";
import logger from "../utils/logger.js";
import { buildToolDefinitions } from "./prompt.js";
import { executeToolCalls, formatToolResultMessage } from "./toolExecutor.js";

const TAG = "AI";


const providerCache = new Map();

async function loadProvider(providerName) {
    if (providerCache.has(providerName)) {
        return providerCache.get(providerName);
    }

    const supportedProviders = ["huggingface", "openrouter", "openai", "gemini"];

    if (!supportedProviders.includes(providerName)) {
        throw new Error(
            `Unknown AI provider "${providerName}". ` +
            `Supported: ${supportedProviders.join(", ")}`
        );
    }

    const module = await import(`./providers/${providerName}.js`);
    providerCache.set(providerName, module);

    logger.info(`Loaded AI provider: ${providerName}`, TAG);
    return module;
}


export async function chat(messages, tools = []) {
    const provider = await loadProvider(config.ai.provider);
    return provider.chat(messages, tools);
}

export async function runAgentLoop(messages, toolMap, discordClient, context = {}) {
    const toolDefinitions = buildToolDefinitions(toolMap);
    const conversationMsgs = [...messages];
    const toolsUsed        = [];
    const maxIterations    = config.ai.maxToolIterations;

    for (let iteration = 0; iteration < maxIterations; iteration++) {
        logger.debug(`Agent loop iteration ${iteration + 1}/${maxIterations}`, TAG);

        let aiResponse;

        try {
            aiResponse = await chat(conversationMsgs, toolDefinitions);
        } catch (error) {
            logger.error("AI API call failed.", TAG, error);
            throw error;
        }

        const { content, toolCalls, finishReason } = aiResponse;

        if (toolCalls && toolCalls.length > 0) {
            logger.info(
                `AI requested ${toolCalls.length} tool(s): ${toolCalls.map((t) => t.name).join(", ")}`,
                TAG,
            );

            conversationMsgs.push({
                role:       "assistant",
                content:    content ?? "",
                tool_calls: toolCalls.map((tc) => ({
                    id:       tc.id,
                    type:     "function",
                    function: {
                        name:      tc.name,
                        arguments: JSON.stringify(tc.arguments),
                    },
                })),
            });

            const results = await executeToolCalls(toolCalls, discordClient, context);

            for (const result of results) {
                toolsUsed.push(result.toolName);
                conversationMsgs.push(formatToolResultMessage(result));
            }

            continue;
        }

        if (content) {
            logger.debug(`Final response after ${iteration + 1} iteration(s).`, TAG);
            return { response: content, toolsUsed };
        }

        logger.warn(`AI returned no content and no tool calls. finish_reason=${finishReason}`, TAG);
        return {
            response: "I'm sorry, I couldn't generate a response. Please try again.",
            toolsUsed,
        };
    }

    logger.warn(`Max tool iterations (${maxIterations}) reached.`, TAG);
    return {
        response: "I reached the maximum number of steps while processing your request. Please try a simpler question.",
        toolsUsed,
    };
}
