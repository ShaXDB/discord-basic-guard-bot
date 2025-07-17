require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Collection, Events, REST, Routes, PermissionsBitField, EmbedBuilder } = require('discord.js');
const { joinVoiceChannel } = require('@discordjs/voice');
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const cron = require('node-cron');
const db = new sqlite3.Database('./database.sqlite', (err) => {
  if (err) {
    console.error('Veritabanı bağlantı hatası:', err.message);
  } else {
    console.log('Veritabanına bağlandı');

    db.run(`CREATE TABLE IF NOT EXISTS safe_users (
      user_id TEXT PRIMARY KEY
    )`);
    
    db.run(`CREATE TABLE IF NOT EXISTS limits (
      user_id TEXT PRIMARY KEY,
      ban_count INTEGER DEFAULT 0,
      kick_count INTEGER DEFAULT 0,
      role_remove_count INTEGER DEFAULT 0,
      role_add_count INTEGER DEFAULT 0,
      channel_delete_count INTEGER DEFAULT 0,
      channel_edit_count INTEGER DEFAULT 0,
      channel_create_count INTEGER DEFAULT 0,
      role_create_count INTEGER DEFAULT 0,
      role_delete_count INTEGER DEFAULT 0,
      role_edit_count INTEGER DEFAULT 0,
      server_name_edit_count INTEGER DEFAULT 0,
      vanity_url_edit_count INTEGER DEFAULT 0,
      emoji_sticker_delete_count INTEGER DEFAULT 0,
      unban_count INTEGER DEFAULT 0,
      timeout_count INTEGER DEFAULT 0,
      untimeout_count INTEGER DEFAULT 0,
      last_reset DATE DEFAULT CURRENT_DATE
    )`);
  }
});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildEmojisAndStickers,
    GatewayIntentBits.GuildIntegrations,
    GatewayIntentBits.GuildWebhooks,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel, Partials.Message, Partials.User, Partials.GuildMember]
});


client.commands = new Collection();
client.slashCommands = new Collection();


const commandsPath = path.join(__dirname, 'commands');
if (!fs.existsSync(commandsPath)) {
  fs.mkdirSync(commandsPath, { recursive: true });
}

const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if ('name' in command && 'execute' in command) {
    client.commands.set(command.name, command);
  }
}


const slashCommandsPath = path.join(__dirname, 'slashCommands');
if (!fs.existsSync(slashCommandsPath)) {
  fs.mkdirSync(slashCommandsPath, { recursive: true });
}

const slashCommandFiles = fs.readdirSync(slashCommandsPath).filter(file => file.endsWith('.js'));
const slashCommands = [];

for (const file of slashCommandFiles) {
  const filePath = path.join(slashCommandsPath, file);
  const command = require(filePath);
  if ('data' in command && 'execute' in command) {
    client.slashCommands.set(command.data.name, command);
    slashCommands.push(command.data.toJSON());
  }
}


client.once(Events.ClientReady, async () => {
  try {
    console.log(`${client.user.tag} olarak giriş yapıldı!`);
    
    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    
    console.log('Slash komutları yükleniyor...');
    
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: slashCommands },
    );
    
    console.log('Slash komutları başarıyla yüklendi!');
    

    const guild = client.guilds.cache.get(process.env.GUILD_ID);
    if (guild) {
      try {
        const voiceChannel = await guild.channels.fetch(process.env.VOICE_CHANNEL_ID);
        if (voiceChannel) {
          await joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator,
          });
          console.log(`${voiceChannel.name} ses kanalına başarıyla katıldı!`);
        } else {
          console.error('Belirtilen ses kanalı bulunamadı!');
        }
      } catch (error) {
        console.error('Ses kanalına katılırken hata:', error);
      }
    } else {
      console.error('Belirtilen sunucu bulunamadı!');
    }
  } catch (error) {
    console.error('Slash komutları yüklenirken hata oluştu:', error);
  }
});

