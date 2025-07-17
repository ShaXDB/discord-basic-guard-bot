# Discord Guard Bot

Bu Discord botu, sunucunuzu zararlı aktivitelerden korumak için tasarlanmış basit bir güvenlik sistemidir.

## Özellikler

- **Moderasyon İzleme**: Ban, kick, timeout, rol verme/alma işlemlerini izler
- **Kanal Koruması**: Kanal oluşturma, silme ve düzenleme işlemlerini kontrol eder
- **Rol Koruması**: Rol oluşturma, silme ve düzenleme işlemlerini izler
- **Sunucu Koruması**: Sunucu adı ve vanity URL değişikliklerini kontrol eder
- **Emoji/Sticker Koruması**: Emoji ve sticker silme işlemlerini izler
- **Güvenli Liste**: Belirli kullanıcıları güvenli listesine ekleyebilirsiniz
- **Limit Sistemi**: Her işlem için günlük limitler belirleyebilirsiniz
- **Otomatik Ceza**: Limit aşımında kullanıcının rollerini otomatik olarak alır
- **DM Uyarıları**: Kullanıcılara özel mesaj ile uyarı gönderir
- **Log Sistemi**: Tüm aktiviteleri belirtilen kanala loglar

## Kurulum

### Gereksinimler

- Node.js 18.20.8 veya üzeri
- npm veya yarn
- SQLite3

### Adımlar

1. **Projeyi klonlayın:**
   ```bash
   git clone <repository-url>
   cd Guard
   ```

2. **Node.js sürümünü ayarlayın (nvm kullanıyorsanız):**
   ```bash
   nvm use 18.20.8
   ```

3. **Bağımlılıkları yükleyin:**
   ```bash
   npm install
   ```

4. **Ortam değişkenlerini ayarlayın:**
   `.env` dosyasını düzenleyin ve gerekli bilgileri girin:
   ```env
   TOKEN=your_bot_token_here
   PREFIX=.
   GUARD_LOG_CHANNEL_ID=your_log_channel_id
   ```

5. **Botu başlatın:**
   ```bash
   npm start
   # veya
   node index.js
   # veya Windows için
   baslat.bat
   ```

## Yapılandırma

### .env Dosyası

```env
# Bot Token
TOKEN=your_bot_token_here

# Bot Prefix
PREFIX=.

# Guard Log Kanalı ID
GUARD_LOG_CHANNEL_ID=your_log_channel_id

# Limit Değerleri
BAN_LIMIT=10
KICK_LIMIT=10
ROLE_REMOVE_LIMIT=10
ROLE_ADD_LIMIT=10
CHANNEL_DELETE_LIMIT=10
CHANNEL_EDIT_LIMIT=10
CHANNEL_CREATE_LIMIT=10
ROLE_CREATE_LIMIT=10
ROLE_DELETE_LIMIT=10
ROLE_EDIT_LIMIT=10
SERVER_NAME_EDIT_LIMIT=5
VANITY_URL_EDIT_LIMIT=1
EMOJI_STICKER_DELETE_LIMIT=15
UNBAN_LIMIT=10
TIMEOUT_LIMIT=10
UNTIMEOUT_LIMIT=10
```

### Bot İzinleri

Botun düzgün çalışması için aşağıdaki izinlere ihtiyacı vardır:

- `View Audit Log`
- `Manage Roles`
- `Send Messages`
- `Send Messages in Threads`
- `Embed Links`
- `Read Message History`
- `Use Slash Commands`
- `Connect` (ses kanalına bağlanmak için)

## Komutlar

### Prefix Komutları

- `.safe list` - Güvenli listedeki kullanıcıları gösterir
- `.safe add @user` - Kullanıcıyı güvenli listeye ekler
- `.safe remove @user` - Kullanıcıyı güvenli listeden çıkarır

### Slash Komutları

- `/safe list` - Güvenli listedeki kullanıcıları gösterir
- `/safe add user:@user` - Kullanıcıyı güvenli listeye ekler
- `/safe remove user:@user` - Kullanıcıyı güvenli listeden çıkarır

## Nasıl Çalışır?

1. **İzleme**: Bot, sunucudaki tüm moderasyon aktivitelerini audit log'lar üzerinden izler
2. **Kontrol**: Her işlem için kullanıcının güvenli listede olup olmadığını ve moderasyon yetkisi olup olmadığını kontrol eder
3. **Limit Takibi**: Her işlem türü için günlük limit sayacını artırır
4. **Uyarı**: Kullanıcıya DM ile uyarı gönderir ve log kanalına bilgi verir
5. **Ceza**: Limit aşılırsa kullanıcının tüm rollerini alır
6. **Sıfırlama**: Her gece saat 00:00'da tüm limitler sıfırlanır

## Güvenlik

- Bot token'ınızı asla paylaşmayın
- `.env` dosyasını git'e eklemeyin
- Botun rolünü yeterince yüksek tutun ama Administrator yetkisi vermeyin
- Güvenli listeye sadece güvendiğiniz kişileri ekleyin

## Sorun Giderme

### Bot çevrimiçi değil
- Token'ın doğru olduğundan emin olun
- Bot'un sunucuda olduğundan emin olun
- İnternet bağlantınızı kontrol edin

### Komutlar çalışmıyor
- Bot'un gerekli izinlere sahip olduğundan emin olun
- Prefix'in doğru olduğundan emin olun
- Slash komutlarının yüklendiğinden emin olun

### Limitler çalışmıyor
- Audit log izinlerinin verildiğinden emin olun
- Bot'un rolünün hedef kullanıcıdan yüksek olduğundan emin olun
- .env dosyasındaki limit değerlerini kontrol edin

## Katkıda Bulunma

Bu projeye katkıda bulunmak istiyorsanız:

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Değişikliklerinizi commit edin (`git commit -m 'Add some amazing feature'`)
4. Branch'inizi push edin (`git push origin feature/amazing-feature`)
5. Pull Request oluşturun

## Lisans

Bu proje MIT lisansı altında lisanslanmıştır.

## İletişim

Sorularınız için Discord üzerinden iletişime geçebilirsiniz.

---

**Not**: Bu bot eğitim amaçlı geliştirilmiştir. Üretim ortamında kullanmadan önce kapsamlı testler yapın.