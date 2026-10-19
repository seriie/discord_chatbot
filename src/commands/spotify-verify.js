import { SlashCommandBuilder } from "discord.js";
import { handleCallback } from "../music/spotify.js";
import { URL } from "url";

export default {
    data: new SlashCommandBuilder()
        .setName("spotify-verify")
        .setDescription("Verifikasi kode Spotify kamu dari URL yang error (can't be reached)")
        .addStringOption(option =>
            option.setName("url")
                .setDescription("URL lengkap yang kamu copy dari browser (harus ada ?code=...)")
                .setRequired(true)
        ),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        
        const urlString = interaction.options.getString("url");
        
        try {
            const parsedUrl = new URL(urlString);
            const code = parsedUrl.searchParams.get("code");
            const state = parsedUrl.searchParams.get("state");
            
            if (!code || !state) {
                return interaction.editReply("❌ URL tidak valid. Pastikan kamu meng-copy seluruh URL yang mengandung 'code' dan 'state'.");
            }
            
            await handleCallback(code, state);
            await interaction.editReply("✅ Yey! Akun Spotify kamu berhasil disambungkan ke bot!");
        } catch (error) {
            console.error("[SpotifyVerifyCommand] Error:", error);
            await interaction.editReply(`❌ Gagal menyambungkan Spotify: ${error.message}`);
        }
    }
};