client.on(Events.MessageCreate, async message => {
  if (!message.content.startsWith(process.env.PREFIX) || message.author.bot) return;
  
  const args = message.content.slice(process.env.PREFIX.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();
  
  const command = client.commands.get(commandName);
  
  if (!command) return;
  
  try {
    await command.execute(message, args, db);
  } catch (error) {
    console.error(error);
    await message.reply('Komut çalıştırılırken bir hata oluştu!');
  }
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;
  
  const command = client.slashCommands.get(interaction.commandName);
  
  if (!command) return;
  
  try {
    await command.execute(interaction, db);
  } catch (error) {
    console.error(error);
    await interaction.reply({ content: 'Komut çalıştırılırken bir hata oluştu!', ephemeral: 64 });
  }
});


async function isSafeUser(userId) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM safe_users WHERE user_id = ?', [userId], (err, row) => {
      if (err) {
        console.error('Güvenli kullanıcı kontrolünde hata:', err);
        reject(err);
      } else {
        resolve(row ? true : false);
      }
    });
  });
}


async function hasModerationPermissions(guild, userId) {
  try {
    const member = await guild.members.fetch(userId);
    if (!member) return false;
    

    const moderationPermissions = [
      PermissionsBitField.Flags.BanMembers,
      PermissionsBitField.Flags.KickMembers,
      PermissionsBitField.Flags.ManageRoles,
      PermissionsBitField.Flags.ManageChannels,
      PermissionsBitField.Flags.ManageGuild,
      PermissionsBitField.Flags.Administrator,
      PermissionsBitField.Flags.ModerateMembers
    ];
    
    return moderationPermissions.some(permission => 
      member.permissions.has(permission)
    );
  } catch (error) {
    console.error('Yetki kontrolünde hata:', error);
    return false;
  }
}


async function checkAndIncrementLimit(userId, limitType, maxLimit) {
  return new Promise((resolve, reject) => {

    db.get('SELECT * FROM limits WHERE user_id = ?', [userId], (err, row) => {
      if (err) {
        console.error('Limit kontrolünde hata:', err);
        reject(err);
        return;
      }
      
      if (!row) {

        db.run('INSERT INTO limits (user_id) VALUES (?)', [userId], function(err) {
          if (err) {
            console.error('Kullanıcı kaydı oluşturulurken hata:', err);
            reject(err);
            return;
          }
          

          incrementLimit(userId, limitType, 1, maxLimit, resolve, reject);
        });
      } else {

        const currentCount = row[limitType] || 0;
        incrementLimit(userId, limitType, currentCount + 1, maxLimit, resolve, reject);
      }
    });
  });
}


function incrementLimit(userId, limitType, newCount, maxLimit, resolve, reject) {
  db.run(`UPDATE limits SET ${limitType} = ? WHERE user_id = ?`, [newCount, userId], function(err) {
    if (err) {
      console.error('Limit artırılırken hata:', err);
      reject(err);
      return;
    }
    

    const limitExceeded = newCount >= maxLimit;
    resolve({ count: newCount, limitExceeded, maxLimit });
  });
}


async function sendWarningDM(userId, actionType, count, maxLimit) {
  try {
    const user = await client.users.fetch(userId);
    await user.send({
      embeds: [
        new EmbedBuilder()
          .setColor('#FF0000')
          .setTitle('⚠️ Güvenlik Uyarısı')
          .setDescription(`**${actionType}** işlemi gerçekleştirdiniz (${count}/${maxLimit})\n\nLütfen bot komutlarını kullanınız. Limit aşımı durumunda tüm rolleriniz alınacaktır!`)
          .setTimestamp()
      ]
    });
    console.log(`${userId} kullanıcısına DM gönderildi: ${actionType}`);
  } catch (error) {
    console.error('DM gönderilirken hata:', error);
    

    try {
      const backupChannelId = '1381640785216143487';
      const channel = await client.channels.fetch(backupChannelId);
      if (channel) {
        await channel.send({
          content: `<@${userId}>`,
          embeds: [
            new EmbedBuilder()
              .setColor('#FF0000')
              .setTitle('⚠️ Güvenlik Uyarısı')
              .setDescription(`**${actionType}** işlemi gerçekleştirdiniz (${count}/${maxLimit})\n\nLütfen bot komutlarını kullanınız. Limit aşımı durumunda tüm rolleriniz alınacaktır!`)
              .setTimestamp()
          ]
        });
        console.log(`${userId} kullanıcısına yedek kanal üzerinden mesaj gönderildi: ${actionType}`);
      }
    } catch (channelError) {
      console.error('Yedek kanala mesaj gönderilirken hata:', channelError);
    }
  }
}


