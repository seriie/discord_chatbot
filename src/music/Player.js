import {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    VoiceConnectionStatus,
    StreamType
} from "@discordjs/voice";
import play from "play-dl";
import ytDlp from "youtube-dl-exec";
import logger from "../utils/logger.js";
import { globalSpotify } from "./spotify.js";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const ytDlpPath = path.resolve(process.cwd(), "node_modules", "youtube-dl-exec", "bin", "yt-dlp");
if (!fs.existsSync(ytDlpPath)) {
    logger.info("yt-dlp binary is missing! Downloading it now...", "MusicPlayer");
    try {
        execSync("node node_modules/youtube-dl-exec/scripts/postinstall.js", { stdio: "inherit" });
        logger.info("yt-dlp binary downloaded successfully.", "MusicPlayer");
    } catch (e) {
        logger.error("Failed to download yt-dlp binary.", "MusicPlayer", e);
    }
}

const ytDlpExec = ytDlp.exec;
const TAG = "MusicPlayer";

export const queues = new Map();

function getQueue(guildId) {
    if (!queues.has(guildId)) {
        const player = createAudioPlayer();
        
        player.on(AudioPlayerStatus.Idle, async () => {
            const q = queues.get(guildId);
            if (!q) return;
            
            if (q.loopMode === "track" && q.current) {
                q.queue.unshift(q.current);
            } else if (q.loopMode === "queue" && q.current) {
                q.queue.push(q.current);
            }

            if (q.queue.length > 0) {
                const nextTrack = q.queue.shift();
                await playTrack(guildId, nextTrack);
            } else {
                if (q.current && q.current.spotifyId) {
                    try {
                        logger.info(`Queue empty. Fetching autoplay recommendation for ${q.current.title}`, TAG);
                        const recs = await globalSpotify.getRecommendations({ seed_tracks: [q.current.spotifyId], limit: 1 });
                        if (recs.body.tracks.length > 0) {
                            const rec = recs.body.tracks[0];
                            const searchStr = `${rec.name} ${rec.artists.map(a => a.name).join(" ")}`;
                            const ytSearch = await play.search(searchStr, { limit: 1 });
                            if (ytSearch.length > 0) {
                                await playTrack(guildId, {
                                    url: ytSearch[0].url,
                                    title: rec.name,
                                    artist: rec.artists.map(a => a.name).join(", "),
                                    spotifyId: rec.id,
                                    requester: "Autoplay"
                                });
                                return;
                            }
                        }
                    } catch (err) {
                        logger.error("Autoplay failed.", TAG, err);
                    }
                }
                
                q.current = null;
                setTimeout(() => {
                    const checkQ = queues.get(guildId);
                    if (checkQ && checkQ.player.state.status === AudioPlayerStatus.Idle) {
                        checkQ.connection.destroy();
                        queues.delete(guildId);
                        logger.info(`Left voice channel in ${guildId} due to inactivity.`, TAG);
                    }
                }, 60000);
            }
        });

        player.on("error", (error) => {
            logger.error("AudioPlayer Error", TAG, error);
            player.emit(AudioPlayerStatus.Idle);
        });

        queues.set(guildId, {
            connection: null,
            player,
            queue: [],
            current: null,
            textChannel: null,
            loopMode: "off"
        });
    }
    return queues.get(guildId);
}

export function setLoopMode(guildId, mode) {
    const q = getQueue(guildId);
    q.loopMode = mode;
    return q.loopMode;
}

export async function joinVoice(channel) {
    const q = getQueue(channel.guild.id);
    if (!q.connection || q.connection.state.status === VoiceConnectionStatus.Destroyed) {
        q.connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
        });
        q.connection.subscribe(q.player);
    }
    return q;
}

