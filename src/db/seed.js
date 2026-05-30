/**
 * seed.js — наповнення бази даних «Алігатор.Запис» великим реалістичним набором даних.
 *
 * Запуск:   node src/db/seed.js
 *
 * УВАГА: скрипт ПОВНІСТЮ ОЧИЩАЄ наявні дані у всіх таблицях і створює їх заново.
 * Призначений для демонстрації та тестування (заповнює БД "як у реальному житті").
 *
 * Облікові дані після наповнення:
 *   Адміністратор:  admin@aligator.com   / admin123
 *   Адміністратор:  manager@aligator.com / admin123
 *   Будь-який клієнт (email див. у консолі) / client123
 */

const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

const dbPath = path.resolve(__dirname, '../../database.sqlite');
const db = new sqlite3.Database(dbPath);

// ---- Проміс-обгортки над sqlite3 ----
const run = (sql, params = []) => new Promise((res, rej) =>
    db.run(sql, params, function (e) { e ? rej(e) : res(this); }));
const get = (sql, params = []) => new Promise((res, rej) =>
    db.get(sql, params, (e, row) => e ? rej(e) : res(row)));

// ---- Допоміжні функції ----
const rnd = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const pickMany = (arr, k) => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy.slice(0, Math.min(k, copy.length));
};
const weighted = (pairs) => {
    const total = pairs.reduce((s, p) => s + p[1], 0);
    let r = Math.random() * total;
    for (const [val, w] of pairs) { if ((r -= w) <= 0) return val; }
    return pairs[0][0];
};
const pad = (n) => String(n).padStart(2, '0');
const dateStr = (offsetDays) => {
    const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + offsetDays);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const fmtDateTime = (d) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
const addMinutes = (hhmm, mins) => {
    let [h, m] = hhmm.split(':').map(Number);
    let total = (h * 60 + m + mins) % (24 * 60);
    return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
};
// Транслітерація для генерації email-адрес
const TR = { а:'a', б:'b', в:'v', г:'h', ґ:'g', д:'d', е:'e', є:'ie', ж:'zh', з:'z',
    и:'y', і:'i', ї:'i', й:'i', к:'k', л:'l', м:'m', н:'n', о:'o', п:'p', р:'r', с:'s',
    т:'t', у:'u', ф:'f', х:'kh', ц:'ts', ч:'ch', ш:'sh', щ:'shch', ь:'', ю:'iu', я:'ia', "'":'' };
const translit = (s) => s.toLowerCase().split('').map(c => (c in TR ? TR[c] : c)).join('');

// ---- Дані ----
const FEMALE = ["Анна","Марія","Оксана","Ірина","Наталія","Олена","Софія","Катерина","Тетяна",
    "Юлія","Вікторія","Людмила","Галина","Христина","Дарина","Ольга","Лілія","Світлана","Аліна","Вероніка"];
const MALE = ["Іван","Петро","Олег","Андрій","Сергій","Михайло","Тарас","Богдан","Дмитро","Назар",
    "Роман","Віктор","Юрій","Володимир","Максим","Артем","Олександр","Василь","Денис","Ярослав"];
const SURNAMES = ["Шевченко","Коваленко","Бондаренко","Ткаченко","Мельник","Кравчук","Бойко","Ковальчук",
    "Поліщук","Савченко","Руденко","Лисенко","Марченко","Гриценко","Кузьменко","Павленко","Іваненко",
    "Захарченко","Романюк","Гончаренко","Левченко","Москаленко","Олійник","Швець","Дяченко","Ткачук",
    "Білик","Мороз","Кравченко","Сорока"];
const DOMAINS = ["gmail.com", "ukr.net", "i.ua", "meta.ua", "outlook.com"];
const OPERATORS = ["50", "67", "68", "63", "73", "93", "96", "99", "98"];
const COMMENTS = ["", "", "", "", "Перше відвідування", "Постійний клієнт", "Прошу нагадати за день до сеансу",
    "Оплата подарунковим сертифікатом", "Бронювання по телефону", "Прийду з другом"];