async function sendLogMessage(guild, userId, actionType, count, maxLimit, limitExceeded = false) {
  const logChannelId = process.env.GUARD_LOG_CHANNEL_ID;
  if (!logChannelId) return;
  
  try {
    const logChannel = await guild.channels.fetch(logChannelId);
    if (!logChannel) return;
    
    const user = await client.users.fetch(userId);
    
    const embed = new EmbedBuilder()
      .setColor(limitExceeded ? '#FF0000' : '#FFA500')
      .setTitle(limitExceeded ? '🚨 Limit Aşımı!' : '⚠️ Güvenlik Uyarısı')
      .setDescription(`<@${userId}> (${user.tag}) kullanıcısı **${actionType}** işlemi gerçekleştirdi (${count}/${maxLimit})`)
      .setTimestamp();
    
    if (limitExceeded) {
      embed.addFields({ name: 'Alınan Önlem', value: 'Kullanıcının tüm rolleri alındı!' });
  
      const ownerRole = guild.roles.cache.find(role => role.name.toLowerCase().includes('kurucu'));
      if (ownerRole) {
        await logChannel.send({ content: `<@&${ownerRole.id}> Dikkat! Güvenlik ihlali tespit edildi!`, embeds: [embed] });
      } else {
        await logChannel.send({ embeds: [embed] });
      }
    } else {
      await logChannel.send({ embeds: [embed] });
    }
  } catch (error) {
    console.error('Log mesajı gönderilirken hata:', error);
  }
}


