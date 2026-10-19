import { SlashCommandBuilder } from "discord.js";
import { getLoginUrl } from "../music/spotify.js";

export default {
    data: new SlashCommandBuilder()
        .setName("spotify-link")
        .setDescription("Dapatkan link untuk menyambungkan akun Spotify kamu ke bot"),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        
        const discordId = interaction.user.id;
        const url = getLoginUrl(discordId);
        
        await interaction.editReply(`Klik link di bawah ini untuk menyambungkan akun Spotify kamu:\n\n${url}\n\n*Catatan: Setelah klik Agree, kalau browser error "can't be reached", copy URL panjang di atas layar lalu gunakan command \`/spotify-verify\` untuk memverifikasi!*`);
    }
};
