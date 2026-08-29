# Peak Kapasite ve Doluluk Takip Sistemi
## Teknik Spec v1

---

## 1. Amaç

Eğitmen ve danışmanların ay/hafta bazında doluluğunu görmek, ve sıcak fırsatlar geldiğinde kapasitenin yetip yetmeyeceğini önceden hesaplamak.

**Kapsam dışı (bilinçli olarak):**
- Excel/görsel yükleme arayüzü yok. Mevcut takvimler bir kerelik, elle/script ile Google Calendar'a aktarılıyor.
- Teklif, fiyatlama, faturalama yok.
- CRM senkronu yok. Müşteri listesi bu uygulamada elle tutulur (aktif + sıcak toplam 30 kayıt civarı, sync yazmaya değmez).

---

## 2. Mimari kararlar

| Karar | Seçim | Gerekçe |
|---|---|---|
| Barındırma | Netlify + Next.js | Mevcut stack |
| Veritabanı | Supabase (Postgres) | Mevcut stack |
| Takvim erişimi | Google service account, eğitmen takvimi paylaşımı ile | Eğitmen başına OAuth akışı gerekmez, freelance/harici eğitmenlerde de çalışır |
| Doğruluk kaynağı: müsaitlik | Google Calendar | Eğitmen kendi girer |
| Doğruluk kaynağı: ticari veri | Uygulama | Müşteri, sıcaklık, gün sayısı |
| Senkron yönü | Tek yönlü (Calendar → uygulama) | Çift yönlü senkron bakım maliyeti taşır, buna değmez |
| Zamanlama birimi | Yarım gün (AM / PM) | Sonradan eklemek pahalı |

---

## 3. Google Calendar konvansiyonu

Bu, yazılımdan **önce** yapılacak organizasyonel iş.

Her eğitmen için iki adet paylaşılan takvim:

| Takvim | İçerik | Kapasiteye etkisi |
|---|---|---|
| `Peak Teslimat — [Ad]` | Eğitim, danışmanlık, hazırlık, seyahat | Slot dolu sayılır |
| `Peak Blok — [Ad]` | İzin, rapor, kişisel meşguliyet, iç toplantı | Kapasiteden düşülür |

Her iki takvim de Peak service account e-posta adresine **"Tüm etkinlik detaylarını görme"** yetkisiyle paylaşılır. Eğitmenin kişisel takvimine hiç erişilmez.

### Slot çıkarımı

Sistem etkinlikten yarım gün slotunu şöyle türetir:

| Etkinlik | Slot |
|---|---|
| Tüm gün etkinliği | Tam gün (AM + PM) |
| Bitiş ≤ 13:30 | AM |
| Başlangıç ≥ 12:00 | PM |
| 09:00–18:00 tipi | Tam gün |
| Çok günlü etkinlik | Her iş günü tam gün olarak açılır |

**Kural:** başlık ne olursa olsun etkinlik varsa slot doludur. Başlık parse edilemezse müşteri "atanmamış" olur ama doluluk sayısı doğru kalır.

### Başlık formatı (zorunlu değil, tavsiye)

```
MÜŞTERİ | Program adı
```

Örnek: `Vakıf Katılım | Satış ve Yapay Zeka`

Sistem `|` öncesini müşteri tablosuyla eşleştirmeye çalışır (case-insensitive, kısmi eşleşme). Eşleşmezse kayıt atanmamış olarak durur ve dashboard'da "eşleşmeyen kayıtlar" listesinde görünür.

---

## 4. Veri modeli

