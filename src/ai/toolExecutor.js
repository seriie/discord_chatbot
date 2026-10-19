import logger from "../utils/logger.js";

export async function executeToolCall(toolCall, client, context = {}) {
    const { id: toolCallId, name: toolName, arguments: toolArgs } = toolCall;

    logger.info(`Executing tool: ${toolName}`, "ToolExecutor", toolArgs);

    const tool = client.tools.get(toolName);

    if (!tool) {
        const errorMessage = `Tool "${toolName}" is not registered.`;
        logger.warn(errorMessage, "ToolExecutor");

        return {
            toolCallId,
            toolName,
            result:  JSON.stringify({ error: errorMessage }),
            success: false,
        };
    }

    try {
        const rawResult = await tool.execute(toolArgs, client, context);

        const result =
            typeof rawResult === "string"
                ? rawResult
                : JSON.stringify(rawResult, null, 2);

        logger.info(`Tool "${toolName}" completed successfully.`, "ToolExecutor");
        logger.debug(`Tool result: ${result.slice(0, 200)}`, "ToolExecutor");

        return { toolCallId, toolName, result, success: true };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Tool "${toolName}" threw an error: ${errorMessage}`, "ToolExecutor", error);

        return {
            toolCallId,
            toolName,
            result:  JSON.stringify({ error: `Tool execution failed: ${errorMessage}` }),
            success: false,
        };
    }
}

export async function executeToolCalls(toolCalls, client, context = {}) {
    return Promise.all(
        toolCalls.map((tc) => executeToolCall(tc, client, context)),
    );
}

export function formatToolResultMessage(toolResult) {
    return {
        role:         "tool",
        content:      toolResult.result,
        tool_call_id: toolResult.toolCallId,
        name:         toolResult.toolName,
    };
}
