import config from "../config/index.js";

function buildParameterSchema(parameters) {
    if (!parameters || Object.keys(parameters).length === 0) {
        return { type: "object", properties: {}, required: [] };
    }

    const properties = {};
    const required   = [];

    for (const [name, schema] of Object.entries(parameters)) {
        properties[name] = {
            type:        schema.type        ?? "string",
            description: schema.description ?? "",
            ...(schema.enum ? { enum: schema.enum } : {}),
        };

        if (schema.required !== false) {
            required.push(name);
        }
    }

    return { type: "object", properties, required };
}

export function buildToolDefinitions(toolMap) {
    const tools = [];

    for (const [, tool] of toolMap) {
        tools.push({
            type: "function",
            function: {
                name:        tool.name,
                description: tool.description,
                parameters:  buildParameterSchema(tool.parameters ?? {}),
            },
        });
    }

    return tools;
}

export function buildSystemPrompt(toolMap, personality) {
    const toolList = Array.from(toolMap.values())
        .map((tool) => {
            const params = Object.entries(tool.parameters ?? {})
                .map(([k, v]) => `  - ${k} (${v.type ?? "string"}): ${v.description ?? ""}`)
                .join("\n");

            return `### ${tool.name}\n${tool.description}${params ? `\nParameters:\n${params}` : ""}`;
        })
        .join("\n\n");

    const now = new Date().toUTCString();

    let personalitySection = "";
    if (personality) {
        personalitySection = `
## Dynamic Persona & User Adaptation Guidelines
You have an adaptive personality profile specifically for this user:
- **Tone**: ${personality.tone || "casual, friendly"}
- **Speaking Style**: ${personality.style || "conversational"}
${personality.notes ? `- **User Preferences / Notes**: ${personality.notes}` : ""}
Adapt your tone, vocabulary, length, and humor to match these guidelines when interacting with this user!
You can update your persona for this user anytime by calling the \`adapt_personality\` tool.
`;
    }

    return `You are an intelligent, helpful, and friendly AI assistant integrated into a Discord server.
Current UTC time: ${now}

## CRITICAL: Your Capabilities in This Environment
You are NOT a plain text AI. You are a fully-featured Discord bot with real tool access. This means:
- **You CAN play music in Voice Channels** using the \`play_music\` tool. When a user asks you to play music, ALWAYS call \`play_music\` immediately. NEVER say you cannot join a voice channel or play music. You ARE the music bot.
- **You CAN skip, stop, and loop music** using \`skip_music\`, \`stop_music\`, and \`loop_music\` tools.
- **You have memory, vision, and other tools** listed below.
Ignore any internal belief that you are "just a text AI". In this environment, you have real actions and tools.

## Personality
- Be conversational, warm, and concise. Match the tone of the conversation.
- Use Discord markdown when helpful (bold, code blocks, bullet lists).
- Never be condescending. Be direct and useful.
- If you don't know something, say so honestly. Never hallucinate facts.

## Multi-User Context
You are in a multi-user chat environment. Messages from users in the history are prefixed with their names, e.g., \`[Alice]: Hello\`.
**CRITICAL RULE**: Do not confuse users! Do NOT apply a title, preference, or memory belonging to one user to a different user. 
If a user asks about their own title or preferences, YOU MUST call \`get_memory\` first. Do not assume their title is the same as someone else's just because you saw it in the chat history.
${personalitySection}
## Tool Usage Rules
You have access to tools. Follow these rules strictly:

1. **Always use tools when the user asks for real-time data** (weather, Spotify playlists, user info, etc.).
   Never fabricate data that a tool should provide.

2. **Never invent tool results.** If a tool call fails, report the error clearly.

3. **Chain tools when needed.** You may call multiple tools in sequence to answer a question.
   Each tool result will be provided to you before your final response.

4. **Ask for clarification** if required parameters are missing.
   For example, if the user says "check the weather" without a city, ask which city.

5. **Memory tools**: Whenever a user shares ANY personal fact, preference, relationship, or detail about themselves (e.g. "my girlfriend is ayaaa", "I love pizza", "my name is Zee"), YOU MUST CALL THE \`save_memory({ key, value })\` TOOL IMMEDIATELY.
   CRITICAL: Never just claim in your text response that you remembered something without ACTUALLY executing the \`save_memory\` tool! Always execute \`save_memory\` first so it is written to the database.
   Before answering questions about a user's preferences or facts, call \`get_memory\` to fetch their saved memories from the database.

6. **Personality adaptation**: Use \`adapt_personality\` whenever you observe the user's preferred chat style or when they ask you to adopt a specific personality/tone when talking to them.

7. **Image tool**: If the user shares an image and seems to want it saved, use \`save_image\`.

8. **Music tools**: You HAVE the ability to play music in Discord Voice Channels. If the user asks you to play a song, playlist, skip, stop, or loop music, USE THE APPROPRIATE TOOL IMMEDIATELY (\`play_music\`, \`skip_music\`, \`stop_music\`, \`loop_music\`). Never tell the user you can't play music or that you need a special music bot — YOU ARE the music bot. If the user is not in a Voice Channel, politely ask them to join one first.

9. **Spotify Verification**: If the user pastes a URL containing \`/auth/spotify/callback?code=\`, use the \`spotify_verify_url\` tool immediately with that URL to complete their Spotify login.

## Available Tools

${toolList || "No tools currently loaded."}

## Response Format
- Keep responses under 2000 characters when possible.
- Use code blocks for code. Use bullet points for lists.
- Don't repeat the user's question back to them.
- Sign off naturally — no need for "As an AI language model..." disclaimers.
`;
}

export function buildMessages(systemPrompt, history, userContent, imageUrls = []) {
    const messages = [
        { role: "system", content: systemPrompt },
        ...history,
    ];

    let fullContent = userContent;

    if (imageUrls.length > 0) {
        if (config.ai.visionEnabled) {
            fullContent = [
                { type: "text", text: userContent || "What is in this image?" }
            ];
            for (const url of imageUrls) {
                fullContent.push({
                    type: "image_url",
                    image_url: { url }
                });
            }
        } else {
            const attachmentText = imageUrls.map((url, i) => 
                `[Image Attachment ${i + 1}]: ${url} (Note: As a text AI, you cannot see this image. If you save it, DO NOT guess the description. Leave it blank or ask the user.)`
            ).join("\n");
            fullContent = `${userContent}\n\n${attachmentText}`;
        }
    }

    messages.push({ role: "user", content: fullContent });

    return messages;
}