```sql
create table trainers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text,
  is_internal boolean default true,          -- false = freelance
  delivery_calendar_id text,                 -- Peak Teslimat
  block_calendar_id text,                    -- Peak Blok
  monthly_capacity_days numeric default 13,  -- gerçekçi teslim kapasitesi
  active boolean default true,
  created_at timestamptz default now()
);

create table skills (
  id uuid primary key default gen_random_uuid(),
  name text unique not null                  -- 'Satış', 'Çağrı Merkezi', 'CX', 'Tahsilat', 'Liderlik'
);

create table trainer_skills (
  trainer_id uuid references trainers(id) on delete cascade,
  skill_id uuid references skills(id) on delete cascade,
  level int default 2,                       -- 1 destek, 2 verebilir, 3 uzman
  primary key (trainer_id, skill_id)
);

create table clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  aliases text[],                            -- başlık eşleştirmesi için
  status text not null default 'active',     -- active | hot | dormant
  notes text
);

-- Takvimden gelen kesin doluluk
create table bookings (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid references trainers(id) on delete cascade,
  google_event_id text,
  google_calendar_id text,
  date date not null,
  slot text not null,                        -- 'am' | 'pm'
  kind text not null,                        -- 'delivery' | 'block'
  client_id uuid references clients(id),
  raw_title text,
  source text default 'gcal',                -- 'gcal' | 'manual'
  synced_at timestamptz default now(),
  unique (trainer_id, date, slot)
);

-- Sıcak fırsat talebi
create table demands (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id),
  title text not null,
  skill_id uuid references skills(id),
  days_required numeric not null,
  mode text not null default 'floating',     -- 'fixed' | 'floating'
  start_date date,                           -- fixed ise
  end_date date,                             -- fixed ise
  target_month date,                         -- floating ise, ayın 1'i
  probability int default 50,                -- 0-100
  preferred_trainer_id uuid references trainers(id),
  status text default 'open',                -- open | won | lost
  created_at timestamptz default now()
);

create table sync_log (
  trainer_id uuid references trainers(id) on delete cascade,
  calendar_id text,
  sync_token text,
  last_synced_at timestamptz,
  last_event_count int,
  last_error text,
  primary key (trainer_id, calendar_id)
);
```

---

## 5. Senkron mantığı

Netlify Scheduled Function, 2 saatte bir.

1. Her aktif eğitmenin iki takvimi için `events.list` çağrısı, `syncToken` ile artımlı.
2. Silinen etkinlikler (`status: cancelled`) için ilgili `bookings` satırları silinir.
3. Yeni/güncel etkinlikler slot'a açılır, upsert edilir.
4. Hafta sonları ve resmî tatiller atlanır (TR tatil listesi sabit dosyada tutulur).
5. `sync_log` güncellenir.

`syncToken` süresi dolarsa (410 Gone) o takvim için son 3 ay + gelecek 12 ay tam yeniden okunur.

---

## 6. Kapasite hesabı

Ay bazında, eğitmen başına:

```
brut_slot     = monthly_capacity_days * 2
blok_slot     = o ay içindeki kind='block' slot sayısı
net_kapasite  = brut_slot - blok_slot
dolu_slot     = o ay içindeki kind='delivery' slot sayısı
doluluk       = dolu_slot / net_kapasite
kalan_slot    = net_kapasite - dolu_slot
```

**Not:** `monthly_capacity_days` takvim iş günü sayısı değildir. 22 iş günü olan bir ayda gerçekçi teslim kapasitesi 12–14 gündür. Bu alan eğitmen bazında ayarlanabilir olmalı.

Hafta bazı için aynı formül, `monthly_capacity_days / 4.3` ile.

---

## 7. Sıcak senaryo motoru

Girdi: `demands` tablosundaki `status='open'` kayıtlar, bir olasılık eşiği (varsayılan 50).

Algoritma:

1. Kesin doluluk (bookings) üzerinden her eğitmenin ay bazlı `kalan_slot` haritası çıkarılır.
2. Talepler önce `fixed`, sonra `floating` olarak sıralanır. Her grup içinde olasılığa göre azalan.
3. Her talep için uygun eğitmen havuzu: `trainer_skills` içinde ilgili `skill_id` olanlar. `preferred_trainer_id` varsa o önce denenir.
4. `fixed` talep: verilen tarih aralığındaki boş slotlara yerleştirilmeye çalışılır.
5. `floating` talep: `target_month` içindeki boş slotlara yerleştirilir, tarih seçimi serbest.
6. Yerleşemeyen gün sayısı **açık** olarak raporlanır.