async function removeAllRoles(guild, memberId) {
  try {
    const member = await guild.members.fetch(memberId);
    if (!member) return false;
    

    const botMember = guild.members.cache.get(client.user.id);
    const botRole = botMember.roles.highest;
    

    for (const role of member.roles.cache.values()) {
      if (role.id !== guild.id && role.position < botRole.position) {
        await member.roles.remove(role);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Roller alınırken hata:', error);
    return false;
  }
}


client.on(Events.GuildBanAdd, async ban => {
  const auditLogs = await ban.guild.fetchAuditLogs({ type: 22, limit: 1 });
  const banLog = auditLogs.entries.first();
  
  if (!banLog || Date.now() - banLog.createdTimestamp > 5000) return;
  
  const executor = banLog.executor;
  if (executor.bot || await isSafeUser(executor.id) || !await hasModerationPermissions(ban.guild, executor.id)) return;
  
  const result = await checkAndIncrementLimit(executor.id, 'ban_count', parseInt(process.env.BAN_LIMIT));
  
  await sendWarningDM(executor.id, 'Sağ tık ban', result.count, result.maxLimit);
  await sendLogMessage(ban.guild, executor.id, 'Sağ tık ban', result.count, result.maxLimit, result.limitExceeded);
  
  if (result.limitExceeded) {
    await removeAllRoles(ban.guild, executor.id);
  }
});


client.on(Events.GuildBanRemove, async ban => {
  try {
    const auditLogs = await ban.guild.fetchAuditLogs({ type: 23, limit: 1 });
    const unbanLog = auditLogs.entries.first();
    
    if (!unbanLog || Date.now() - unbanLog.createdTimestamp > 5000) return;
    
    const executor = unbanLog.executor;
    if (executor.bot || await isSafeUser(executor.id) || !await hasModerationPermissions(ban.guild, executor.id)) return;
    
    const result = await checkAndIncrementLimit(executor.id, 'unban_count', parseInt(process.env.UNBAN_LIMIT));
    
    await sendWarningDM(executor.id, 'Sağ tık unban', result.count, result.maxLimit);
    await sendLogMessage(ban.guild, executor.id, 'Sağ tık unban', result.count, result.maxLimit, result.limitExceeded);
    
    if (result.limitExceeded) {
      await removeAllRoles(ban.guild, executor.id);
    }
  } catch (error) {
    console.error('Unban işlemi sırasında hata:', error);
  }
});


client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {

  if (oldMember.communicationDisabledUntilTimestamp === newMember.communicationDisabledUntilTimestamp) return;
  

  const isTimeoutAdded = !oldMember.communicationDisabledUntilTimestamp && newMember.communicationDisabledUntilTimestamp;
  

  const isTimeoutRemoved = oldMember.communicationDisabledUntilTimestamp && !newMember.communicationDisabledUntilTimestamp;
  
  if (!isTimeoutAdded && !isTimeoutRemoved) return;
  
  const auditLogType = 24;
  const auditLogs = await newMember.guild.fetchAuditLogs({ type: auditLogType, limit: 1 });
  const timeoutLog = auditLogs.entries.first();
  
  if (!timeoutLog) return;
  

  if (Date.now() - timeoutLog.createdTimestamp > 2000) return;
  
  const executor = timeoutLog.executor;
  if (executor.bot || await isSafeUser(executor.id) || !await hasModerationPermissions(newMember.guild, executor.id)) return;
  
  const limitType = isTimeoutAdded ? 'timeout_count' : 'untimeout_count';
  const actionType = isTimeoutAdded ? 'Sağ tık timeout' : 'Sağ tık timeout kaldırma';
  
  const result = await checkAndIncrementLimit(executor.id, limitType, parseInt(process.env[limitType.toUpperCase().replace('_COUNT', '_LIMIT')]));
  
  try {
    await sendWarningDM(executor.id, actionType, result.count, result.maxLimit);
    await sendLogMessage(newMember.guild, executor.id, actionType, result.count, result.maxLimit, result.limitExceeded);
    
    if (result.limitExceeded) {
      await removeAllRoles(newMember.guild, executor.id);
    }
  } catch (error) {
    console.error(`${actionType} işlemi sırasında hata:`, error);
  }
});


client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {

  if (oldMember.communicationDisabledUntilTimestamp !== newMember.communicationDisabledUntilTimestamp) return;
  

  if (oldMember.roles.cache.size === newMember.roles.cache.size) return;
  
  const auditLogs = await newMember.guild.fetchAuditLogs({ type: 25, limit: 1 });
  const roleLog = auditLogs.entries.first();
  
  if (!roleLog || Date.now() - roleLog.createdTimestamp > 5000 || roleLog.target.id !== newMember.id) return;
  
  const executor = roleLog.executor;
  if (executor.bot || await isSafeUser(executor.id) || !await hasModerationPermissions(newMember.guild, executor.id)) return;
  

  const isRoleAdded = oldMember.roles.cache.size < newMember.roles.cache.size;
  const limitType = isRoleAdded ? 'role_add_count' : 'role_remove_count';
  const actionType = isRoleAdded ? 'Sağ tık rol verme' : 'Sağ tık rol alma';
  
  const result = await checkAndIncrementLimit(executor.id, limitType, parseInt(process.env[limitType.toUpperCase().replace('_COUNT', '_LIMIT')]));
  
  await sendWarningDM(executor.id, actionType, result.count, result.maxLimit);
  await sendLogMessage(newMember.guild, executor.id, actionType, result.count, result.maxLimit, result.limitExceeded);
  
  if (result.limitExceeded) {
    await removeAllRoles(newMember.guild, executor.id);
  }
});