async function playTrack(guildId, track) {
    const q = queues.get(guildId);
    if (!q) return;

    const trySoundCloudFallback = async () => {
        try {
            const scQuery = `scsearch1:${track.title} ${track.artist || ""}`;
            logger.info(`YouTube blocked. Falling back to SoundCloud: ${scQuery}`, TAG);

            const subprocessSc = ytDlpExec(scQuery, {
                o: "-",
                q: "",
                f: "bestaudio/best",
                limitRate: "2M",
                rmCacheDir: true,
                noWarnings: true,
                callHome: false,
            }, { stdio: ["ignore", "pipe", "pipe"] });

            subprocessSc.catch((err) => {
                logger.error(`SoundCloud fallback failed for ${track.title}`, TAG, err);
                if (q.textChannel) {
                    q.textChannel.send(`⚠️ Gagal memutar **${track.title}**. Semua sumber diblokir. Lanjut ke lagu berikutnya...`);
                }
                q.player.emit(AudioPlayerStatus.Idle);
            });

            if (!subprocessSc.stdout) throw new Error("Failed to start yt-dlp for SoundCloud.");

            const resource = createAudioResource(subprocessSc.stdout, {
                inputType: StreamType.Arbitrary,
            });

            q.current = track;
            q.player.play(resource);
            logger.info(`Playing (SoundCloud fallback): ${track.title} in ${guildId}`, TAG);
            if (q.textChannel) {
                q.textChannel.send(`🎶 Now playing (via SoundCloud): **${track.title}** ${track.artist ? `by ${track.artist}` : ""} (Requested by ${track.requester})`);
            }
        } catch (fallbackErr) {
            logger.error(`Both engines failed for ${track.url}`, TAG, fallbackErr);
            if (q.textChannel) {
                q.textChannel.send(`⚠️ Gagal memutar **${track.title}**. Lanjut ke lagu berikutnya...`);
            }
            q.player.emit(AudioPlayerStatus.Idle);
        }
    };

    try {
        const subprocess = ytDlpExec(track.url, {
            o: "-",
            q: "",
            f: "bestaudio/best",
            limitRate: "2M",
            rmCacheDir: true,
            noWarnings: true,
            callHome: false,
        }, { stdio: ["ignore", "pipe", "pipe"] });

        subprocess.catch(async (ytErr) => {
            logger.error(`yt-dlp execution failed: ${ytErr.message || ytErr}`, TAG);
            await trySoundCloudFallback();
        });

        if (!subprocess.stdout) {
            throw new Error("Failed to start yt-dlp process.");
        }

        const resource = createAudioResource(subprocess.stdout, {
            inputType: StreamType.Arbitrary,
        });

        q.current = track;
        q.player.play(resource);
        logger.info(`Playing: ${track.title} in ${guildId} using yt-dlp`, TAG);

        if (q.textChannel) {
            q.textChannel.send(`🎶 Now playing: **${track.title}** ${track.artist ? `by ${track.artist}` : ""} (Requested by ${track.requester})`);
        }
    } catch (err) {
        logger.error(`yt-dlp init failed for ${track.url}, falling back to SoundCloud`, TAG, err);
        await trySoundCloudFallback();
    }
}

export async function addToQueue(guildId, query, requester, textChannel, discordUserId) {
    const q = getQueue(guildId);
    q.textChannel = textChannel;

    let tracksToAdd = [];
    
    if (play.sp_validate(query) === "track") {
        if (play.is_expired()) await play.refreshToken();
        const spData = await play.spotify(query);
        const searchStr = `${spData.name} ${spData.artists.map(a => a.name).join(" ")}`;
        const ytSearch = await play.search(searchStr, { limit: 1 });
        if (ytSearch.length > 0) {
            tracksToAdd.push({
                url: ytSearch[0].url,
                title: spData.name,
                artist: spData.artists.map(a => a.name).join(", "),
                spotifyId: spData.id,
                requester
            });
        }
    } else if (play.sp_validate(query) === "playlist") {
        if (play.is_expired()) await play.refreshToken();
        const playlist = await play.spotify(query);
        const tracks = await playlist.all_tracks();
        for (const track of tracks.slice(0, 50)) {
            const searchStr = `${track.name} ${track.artists.map(a => a.name).join(" ")}`;
            const ytSearch = await play.search(searchStr, { limit: 1 });
            if (ytSearch.length > 0) {
                tracksToAdd.push({
                    url: ytSearch[0].url,
                    title: track.name,
                    artist: track.artists.map(a => a.name).join(", "),
                    spotifyId: track.id,
                    requester
                });
            }
        }
    } else if (query.startsWith("http")) {
        const ytInfo = await play.video_info(query);
        tracksToAdd.push({
            url: ytInfo.video_details.url,
            title: ytInfo.video_details.title,
            artist: ytInfo.video_details.channel.name,
            spotifyId: null,
            requester
        });
    } else {
        const ytSearch = await play.search(query, { limit: 1 });
        if (ytSearch.length > 0) {
            tracksToAdd.push({
                url: ytSearch[0].url,
                title: ytSearch[0].title,
                artist: ytSearch[0].channel.name,
                spotifyId: null,
                requester
            });
        }
    }

    if (tracksToAdd.length === 0) throw new Error("Could not find any tracks.");

    q.queue.push(...tracksToAdd);

    if (q.player.state.status !== AudioPlayerStatus.Playing) {
        const nextTrack = q.queue.shift();
        await playTrack(guildId, nextTrack);
    }

    return tracksToAdd;
}

export function skipTrack(guildId) {
    const q = queues.get(guildId);
    if (q && q.player.state.status === AudioPlayerStatus.Playing) {
        q.player.stop();
        return true;
    }
    return false;
}

export function stopMusic(guildId) {
    const q = queues.get(guildId);
    if (q) {
        q.queue = [];
        q.player.stop();
        if (q.connection) {
            q.connection.destroy();
        }
        queues.delete(guildId);
        return true;
    }
    return false;
}
