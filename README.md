# discord_chatbot

A Discord bot that runs an LLM agent with tool access. It replies in DMs, when mentioned, or in channels you whitelist, and it can call tools to play music, remember things about users, check the weather, store images, and read Spotify playlists.

The AI layer is provider-agnostic. Set `AI_PROVIDER` to `huggingface`, `openrouter`, `openai`, or `gemini` and it uses the same OpenAI-style chat-completions with tool calling.

## What it does

- **AI chat with tools.** Each message goes through an agent loop of up to `AI_MAX_TOOL_ITERATIONS` steps. The model can call tools, read the results, and keep going before it answers.
- **Memory.** Per-channel message history for short-term context, plus per-user key/value facts the bot saves when you tell it something about yourself.
- **Adaptive personality.** A per-user persona (`tone`, `style`, `language`, `notes`) that the model can update itself through `adapt_personality`.
- **Music.** Play, skip, stop, and loop YouTube or Spotify tracks in a voice channel.
- **Spotify accounts.** OAuth linking so a user can connect their own Spotify account.
- **Images.** Save image attachments with a description, search them later, and edit the descriptions.
- **Weather.** Current conditions from Open-Meteo, no API key needed.

## Requirements

- Node.js 18 or newer
- A database Prisma supports. The schema ships configured for MySQL. To use something else, change the `datasource` block in `prisma/schema.prisma` and the URL handling in `prisma.config.ts`.
- A Discord application with a bot user

In the Discord Developer Portal, enable the **Message Content** intent, and the **Server Members** and **Presence** intents (the bot requests them at login).

## Setup

Install dependencies:

```bash
npm install
```

Create a `.env` in the project root:

```env
DISCORD_TOKEN=...
CLIENT_ID=...
OWNER_ID=...            # optional, for owner-only commands
ALLOWED_CHANNELS=       # comma-separated channel IDs that get replies without a mention

AI_PROVIDER=gemini      # huggingface | openrouter | openai | gemini
AI_MODEL=...
AI_TEMPERATURE=0.7
AI_MAX_TOKENS=4096
AI_MAX_TOOL_ITERATIONS=5
AI_CONTEXT_WINDOW=20
AI_VISION_ENABLED=false

HF_API_KEY=...
OPENROUTER_API_KEY=...
OPENAI_API_KEY=...
GEMINI_API_KEY=...

DATABASE_URL="mysql://user:password@host:3306/dbname"

SPOTIFY_CLIENT_ID=...        # optional
SPOTIFY_CLIENT_SECRET=...    # optional
SPOTIFY_REDIRECT_URI=http://localhost:3000/auth/spotify/callback

IMAGES_DIR=./storage/images
LOG_LEVEL=info
PORT=3000
```

Only the API key for the active provider is required. If `AI_API_KEY` is set, it takes precedence over `HF_API_KEY`.

Generate the Prisma client and create the schema:

```bash
npx prisma generate
npx prisma db push
```

`npm run setup` runs install, generate, and push in one go.

Start the bot:

```bash
npm start      # node src/index.js
npm run dev    # nodemon, restarts on change
```

Slash commands are registered globally when the bot comes online. To push them separately, run `node scripts/deploy-commands.js`.

## Commands

| Command | Description |
| --- | --- |
| `/chat` | Send a message to the AI outside of normal chat |
| `/ping` | Latency and status |
| `/memory clear` | Clear this channel's conversation history |
| `/memory list` | List the facts saved about you |
| `/play` | Play a track or playlist from Spotify or YouTube |
| `/play-loop` | Play a track and loop it immediately |
| `/skip` | Skip the current track |
| `/stop` | Stop playback and clear the queue |
| `/loop` | Set the loop mode to off, track, or queue |
| `/spotify-link` | Get the URL to link your Spotify account |
| `/spotify-verify` | Finish Spotify linking from a callback URL |

The bot replies to DMs, to messages that mention it, and to messages in the channels listed in `ALLOWED_CHANNELS`. Image attachments on those messages are passed to the model when `AI_VISION_ENABLED=true`.

## Tools

The model picks from these. Each one is a file in `src/tools/`:

`play_music`, `skip_music`, `stop_music`, `loop_music`, `link_spotify`, `get_spotify_playlist`, `spotify_verify_url`, `save_memory`, `get_memory`, `adapt_personality`, `save_image`, `get_images`, `update_image_description`, `download_video`, `get_weather`, `search_users`.

The system prompt and the tool schemas are built at runtime from whatever is in `src/tools/`, so dropping a new file there is enough to expose a new tool.

## Project layout

```
src/
  ai/         provider clients, agent loop, prompt building, tool dispatch
  commands/   slash command definitions
  config/     env-backed config objects
  database/   Prisma accessors for users, conversations, memories, images, personas
  events/     discord.js handlers (messageCreate, interactionCreate, ready)
  music/      voice player and Spotify auth
  tools/      AI-callable tools
  utils/      logger, dynamic loader, helpers
  web/        Express server for the Spotify OAuth callback
prisma/       schema
scripts/      standalone slash command deploy script
```

## Notes

- The bot logs `uncaughtException` and `unhandledRejection` and keeps running instead of exiting.
- Providers are loaded lazily from `src/ai/providers/` by name, so only the one you use is imported.
- `.env` is ignored by git.
