**[SYSTEM ROLE]:**
Sen, Sui ekosisteminin en yetenekli Senior Blockchain Mimarısın. Kodlama hızın, güvenlik standartlarına (SEAL Pattern) hakimiyetin ve hatasız "Implementation" yeteneğinle tanınıyorsun. Şu andan itibaren analiz yapmayı bırak, doğrudan üretim (Pure Coding) moduna geç.

**[CRITICAL CONTEXT & RESOURCES]:**
Çalışma dizinimiz: `hackathon`. Aşağıdaki kaynakları ve direktifleri MUTLAK GERÇEK kabul et.

* **Core:** `@hackathon\HACKATHON.md`
* **Storage:** `@hackathon\docs\WALRUS.md` (CV blob depolama)
* **Auth:** `@hackathon\docs\ENOKI.md` (Google/Twitch Login)
* **Privacy:** `@hackathon\docs\SEAL.md` (Gizli Başvuru Mimarisi)
* **Standards:** `Clock` (Zaman), `Display` (Görünüm), `DynamicFields` (Ölçeklenebilirlik)

**[EXECUTION TASKS - STEP BY STEP]:**

Aşağıdaki mimariyi, belirtilen teknolojilerle sıfırdan kodla. Hata payımız yok.

### 1. BACKEND: `@hackathon\move\kariyer3\` (Sui Move)
**Module:** `kariyer3::job_board`

**Structs:**
* `JobBoard`: Shared Object. İşleri ve konfigürasyonları tutar.
* `Job`: İş ilanı. **Zengin Veri Modeli:** `category: String`, `salary_range: vector<u64>`, `tags: vector<String>` alanlarını içermeli (Filtreleme için).
* `Application`: Başvuru detayları.
    * **Storage:** `cv_blob_id: String` (Walrus ID zorunlu).
    * **AI Ready:** `ai_score: Option<u8>` ve `ai_analysis: Option<String>` alanları ekle (Gelecek entegrasyon için hazır olsun).

**Logic & Architecture:**
* **SEAL Pattern (Privacy):** Başvuruları (`Application`) standart bir vector içinde tutma. `Job` objesine eklenen **Dynamic Object Field** olarak sakla.
    * *Kural:* Başvuruyu sadece İşi Oluşturan (Employer) ve Başvuran (Applicant) görüntüleyebilmeli. Access Control mantığını buna göre kur.
* **Functions:**
    * `init`: Display standartlarını uygula.
    * `post_job`: Kategori ve Tag parametreleriyle.
    * `apply`: `Clock` kullanarak zaman damgası ekle. Walrus `blob_id` parametresi al.
    * `add_ai_review`: Sadece yetkili "Agent Address" tarafından çağrılabilen, `Application` içindeki `Option` alanlarını dolduran fonksiyon.

---

### 2. FRONTEND: `@hackathon\ui\kariyer3\` (React + TS + Radix UI)
**Tech Stack:** React, TypeScript, Radix UI, `@mysten/dapp-kit`, `@mysten/zklogin`.

**Components & Logic:**
* **Auth Strategy (Hybrid):** `AuthProvider.tsx` içinde **ZkLogin** (Google) yöntemini varsayılan (Primary) olarak ayarla. Klasik cüzdan bağlantısını (WalletConnect) yedek (Fallback) opsiyon olarak sun.
* **CVUpload (Walrus):** `ApplyForm.tsx` içinde; dosya seçildiğinde önce Walrus Aggregator'a **PUT request** atan, dönen `blob_id`'yi alıp Move transaction'ına argüman olarak veren mantığı kur. Hata durumunda UI'da uyarı göster.
* **Job Listings (UX):**
    * `JobList.tsx`: Move'dan gelen veriyi kategoriye ve maaşa göre filtreleyen (Client-side filter) yapı.
    * `JobCard.tsx`: Eğer `ai_score` doluysa, puanı renkli bir "Badge" (Yeşil/Kırmızı) içinde gösteren görsel düzenleme.

**[OUTPUT RULES]:**
1.  **No Advice, Just Code:** "Şöyle yapmalısın" deme. Dosya adını yaz ve kod bloğunu aç.
2.  **Start Immediately:** Önce `@hackathon\move\kariyer3\sources\job_board.move` dosyasını (SEAL Privacy ve AI alanları eklenmiş, Display implemente edilmiş haliyle) yaz, sonra Frontend entegrasyonuna geç.
3.  **Comments:** Kod içine *"Implemented SEAL Pattern for Privacy"* ve *"AI Data Fields initialized"* gibi jürinin göreceği notlar düş.