// Категорії (nazva, opys)
const CATEGORIES = [
    ["SPA та масаж", "Релакс, відновлення та догляд за тілом"],
    ["Фітнес", "Групові та індивідуальні тренування"],
    ["Аквапарк", "Басейни, водні гірки та джакузі"],
    ["Сауна та лазні", "Фінська сауна, хамам та інфрачервоні кабіни"],
    ["Басейн", "Плавання та аквааеробіка"],
    ["Дитячі програми", "Заняття та анімація для дітей"],
];

// Спеціалісти (prizvyshche, imya, specializaciya)
const SPECIALISTS = [
    ["Коваль", "Марія", "Тренер з йоги та пілатесу"],
    ["Литвин", "Андрій", "Масажист (класичний, спортивний)"],
    ["Сидоренко", "Олена", "Косметолог-естетист"],
    ["Бондар", "Ігор", "Інструктор з плавання"],
    ["Гаврилюк", "Наталія", "Інструктор з аквааеробіки"],
    ["Мороз", "Віктор", "Масажист (тайський, стоун-терапія)"],
    ["Кравець", "Софія", "Тренер (зумба, табата)"],
    ["Ткаченко", "Олег", "Тренер з кросфіту"],
    ["Поліщук", "Ірина", "Дитячий інструктор з плавання"],
    ["Шевчук", "Дмитро", "Інструктор SPA та саун"],
    ["Мельник", "Христина", "Косметолог"],
    ["Романюк", "Богдан", "Персональний тренер"],
    ["Савчук", "Юлія", "Дитячий аніматор"],
    ["Лисенко", "Тарас", "Майстер лазень (хамам)"],
];

// Спеціалісти, придатні для кожної категорії (індекси 0-based у SPECIALISTS)
const CAT_SPEC = {
    0: [1, 5, 2, 10, 9],   // SPA та масаж
    1: [0, 6, 7, 11],      // Фітнес
    2: [3, 4],             // Аквапарк
    3: [9, 13],            // Сауна та лазні
    4: [3, 4],             // Басейн
    5: [8, 12],            // Дитячі програми
};

// Послуги: [індекс_категорії, назва, опис, тривалість_хв, ціна, тип]
const SERVICES = [
    // SPA та масаж
    [0, "Класичний масаж", "Загальнозміцнювальний масаж усього тіла", 60, 450, "individual"],
    [0, "Спортивний масаж", "Глибокий масаж для відновлення м'язів", 60, 500, "individual"],
    [0, "Лімфодренажний масаж", "Виведення зайвої рідини, боротьба з набряками", 50, 480, "individual"],
    [0, "Антицелюлітний масаж", "Корекція фігури та проблемних зон", 45, 420, "individual"],
    [0, "Стоун-терапія", "Масаж гарячим камінням", 75, 650, "individual"],
    [0, "Тайський масаж", "Традиційний тайський масаж", 90, 700, "individual"],
    [0, "Масаж обличчя", "Ліфтинг та лімфодренаж обличчя", 40, 380, "individual"],
    [0, "SPA-програма «Релакс»", "Комплекс: пілінг, масаж та обгортання", 120, 1200, "individual"],
    // Фітнес
    [1, "Йога", "Хатха-йога для всіх рівнів підготовки", 60, 200, "group"],
    [1, "Пілатес", "Зміцнення м'язів кора та постави", 55, 220, "group"],
    [1, "Зумба", "Танцювальне кардіо під музику", 55, 180, "group"],
    [1, "Табата", "Високоінтенсивний інтервальний тренінг", 45, 200, "group"],
    [1, "Стретчинг", "Розтяжка та розвиток гнучкості", 50, 180, "group"],
    [1, "Кросфіт", "Функціональний кросфіт-воркаут", 60, 250, "group"],
    [1, "Функціональне тренування", "Комплексне тренування всього тіла", 55, 230, "group"],
    [1, "Персональне тренування", "Індивідуальне заняття з тренером", 60, 550, "individual"],
    // Аквапарк
    [2, "Відвідування аквапарку (2 год)", "Доступ до басейнів, гірок та джакузі", 120, 350, "aqua"],
    [2, "Сімейний сеанс аквапарку", "Сеанс для родини (до 4 осіб)", 120, 900, "aqua"],
    [2, "Вечірній сеанс аквапарку", "Вечірнє відвідування зі знижкою", 120, 280, "aqua"],
    // Сауна та лазні
    [3, "Фінська сауна", "Сеанс у класичній фінській сауні", 90, 300, "sauna"],
    [3, "Хамам", "Турецька парова лазня з пілінгом", 60, 400, "sauna"],
    [3, "Інфрачервона сауна", "М'яке інфрачервоне прогрівання", 45, 250, "sauna"],
    [3, "SPA-комплекс саун", "Доступ до всіх саун та релакс-басейну", 150, 550, "sauna"],
    // Басейн
    [4, "Аквааеробіка", "Групове оздоровче заняття у воді", 45, 220, "pool"],
    [4, "Оздоровче плавання", "Заняття з інструктором з плавання", 60, 300, "pool"],
    [4, "Вільне плавання", "Самостійне відвідування басейну", 60, 150, "pool"],
    // Дитячі програми
    [5, "Дитяче плавання", "Навчання плаванню (5-10 років)", 45, 250, "kids"],
    [5, "Дитяча анімація", "Ігрова програма з аніматором", 60, 200, "kids"],
    [5, "Заняття «Мама і малюк»", "Спільне заняття у воді для мам із дітьми", 40, 280, "kids"],
];

