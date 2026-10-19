import express from "express";
import logger from "../utils/logger.js";
import { handleCallback } from "../music/spotify.js";

const app = express();
const TAG = "WebServer";

app.get("/auth/spotify/callback", async (req, res) => {
    const { code, state } = req.query;

    if (!code || !state) {
        return res.status(400).send("Missing code or state.");
    }

    try {
        await handleCallback(code, state);
        res.send("<html><body><h2>Spotify Linked Successfully!</h2><p>You can close this window and return to Discord.</p></body></html>");
    } catch (err) {
        logger.error("Error during Spotify callback", TAG, err);
        res.status(500).send("Failed to link Spotify account. " + err.message);
    }
});

export function startWebServer() {
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
        logger.info(`Web server listening on port ${port}`, TAG);
    });
}