client.on(Events.GuildMemberRemove, async member => {
  const auditLogs = await member.guild.fetchAuditLogs({ type: 20, limit: 1 });
  const kickLog = auditLogs.entries.first();
  
  if (!kickLog || Date.now() - kickLog.createdTimestamp > 5000 || kickLog.target.id !== member.id) return;
  
  const executor = kickLog.executor;
  if (executor.bot || await isSafeUser(executor.id) || !await hasModerationPermissions(member.guild, executor.id)) return;
  
  const result = await checkAndIncrementLimit(executor.id, 'kick_count', parseInt(process.env.KICK_LIMIT));
  
  await sendWarningDM(executor.id, 'Sağ tık kick', result.count, result.maxLimit);
  await sendLogMessage(member.guild, executor.id, 'Sağ tık kick', result.count, result.maxLimit, result.limitExceeded);
  
  if (result.limitExceeded) {
    await removeAllRoles(member.guild, executor.id);
  }
});


client.on(Events.ChannelDelete, async channel => {
  const auditLogs = await channel.guild.fetchAuditLogs({ type: 12, limit: 1 });
  const channelLog = auditLogs.entries.first();
  
  if (!channelLog || Date.now() - channelLog.createdTimestamp > 5000) return;
  
  const executor = channelLog.executor;
  if (executor.bot || await isSafeUser(executor.id) || !await hasModerationPermissions(channel.guild, executor.id)) return;
  
  const result = await checkAndIncrementLimit(executor.id, 'channel_delete_count', parseInt(process.env.CHANNEL_DELETE_LIMIT));
  
  await sendWarningDM(executor.id, 'Kanal silme', result.count, result.maxLimit);
  await sendLogMessage(channel.guild, executor.id, 'Kanal silme', result.count, result.maxLimit, result.limitExceeded);
  
  if (result.limitExceeded) {
    await removeAllRoles(channel.guild, executor.id);
  }
});


client.on(Events.ChannelUpdate, async (oldChannel, newChannel) => {
  const auditLogs = await newChannel.guild.fetchAuditLogs({ type: 11, limit: 1 });
  const channelLog = auditLogs.entries.first();
  
  if (!channelLog || Date.now() - channelLog.createdTimestamp > 5000) return;
  
  const executor = channelLog.executor;
  if (executor.bot || await isSafeUser(executor.id) || !await hasModerationPermissions(newChannel.guild, executor.id)) return;
  
  const result = await checkAndIncrementLimit(executor.id, 'channel_edit_count', parseInt(process.env.CHANNEL_EDIT_LIMIT));
  
  await sendWarningDM(executor.id, 'Kanal düzenleme', result.count, result.maxLimit);
  await sendLogMessage(newChannel.guild, executor.id, 'Kanal düzenleme', result.count, result.maxLimit, result.limitExceeded);
  
  if (result.limitExceeded) {
    await removeAllRoles(newChannel.guild, executor.id);
  }
});


client.on(Events.ChannelCreate, async channel => {
  if (!channel.guild) return;
  
  const auditLogs = await channel.guild.fetchAuditLogs({ type: 10, limit: 1 });
  const channelLog = auditLogs.entries.first();
  
  if (!channelLog || Date.now() - channelLog.createdTimestamp > 5000) return;
  
  const executor = channelLog.executor;
  if (executor.bot || await isSafeUser(executor.id) || !await hasModerationPermissions(channel.guild, executor.id)) return;
  
  const result = await checkAndIncrementLimit(executor.id, 'channel_create_count', parseInt(process.env.CHANNEL_CREATE_LIMIT));
  
  await sendWarningDM(executor.id, 'Kanal oluşturma', result.count, result.maxLimit);
  await sendLogMessage(channel.guild, executor.id, 'Kanal oluşturma', result.count, result.maxLimit, result.limitExceeded);
  
  if (result.limitExceeded) {
    await removeAllRoles(channel.guild, executor.id);
  }
});