// Місткість слоту за типом послуги
const capacityByType = (type) => ({
    individual: 1,
    group: rnd(12, 20),
    aqua: rnd(30, 50),
    sauna: rnd(6, 10),
    pool: rnd(8, 15),
    kids: rnd(8, 12),
}[type] ?? 10);

// Можливі години початку за типом послуги
const TIMES = {
    individual: ["09:00", "10:30", "12:00", "14:00", "15:30", "17:00", "18:30"],
    group: ["08:00", "10:00", "12:00", "17:00", "18:00", "19:00"],
    aqua: ["10:00", "12:00", "14:00", "16:00", "18:00"],
    sauna: ["11:00", "13:00", "15:00", "17:00", "19:00"],
    pool: ["08:00", "09:00", "11:00", "17:00", "18:00"],
    kids: ["10:00", "11:00", "16:00", "17:00"],
};

// ---- Створення таблиць (на випадок чистої БД) ----
async function ensureSchema() {
    await run("PRAGMA foreign_keys = ON;");
    await run(`CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT, nazva TEXT NOT NULL, opys TEXT)`);
    await run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT, prizvyshche TEXT NOT NULL, imya TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL, telefon TEXT, parol_hash TEXT NOT NULL, rol TEXT NOT NULL,
        data_reyestr DATETIME DEFAULT CURRENT_TIMESTAMP)`);
    await run(`CREATE TABLE IF NOT EXISTS services (
        id INTEGER PRIMARY KEY AUTOINCREMENT, category_id INTEGER, nazva TEXT NOT NULL, opys TEXT,
        tryvalist_hv INTEGER NOT NULL, cina DECIMAL(10,2) NOT NULL,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL)`);
    await run(`CREATE TABLE IF NOT EXISTS specialists (
        id INTEGER PRIMARY KEY AUTOINCREMENT, prizvyshche TEXT NOT NULL, imya TEXT NOT NULL,
        specializaciya TEXT, telefon TEXT)`);
    await run(`CREATE TABLE IF NOT EXISTS slots (
        id INTEGER PRIMARY KEY AUTOINCREMENT, service_id INTEGER, specialist_id INTEGER,
        data DATE NOT NULL, chas_poch TIME NOT NULL, chas_kin TIME NOT NULL,
        maks_misc INTEGER NOT NULL, status TEXT NOT NULL,
        FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
        FOREIGN KEY (specialist_id) REFERENCES specialists(id) ON DELETE SET NULL)`);
    await run(`CREATE TABLE IF NOT EXISTS bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT, client_id INTEGER, slot_id INTEGER,
        data_stvor DATETIME DEFAULT CURRENT_TIMESTAMP, status TEXT NOT NULL, komentar TEXT,
        FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (slot_id) REFERENCES slots(id) ON DELETE CASCADE)`);
}

async function clearAll() {
    // Видаляємо у порядку "діти → батьки", щоб не порушити зовнішні ключі
    for (const t of ["bookings", "slots", "services", "specialists", "users", "categories"]) {
        await run(`DELETE FROM ${t}`);
    }
    await run(`DELETE FROM sqlite_sequence`); // скидаємо лічильники AUTOINCREMENT
}

async function seed() {
    console.log("Початок наповнення бази даних...");
    await ensureSchema();
    await clearAll();
    await run("BEGIN TRANSACTION");

    // 1) Категорії
    const catIds = [];
    for (const [nazva, opys] of CATEGORIES) {
        const r = await run("INSERT INTO categories (nazva, opys) VALUES (?, ?)", [nazva, opys]);
        catIds.push(r.lastID);
    }

    // 2) Спеціалісти
    const specIds = [];
    for (const [pr, im, spec] of SPECIALISTS) {
        const tel = `0${pick(OPERATORS)} ${rnd(100, 999)} ${pad(rnd(0, 99))} ${pad(rnd(0, 99))}`;
        const r = await run(
            "INSERT INTO specialists (prizvyshche, imya, specializaciya, telefon) VALUES (?, ?, ?, ?)",
            [pr, im, spec, tel]);
        specIds.push(r.lastID);
    }

    // 3) Послуги
    const serviceRecords = []; // { id, catIndex, type }
    for (const [catIdx, nazva, opys, tryv, cina, type] of SERVICES) {
        const r = await run(
            "INSERT INTO services (category_id, nazva, opys, tryvalist_hv, cina) VALUES (?, ?, ?, ?, ?)",
            [catIds[catIdx], nazva, opys, tryv, cina]);
        serviceRecords.push({ id: r.lastID, catIndex: catIdx, type, dur: tryv });
    }

    // 4) Користувачі: 2 адміністратори + 33 клієнти
    const adminHash = bcrypt.hashSync("admin123", 10);
    const clientHash = bcrypt.hashSync("client123", 10); // один хеш на всіх клієнтів (швидко)

    await run(`INSERT INTO users (prizvyshche, imya, email, telefon, parol_hash, rol, data_reyestr)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ["Адміненко", "Іван", "admin@aligator.com", "050 123 45 67", adminHash, "адмін", dateStr(-200) + " 09:00:00"]);
    await run(`INSERT INTO users (prizvyshche, imya, email, telefon, parol_hash, rol, data_reyestr)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ["Гончаренко", "Олена", "manager@aligator.com", "067 987 65 43", adminHash, "адмін", dateStr(-180) + " 10:00:00"]);

    const clientIds = [];
    const usedEmails = new Set(["admin@aligator.com", "manager@aligator.com"]);
    const CLIENT_COUNT = 33;
    for (let i = 0; i < CLIENT_COUNT; i++) {
        const female = Math.random() < 0.5;
        const imya = female ? pick(FEMALE) : pick(MALE);
        const prizvyshche = pick(SURNAMES);
        let email;
        do {
            email = `${translit(imya)}.${translit(prizvyshche)}${rnd(1, 99)}@${pick(DOMAINS)}`;
        } while (usedEmails.has(email));
        usedEmails.add(email);
        const tel = `0${pick(OPERATORS)} ${rnd(100, 999)} ${pad(rnd(0, 99))} ${pad(rnd(0, 99))}`;
        // Перші 5 клієнтів зареєстровані за останній тиждень (для статистики дашборду)
        const regOffset = i < 5 ? -rnd(0, 6) : -rnd(8, 150);
        const reg = dateStr(regOffset) + ` ${pad(rnd(8, 21))}:${pad(rnd(0, 59))}:00`;
        const r = await run(`INSERT INTO users (prizvyshche, imya, email, telefon, parol_hash, rol, data_reyestr)
                             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [prizvyshche, imya, email, tel, clientHash, "клієнт", reg]);
        clientIds.push(r.lastID);
    }

    // 5) Слоти розкладу: від -7 до +30 днів, по 5-8 слотів на день
    const todayStr = dateStr(0);
    const slotRecords = []; // { id, date, capacity, status }
    for (let d = -7; d <= 30; d++) {
        const dStr = dateStr(d);
        const perDay = rnd(5, 8);
        const usedDayKeys = new Set();
        for (let s = 0; s < perDay; s++) {
            const svc = pick(serviceRecords);
            const start = pick(TIMES[svc.type]);
            const key = `${svc.id}-${start}`;
            if (usedDayKeys.has(key)) continue; // без дублів (та сама послуга в той самий час)
            usedDayKeys.add(key);

            const end = addMinutes(start, svc.dur);
            const capacity = capacityByType(svc.type);
            const specPool = CAT_SPEC[svc.catIndex] || specIds.map((_, idx) => idx);
            const specialistId = specIds[pick(specPool)];
            // ~10% майбутніх слотів заблоковані (для демонстрації функції блокування)
            const status = (d > 0 && Math.random() < 0.10) ? "заблоковано" : "відкритий";

            const r = await run(
                `INSERT INTO slots (service_id, specialist_id, data, chas_poch, chas_kin, maks_misc, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [svc.id, specialistId, dStr, start, end, capacity, status]);
            slotRecords.push({ id: r.lastID, date: dStr, capacity, status });
        }
    }

    // 6) Записи (bookings) з реалістичними статусами
    const createdStr = (slotDate) => {
        const now = new Date();
        let dt = new Date(now);
        dt.setDate(dt.getDate() - rnd(0, 21));
        const slot = new Date(slotDate + "T00:00:00");
        if (dt > slot) { dt = new Date(slot); dt.setDate(dt.getDate() - rnd(1, 5)); }
        dt.setHours(rnd(8, 20), rnd(0, 59), rnd(0, 59), 0);
        return fmtDateTime(dt);
    };

    let bookingCount = 0;
    for (const slot of slotRecords) {
        if (slot.status !== "відкритий") continue; // заблоковані слоти не бронюємо
        const isToday = slot.date === todayStr;
        const isPast = slot.date < todayStr;
        const prob = isToday ? 0.9 : 0.5;
        if (Math.random() > prob) continue;

        const maxK = Math.min(slot.capacity, 4);
        const k = rnd(1, Math.max(1, maxK));
        const chosen = pickMany(clientIds, k);
        let activeInSlot = 0;

        for (const cid of chosen) {
            let status = isPast
                ? weighted([["Підтверджено", 0.8], ["Скасовано", 0.2]])
                : weighted([["Підтверджено", 0.45], ["Очікує підтвердження", 0.4], ["Скасовано", 0.15]]);

            // Не перевищуємо місткість активними записами
            if (status !== "Скасовано") {
                if (activeInSlot >= slot.capacity) status = "Скасовано";
                else activeInSlot++;
            }

            const komentar = Math.random() < 0.3 ? pick(COMMENTS) : "";
            await run(
                `INSERT INTO bookings (client_id, slot_id, data_stvor, status, komentar) VALUES (?, ?, ?, ?, ?)`,
                [cid, slot.id, createdStr(slot.date), status, komentar]);
            bookingCount++;
        }
    }

    await run("COMMIT");

    // ---- Підсумок ----
    const counts = {};
    for (const t of ["categories", "specialists", "services", "users", "slots", "bookings"]) {
        const row = await get(`SELECT COUNT(*) AS c FROM ${t}`);
        counts[t] = row.c;
    }
    console.log("\n=== Базу даних успішно наповнено ===");
    console.log(`  Категорії:    ${counts.categories}`);
    console.log(`  Спеціалісти:  ${counts.specialists}`);
    console.log(`  Послуги:      ${counts.services}`);
    console.log(`  Користувачі:  ${counts.users} (2 адміни + ${counts.users - 2} клієнтів)`);
    console.log(`  Слоти:        ${counts.slots}`);
    console.log(`  Записи:       ${counts.bookings}`);
    console.log("\n  Вхід для демонстрації:");
    console.log("    Адмін:  admin@aligator.com / admin123");
    console.log("    Клієнт: anna.shevchenko..@... / client123 (точний email див. у таблиці users)");
}

seed()
    .then(() => db.close(() => console.log("\nЗ'єднання з БД закрито.")))
    .catch((err) => {
        console.error("Помилка під час наповнення:", err);
        db.run("ROLLBACK", () => db.close());
        process.exit(1);
    });