Çıktı:

```
Nisan 2026
  Kesin doluluk: %71
  Açık talep: 3 fırsat, toplam 18 gün
  Yerleşen: 14 gün
  AÇIK: 4 gün  →  "Tahsilat" yetkinliğinde kapasite yok
  Darboğaz: Sühan (%94), Ayşe (%88)
```

Dashboard'da tek bir toggle: **Kesin** / **Kesin + Muhtemel**.

---

## 8. Ekranlar

**1. Doluluk ısı haritası (ana ekran)**
Satır: eğitmen. Sütun: ay (12 ay ileri). Hücre: doluluk yüzdesi, renk kodlu. Hücreye tıklayınca o ayın hafta kırılımı açılır.

**2. Hafta görünümü**
Satır: eğitmen. Sütun: gün. Her hücre iki yarım gün. Müşteri adı ve renk. Boşluklar görünür.

**3. Müşteriler**
Aktif ve sıcak listesi. Sıcak olanlarda talep kayıtları (gün, ay, yetkinlik, olasılık).

**4. Senaryo**
Sıcak talepleri açıp kapatarak "bu iş gelirse ne olur" simülasyonu. Açık gün sayısı ve darboğaz eğitmen anlık güncellenir.

**5. Veri sağlığı**
- Eşleşmeyen etkinlik başlıkları (müşteriye bağlanamayanlar)
- Eğitmen bazında son senkron zamanı ve son 30 günde girilen etkinlik sayısı
- Takvimi 14 gündür boş olan eğitmenler

Beşinci ekran süs değil. Eğitmenler kendi girecekse, kimin girmediğini görmek sistemin çalışmasının şartı.

---

## 9. Faz planı

**Faz 0 — Kod yok (bu hafta)**
- 5 eğitmen + freelancerlar için iki takvim açılır, service account ile paylaşılır
- Konvansiyon tek sayfalık not olarak eğitmenlere gönderilir
- Mevcut Excel ve görsel takvimler bir kerelik .ics'e çevrilip import edilir

**Faz 1 — Görünürlük**
Senkron + doluluk ısı haritası + hafta görünümü + veri sağlığı ekranı.
Bu kadarı bile bugünkü ihtiyacın büyük kısmını karşılar.

**Faz 2 — Asıl değer**
Müşteri ve talep yönetimi + senaryo motoru.

**Faz 3 — Rafine**
Trend (geçmiş 12 ay doluluk), eşik uyarıları (bir eğitmen %90'ı geçince e-posta), yetkinlik bazlı kapasite raporu.

---

## 10. Riskler

| Risk | Etki | Önlem |
|---|---|---|
| Eğitmenler takvime girmiyor | Sistem boş, karar veremezsin | Veri sağlığı ekranı + haftalık hatırlatma. İlk 6 hafta Sibel takip eder. |
| Freelance eğitmenler paylaşmıyor | Kapasite eksik görünür | Onlar için elle giriş (`source='manual'`) yolu açık kalsın |
| `monthly_capacity_days` yanlış | Tüm yüzdeler yanlış | İlk 2 ay gerçekleşen ile karşılaştır, kalibre et |
| Başlık disiplini bozuk | Müşteri ataması eksik | Kapasite sayısı zaten başlıktan bağımsız. Eşleşmeyenler ekranı üzerinden elle bağlanır. |

---

## 11. Cursor'a not

Faz 1'i tek seferde isteme. Sırayla:
1. Supabase şeması + seed (eğitmenler, yetkinlikler)
2. Google service account bağlantısı ve tek bir takvimi okuyan test endpoint'i
3. Slot açma mantığı ve `bookings` upsert
4. Scheduled function
5. Isı haritası ekranı

Her adımdan sonra çalıştığını gör. Özellikle 3. adımda slot çıkarımını gerçek etkinliklerle test et, çok günlü ve tüm gün etkinlikleri kırar.