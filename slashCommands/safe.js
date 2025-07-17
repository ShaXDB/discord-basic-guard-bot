const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('safe')
    .setDescription('Güvenli listeye kullanıcı ekler veya çıkarır')
    .addSubcommand(subcommand =>
      subcommand
        .setName('ekle')
        .setDescription('Güvenli listeye kullanıcı ekler')
        .addUserOption(option =>
          option.setName('kullanıcı')
            .setDescription('Eklenecek kullanıcı')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('çıkar')
        .setDescription('Güvenli listeden kullanıcı çıkarır')
        .addUserOption(option =>
          option.setName('kullanıcı')
            .setDescription('Çıkarılacak kullanıcı')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('liste')
        .setDescription('Güvenli listedeki kullanıcıları listeler')),
  async execute(interaction, db) {
    const allowedUsers = process.env.SAFE_ALLOWED_USERS.split(',');
    if (!allowedUsers.includes(interaction.member.id)) {
      return interaction.reply({ content: 'Bu komutu kullanma yetkiniz yok!', ephemeral: 64 });
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'liste') {
      db.all('SELECT * FROM safe_users', async (err, rows) => {
        if (err) {
          console.error('Veritabanı hatası:', err);
          return interaction.reply({ content: 'Güvenli liste alınırken bir hata oluştu!', ephemeral: 64 });
        }

        if (rows.length === 0) {
          return interaction.reply({ content: 'Güvenli listede hiç kullanıcı bulunmuyor.', ephemeral: 64 });
        }

        const embed = new EmbedBuilder()
          .setColor('#00FF00')
          .setTitle('🛡️ Güvenli Liste')
          .setDescription('Aşağıdaki kullanıcılar güvenli listede bulunuyor:')
          .setTimestamp();

        let userList = '';
        for (const row of rows) {
          try {
            const user = await interaction.client.users.fetch(row.user_id);
            userList += `<@${row.user_id}> (${user.tag})\n`;
          } catch {
            userList += `<@${row.user_id}> (Bilinmeyen Kullanıcı)\n`;
          }
        }

        embed.addFields({ name: 'Kullanıcılar', value: userList });
        return interaction.reply({ embeds: [embed], ephemeral: 64 });
      });
      return;
    }

    const user = interaction.options.getUser('kullanıcı');
    const userId = user.id;

    if (subcommand === 'ekle') {
      db.get('SELECT * FROM safe_users WHERE user_id = ?', [userId], (err, row) => {
        if (err) {
          console.error('Veritabanı hatası:', err);
          return interaction.reply({ content: 'Güvenli listeye eklerken bir hata oluştu!', ephemeral: 64 });
        }

        if (row) {
          return interaction.reply({ content: `<@${userId}> zaten güvenli listede bulunuyor!`, ephemeral: 64 });
        }

        db.run('INSERT INTO safe_users (user_id) VALUES (?)', [userId], function(err) {
          if (err) {
            console.error('Veritabanı hatası:', err);
            return interaction.reply({ content: 'Güvenli listeye eklerken bir hata oluştu!', ephemeral: 64 });
          }

          return interaction.reply({ content: `<@${userId}> güvenli listeye eklendi!`, ephemeral: 64 });
        });
      });
    } else if (subcommand === 'çıkar') {
      db.get('SELECT * FROM safe_users WHERE user_id = ?', [userId], (err, row) => {
        if (err) {
          console.error('Veritabanı hatası:', err);
          return interaction.reply({ content: 'Güvenli listeden çıkarırken bir hata oluştu!', ephemeral: 64 });
        }

        if (!row) {
          return interaction.reply({ content: `<@${userId}> güvenli listede bulunmuyor!`, ephemeral: 64 });
        }

        db.run('DELETE FROM safe_users WHERE user_id = ?', [userId], function(err) {
          if (err) {
            console.error('Veritabanı hatası:', err);
            return interaction.reply({ content: 'Güvenli listeden çıkarırken bir hata oluştu!', ephemeral: 64 });
          }

          return interaction.reply({ content: `<@${userId}> güvenli listeden çıkarıldı!`, ephemeral: 64 });
        });
      });
    }
  },
};