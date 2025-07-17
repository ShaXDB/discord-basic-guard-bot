const { EmbedBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
  name: 'safe',
  description: 'Güvenli listeye kullanıcı ekler veya çıkarır',
  async execute(message, args, db) {
    const allowedUsers = process.env.SAFE_ALLOWED_USERS.split(',');
    if (!allowedUsers.includes(message.member.id)) {
      return message.reply('Bu komutu kullanma yetkiniz yok!');
    }

    if (args.length < 2) {
      return message.reply('Kullanım: !safe ekle/çıkar/liste <kullanıcı ID>');
    }

    const action = args[0].toLowerCase();
    
    if (action === 'liste') {
      db.all('SELECT * FROM safe_users', async (err, rows) => {
        if (err) {
          console.error('Veritabanı hatası:', err);
          return message.reply('Güvenli liste alınırken bir hata oluştu!');
        }

        if (rows.length === 0) {
          return message.reply('Güvenli listede hiç kullanıcı bulunmuyor.');
        }

        const embed = new EmbedBuilder()
          .setColor('#00FF00')
          .setTitle('🛡️ Güvenli Liste')
          .setDescription('Aşağıdaki kullanıcılar güvenli listede bulunuyor:')
          .setTimestamp();

        let userList = '';
        for (const row of rows) {
          try {
            const user = await message.client.users.fetch(row.user_id);
            userList += `<@${row.user_id}> (${user.tag})\n`;
          } catch {
            userList += `<@${row.user_id}> (Bilinmeyen Kullanıcı)\n`;
          }
        }

        embed.addFields({ name: 'Kullanıcılar', value: userList });
        return message.reply({ embeds: [embed] });
      });
      return;
    }

    const userId = args[1];
    if (!/^\d+$/.test(userId)) {
      return message.reply('Geçerli bir kullanıcı ID\'si girmelisiniz!');
    }

    if (action === 'ekle') {
      db.get('SELECT * FROM safe_users WHERE user_id = ?', [userId], (err, row) => {
        if (err) {
          console.error('Veritabanı hatası:', err);
          return message.reply('Güvenli listeye eklerken bir hata oluştu!');
        }

        if (row) {
          return message.reply(`<@${userId}> zaten güvenli listede bulunuyor!`);
        }

        db.run('INSERT INTO safe_users (user_id) VALUES (?)', [userId], function(err) {
          if (err) {
            console.error('Veritabanı hatası:', err);
            return message.reply('Güvenli listeye eklerken bir hata oluştu!');
          }

          return message.reply(`<@${userId}> güvenli listeye eklendi!`);
        });
      });
    } else if (action === 'çıkar') {
      db.get('SELECT * FROM safe_users WHERE user_id = ?', [userId], (err, row) => {
        if (err) {
          console.error('Veritabanı hatası:', err);
          return message.reply('Güvenli listeden çıkarırken bir hata oluştu!');
        }

        if (!row) {
          return message.reply(`<@${userId}> güvenli listede bulunmuyor!`);
        }

        db.run('DELETE FROM safe_users WHERE user_id = ?', [userId], function(err) {
          if (err) {
            console.error('Veritabanı hatası:', err);
            return message.reply('Güvenli listeden çıkarırken bir hata oluştu!');
          }

          return message.reply(`<@${userId}> güvenli listeden çıkarıldı!`);
        });
      });
    } else {
      return message.reply('Geçerli bir işlem belirtmelisiniz: ekle, çıkar veya liste');
    }
  },
};