client.on(Events.GuildRoleCreate, async role => {
  const auditLogs = await role.guild.fetchAuditLogs({ type: 30, limit: 1 });
  const roleLog = auditLogs.entries.first();
  
  if (!roleLog || Date.now() - roleLog.createdTimestamp > 5000) return;
  
  const executor = roleLog.executor;
  if (executor.bot || await isSafeUser(executor.id) || !await hasModerationPermissions(role.guild, executor.id)) return;
  
  const result = await checkAndIncrementLimit(executor.id, 'role_create_count', parseInt(process.env.ROLE_CREATE_LIMIT));
  
  await sendWarningDM(executor.id, 'Rol oluşturma', result.count, result.maxLimit);
  await sendLogMessage(role.guild, executor.id, 'Rol oluşturma', result.count, result.maxLimit, result.limitExceeded);
  
  if (result.limitExceeded) {
    await removeAllRoles(role.guild, executor.id);
  }
});


client.on(Events.GuildRoleDelete, async role => {
  const auditLogs = await role.guild.fetchAuditLogs({ type: 32, limit: 1 });
  const roleLog = auditLogs.entries.first();
  
  if (!roleLog || Date.now() - roleLog.createdTimestamp > 5000) return;
  
  const executor = roleLog.executor;
  if (executor.bot || await isSafeUser(executor.id) || !await hasModerationPermissions(role.guild, executor.id)) return;
  
  const result = await checkAndIncrementLimit(executor.id, 'role_delete_count', parseInt(process.env.ROLE_DELETE_LIMIT));
  
  await sendWarningDM(executor.id, 'Rol silme', result.count, result.maxLimit);
  await sendLogMessage(role.guild, executor.id, 'Rol silme', result.count, result.maxLimit, result.limitExceeded);
  
  if (result.limitExceeded) {
    await removeAllRoles(role.guild, executor.id);
  }
});


client.on(Events.GuildRoleUpdate, async (oldRole, newRole) => {
  const auditLogs = await newRole.guild.fetchAuditLogs({ type: 31, limit: 1 });
  const roleLog = auditLogs.entries.first();
  
  if (!roleLog || Date.now() - roleLog.createdTimestamp > 5000) return;
  
  const executor = roleLog.executor;
  if (executor.bot || await isSafeUser(executor.id) || !await hasModerationPermissions(newRole.guild, executor.id)) return;
  
  const result = await checkAndIncrementLimit(executor.id, 'role_edit_count', parseInt(process.env.ROLE_EDIT_LIMIT));
  
  await sendWarningDM(executor.id, 'Rol düzenleme', result.count, result.maxLimit);
  await sendLogMessage(newRole.guild, executor.id, 'Rol düzenleme', result.count, result.maxLimit, result.limitExceeded);
  
  if (result.limitExceeded) {
    await removeAllRoles(newRole.guild, executor.id);
  }
});


client.on(Events.GuildUpdate, async (oldGuild, newGuild) => {
  if (oldGuild.name === newGuild.name) return;
  
  const auditLogs = await newGuild.fetchAuditLogs({ type: 1, limit: 1 });
  const guildLog = auditLogs.entries.first();
  
  if (!guildLog || Date.now() - guildLog.createdTimestamp > 5000) return;
  
  const executor = guildLog.executor;
  if (executor.bot || await isSafeUser(executor.id) || !await hasModerationPermissions(newGuild, executor.id)) return;
  
  const result = await checkAndIncrementLimit(executor.id, 'server_name_edit_count', parseInt(process.env.SERVER_NAME_EDIT_LIMIT));
  
  await sendWarningDM(executor.id, 'Sunucu ismini düzenleme', result.count, result.maxLimit);
  await sendLogMessage(newGuild, executor.id, 'Sunucu ismini düzenleme', result.count, result.maxLimit, result.limitExceeded);
  
  if (result.limitExceeded) {
    await removeAllRoles(newGuild, executor.id);
  }
});


client.on(Events.GuildUpdate, async (oldGuild, newGuild) => {
  if (oldGuild.vanityURLCode === newGuild.vanityURLCode) return;
  
  const auditLogs = await newGuild.fetchAuditLogs({ type: 1, limit: 1 });
  const guildLog = auditLogs.entries.first();
  
  if (!guildLog || Date.now() - guildLog.createdTimestamp > 5000) return;
  
  const executor = guildLog.executor;
  if (executor.bot || await isSafeUser(executor.id) || !await hasModerationPermissions(newGuild, executor.id)) return;
  

  const result = await checkAndIncrementLimit(executor.id, 'vanity_url_edit_count', parseInt(process.env.VANITY_URL_EDIT_LIMIT));
  
  await sendWarningDM(executor.id, 'Vanity URL düzenleme', result.count, result.maxLimit);
  await sendLogMessage(newGuild, executor.id, 'Vanity URL düzenleme', result.count, result.maxLimit, result.limitExceeded);
  
  if (result.limitExceeded) {
    await removeAllRoles(newGuild, executor.id);
  }
});


client.on(Events.GuildEmojiDelete, async emoji => {
  const auditLogs = await emoji.guild.fetchAuditLogs({ type: 62, limit: 1 });
  const emojiLog = auditLogs.entries.first();
  
  if (!emojiLog || Date.now() - emojiLog.createdTimestamp > 5000) return;
  
  const executor = emojiLog.executor;
  if (executor.bot || await isSafeUser(executor.id) || !await hasModerationPermissions(emoji.guild, executor.id)) return;
  
  const result = await checkAndIncrementLimit(executor.id, 'emoji_sticker_delete_count', parseInt(process.env.EMOJI_STICKER_DELETE_LIMIT));
  
  await sendWarningDM(executor.id, 'Emoji silme', result.count, result.maxLimit);
  await sendLogMessage(emoji.guild, executor.id, 'Emoji silme', result.count, result.maxLimit, result.limitExceeded);
  
  if (result.limitExceeded) {
    await removeAllRoles(emoji.guild, executor.id);
  }
});

client.on(Events.GuildStickerDelete, async sticker => {
  const auditLogs = await sticker.guild.fetchAuditLogs({ type: 122, limit: 1 });
  const stickerLog = auditLogs.entries.first();
  
  if (!stickerLog || Date.now() - stickerLog.createdTimestamp > 5000) return;
  
  const executor = stickerLog.executor;
  if (executor.bot || await isSafeUser(executor.id) || !await hasModerationPermissions(sticker.guild, executor.id)) return;
  
  const result = await checkAndIncrementLimit(executor.id, 'emoji_sticker_delete_count', parseInt(process.env.EMOJI_STICKER_DELETE_LIMIT));
  
  await sendWarningDM(executor.id, 'Sticker silme', result.count, result.maxLimit);
  await sendLogMessage(sticker.guild, executor.id, 'Sticker silme', result.count, result.maxLimit, result.limitExceeded);
  
  if (result.limitExceeded) {
    await removeAllRoles(sticker.guild, executor.id);
  }
});


cron.schedule('0 0 * * *', () => {
  db.run(`UPDATE limits SET 
    ban_count = 0, 
    kick_count = 0, 
    role_remove_count = 0, 
    role_add_count = 0, 
    channel_delete_count = 0, 
    channel_edit_count = 0, 
    channel_create_count = 0, 
    role_create_count = 0, 
    role_delete_count = 0, 
    role_edit_count = 0, 
    server_name_edit_count = 0, 
    vanity_url_edit_count = 0, 
    emoji_sticker_delete_count = 0, 
    last_reset = CURRENT_DATE`, function(err) {
    if (err) {
      console.error('Limitler sıfırlanırken hata:', err);
    } else {
      console.log('Tüm limitler sıfırlandı!');
    }
  });
});

client.login(process.env.TOKEN);
