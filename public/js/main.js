document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initAuth();
    checkAuthState();
    initCatalog();
    initProfile();
    initAdmin();
});

const API_BASE = '/api';

// ==========================================
// 1. НАВІГАЦІЯ (Single Page Application)
// ==========================================
function initNavigation() {
    const navLinks = document.querySelectorAll('[data-target]');
    const views = document.querySelectorAll('.view-section');
    const mobileMenu = document.querySelector('.nav-links');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('data-target');
            
            // Приховуємо всі секції та знімаємо клас active
            views.forEach(view => {
                view.classList.add('hidden');
                view.classList.remove('active');
            });
            
            // Показуємо цільову секцію
            const targetView = document.getElementById(targetId);
            if (targetView) {
                targetView.classList.remove('hidden');
                targetView.classList.add('active');
            }

            // Закриваємо мобільне меню після кліку
            if (mobileMenu.classList.contains('active')) {
                mobileMenu.classList.remove('active');
            }
        });
    });

    // Обробка кліку по гамбургер-меню для мобільних (Тест 6)
    document.getElementById('burger-menu').addEventListener('click', () => {
        mobileMenu.classList.toggle('active');
    });
}

// ==========================================
// 2. СИСТЕМА СПОВІЩЕНЬ
// ==========================================
function showNotification(message, isError = false) {
    const notif = document.getElementById('notification');
    notif.textContent = message;
    notif.className = isError ? 'error-msg' : 'success-msg';
    
    // Показуємо блок
    notif.classList.remove('hidden');
    
    // Ховаємо через 3 секунди
    setTimeout(() => {
        notif.classList.add('hidden');
    }, 3000);
}

// ==========================================
// 3. АВТЕНТИФІКАЦІЯ ТА АВТОРИЗАЦІЯ
// ==========================================
function initAuth() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const logoutBtn = document.getElementById('logout-btn');

    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    if (registerForm) registerForm.addEventListener('submit', handleRegister);
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const parol = document.getElementById('login-password').value;

    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, parol })
        });
        
        const data = await response.json();

        if (!response.ok) throw new Error(data.error || 'Помилка входу');

        // Зберігаємо JWT токен та роль у локальне сховище
        localStorage.setItem('token', data.token);
        localStorage.setItem('rol', data.rol);
        
        showNotification('Вхід успішний!');
        checkAuthState(); // Оновлюємо меню
        
        // Автоматичний редирект залежно від ролі
        if (data.rol === 'адмін') {
            document.querySelector('[data-target="admin-view"]').click();
        } else {
            document.querySelector('[data-target="profile-view"]').click();
        }
        
        e.target.reset(); // Очищаємо форму
    } catch (error) {
        showNotification(error.message, true);
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const payload = {
        prizvyshche: document.getElementById('reg-prizvyshche').value,
        imya: document.getElementById('reg-imya').value,
        email: document.getElementById('reg-email').value,
        telefon: document.getElementById('reg-telefon').value,
        parol: document.getElementById('reg-password').value
    };

    try {
        const response = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const data = await response.json();

        if (!response.ok) throw new Error(data.error || 'Помилка реєстрації');

        showNotification('Реєстрація успішна! Тепер ви можете увійти.');
        e.target.reset();
        window.scrollTo(0, 0); // Піднімаємо сторінку до форми входу
    } catch (error) {
        showNotification(error.message, true);
    }
}

function handleLogout(e) {
    e.preventDefault();
    // Очищаємо сесію
    localStorage.removeItem('token');
    localStorage.removeItem('rol');
    
    showNotification('Ви успішно вийшли з системи');
    checkAuthState(); // Оновлюємо меню (ховаємо захищені пункти)
    document.querySelector('[data-target="home-view"]').click(); // Повертаємо на головну
}

// ==========================================
// 4. КЕРУВАННЯ СТАНОМ ІНТЕРФЕЙСУ (UI)
// ==========================================
function checkAuthState() {
    const token = localStorage.getItem('token');
    const rol = localStorage.getItem('rol');

    const navLogin = document.getElementById('nav-login');
    const navProfile = document.getElementById('nav-profile');
    const navAdmin = document.getElementById('nav-admin');
    const navLogout = document.getElementById('nav-logout');

    if (token) {
        // Користувач авторизований
        navLogin.classList.add('hidden');
        navLogout.classList.remove('hidden');
        
        if (rol === 'адмін') {
            navAdmin.classList.remove('hidden');
            navProfile.classList.add('hidden');
        } else {
            navProfile.classList.remove('hidden');
            navAdmin.classList.add('hidden');
        }
    } else {
        // Гість
        navLogin.classList.remove('hidden');
        navLogout.classList.add('hidden');
        navProfile.classList.add('hidden');
        navAdmin.classList.add('hidden');
    }
}

// ==========================================
// 5. КАТАЛОГ ПОСЛУГ ТА ФІЛЬТРАЦІЯ (G2)
// ==========================================

function initCatalog() {
    loadCategories();
    loadServices(); // Завантажуємо всі послуги при старті

    // Слухач для фільтрації при зміні категорії у випадаючому списку
    const categoryFilter = document.getElementById('category-filter');
    if (categoryFilter) {
        categoryFilter.addEventListener('change', (e) => {
            loadServices(e.target.value);
        });
    }

    // Слухач для закриття модального вікна бронювання
    const closeModalBtn = document.getElementById('close-modal');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            document.getElementById('booking-modal').classList.add('hidden');
        });
    }
}

// Завантаження категорій у випадаючий список
async function loadCategories() {
    try {
        const response = await fetch(`${API_BASE}/catalog/categories`);
        if (!response.ok) throw new Error('Помилка завантаження категорій');
        
        const categories = await response.json();
        const filter = document.getElementById('category-filter');
        
        // Очищаємо список, залишаючи лише базову опцію
        filter.innerHTML = '<option value="">Всі категорії</option>';
        
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = cat.nazva;
            filter.appendChild(option);
        });
    } catch (error) {
        console.error(error);
        showNotification('Не вдалося завантажити категорії', true);
    }
}

// Завантаження послуг (з урахуванням фільтрації)
async function loadServices(categoryId = '') {
    try {
        let url = `${API_BASE}/catalog/services`;
        if (categoryId) {
            url += `?categoryId=${categoryId}`; // Передаємо параметр для фільтрації
        }

        const response = await fetch(url);
        if (!response.ok) throw new Error('Помилка завантаження послуг');
        
        const services = await response.json();
        renderServices(services);
    } catch (error) {
        console.error(error);
        showNotification('Не вдалося завантажити послуги', true);
    }
}

// Відмальовка карток послуг
function renderServices(services) {
    const container = document.getElementById('services-list');
    container.innerHTML = ''; // Очищаємо контейнер перед новим виводом

    if (services.length === 0) {
        container.innerHTML = '<p style="grid-column: 1 / -1; text-align: center;">Послуг у цій категорії не знайдено.</p>';
        return;
    }

    services.forEach(service => {
        const card = document.createElement('div');
        card.className = 'stat-card'; // Використовуємо існуючий клас стилів для карток
        card.style.textAlign = 'left'; // Трохи коригуємо вирівнювання
        
        card.innerHTML = `
            <h3 style="color: var(--primary-color);">${service.nazva}</h3>
            <span style="display: inline-block; background: #e9ecef; padding: 2px 8px; border-radius: 12px; font-size: 0.8rem; margin-bottom: 10px;">
                ${service.category_name || 'Без категорії'}
            </span>
            <p>${service.opys || 'Опис відсутній'}</p>
            <p style="margin-top: 10px;"><strong>Тривалість:</strong> ${service.tryvalist_hv} хв</p>
            <p><strong>Ціна:</strong> ${service.cina} грн</p>
            <button class="btn-primary" style="margin-top: 15px; width: 100%;" 
                onclick="openBookingModal(${service.id}, '${service.nazva}')">
                Переглянути розклад
            </button>
        `;
        
        container.appendChild(card);
    });
}

// Відкриття модального вікна для вибору розкладу
function openBookingModal(serviceId, serviceName) {
    document.getElementById('modal-service-name').textContent = `Запис на: ${serviceName}`;
    document.getElementById('booking-modal').classList.remove('hidden');
    
    document.getElementById('slots-container').innerHTML = '<p>Завантаження розкладу...</p>';
    
    // Викликаємо функцію завантаження слотів для цієї послуги
    loadAvailableSlots(serviceId);
}

// ==========================================
// 6. БРОНЮВАННЯ ТА РОЗКЛАД (K2)
// ==========================================

async function loadAvailableSlots(serviceId) {
    const container = document.getElementById('slots-container');
    try {
        const response = await fetch(`${API_BASE}/schedule?serviceId=${serviceId}`);
        if (!response.ok) throw new Error('Помилка завантаження розкладу');

        const slots = await response.json();
        container.innerHTML = '';

        if (slots.length === 0) {
            container.innerHTML = '<p>На жаль, на цю послугу наразі немає доступних сеансів у розкладі.</p>';
            return;
        }

        // Відмальовка доступних слотів
        slots.forEach(slot => {
            // Перевірка статусів та місткості (за тест-планом)
            const isFull = slot.vilni_miscya <= 0;
            const isBlocked = slot.status === 'заблоковано' || slot.status === 'Заблокований';
            const isDisabled = isFull || isBlocked;

            const slotDiv = document.createElement('div');
            slotDiv.style.border = '1px solid var(--border-color)';
            slotDiv.style.padding = '15px';
            slotDiv.style.marginTop = '10px';
            slotDiv.style.borderRadius = '6px';
            slotDiv.style.backgroundColor = isDisabled ? '#f8f9fa' : '#fff';

            // Формуємо текст для кнопки (Тест 5)
            let btnText = 'Записатися';
            if (isFull) btnText = 'Немає місць';
            if (isBlocked) btnText = 'Заблоковано';

            slotDiv.innerHTML = `
                <p><strong>Дата:</strong> ${slot.data} | <strong>Час:</strong> ${slot.chas_poch} - ${slot.chas_kin}</p>
                <p><strong>Спеціаліст:</strong> ${slot.spec_prizvyshche} ${slot.spec_imya}</p>
                <p><strong>Вільних місць:</strong> <span style="color: ${isFull ? 'var(--danger-color)' : 'var(--secondary-color)'}; font-weight: bold;">${slot.vilni_miscya}</span> / ${slot.maks_misc}</p>
                
                <button class="btn-primary" style="margin-top: 10px; ${isDisabled ? 'background-color: #ccc; cursor: not-allowed;' : ''}" 
                    ${isDisabled ? 'disabled' : ''} 
                    onclick="bookSlot(${slot.id})">
                    ${btnText}
                </button>
            `;
            container.appendChild(slotDiv);
        });
    } catch (error) {
        console.error(error);
        container.innerHTML = '<p class="error-msg">Сталася помилка при завантаженні розкладу.</p>';
    }
}

async function bookSlot(slotId) {
    // 1. Перевірка авторизації (Гість не може записуватися)
    const token = localStorage.getItem('token');
    if (!token) {
        showNotification('Для запису необхідно увійти в систему!', true);
        document.getElementById('booking-modal').classList.add('hidden');
        document.querySelector('[data-target="auth-view"]').click();
        return;
    }

    // 2. Відправка запиту на бронювання
    try {
        const response = await fetch(`${API_BASE}/bookings`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ slot_id: slotId, komentar: 'Онлайн-запис через каталог' })
        });

        const data = await response.json();

        if (!response.ok) throw new Error(data.error || 'Помилка при створенні запису');

        showNotification('Успішно! ' + data.message);
        document.getElementById('booking-modal').classList.add('hidden');
        
        // 3. Оновлюємо каталог, щоб клієнт одразу побачив зменшення кількості вільних місць (Тест 4)
        const activeCategoryId = document.getElementById('category-filter').value;
        loadServices(activeCategoryId); 
        
    } catch (error) {
        showNotification(error.message, true); // Виведе "Ви вже записані..." або "Вільних місць немає..." (Тести 5, 6)
    }
}

// ==========================================
// 7. ОСОБИСТИЙ КАБІНЕТ КЛІЄНТА (K3, K4, K5)
// ==========================================

function initProfile() {
    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
        profileForm.addEventListener('submit', handleProfileUpdate);
    }

    // Завантажуємо записи клієнта щоразу, коли він відкриває "Мій кабінет"
    const profileNavBtn = document.querySelector('[data-target="profile-view"]');
    if (profileNavBtn) {
        profileNavBtn.addEventListener('click', () => {
            loadMyBookings();
        });
    }
}

// [K5] Редагування профілю
async function handleProfileUpdate(e) {
    e.preventDefault();
    const token = localStorage.getItem('token');
    
    const payload = {
        prizvyshche: document.getElementById('prof-prizvyshche').value,
        imya: document.getElementById('prof-imya').value,
        telefon: document.getElementById('prof-telefon').value
    };

    try {
        const response = await fetch(`${API_BASE}/users/profile`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Помилка оновлення профілю');
        
        showNotification('Особисті дані успішно оновлено!');
    } catch (error) {
        showNotification(error.message, true);
    }
}

// [K3] Завантаження власних записів
async function loadMyBookings() {
    const token = localStorage.getItem('token');
    const tbody = document.querySelector('#my-bookings-table tbody');
    
    if (!token || !tbody) return;

    try {
        const response = await fetch(`${API_BASE}/bookings/my`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Помилка завантаження записів');
        
        const bookings = await response.json();
        tbody.innerHTML = '';
        
        if (bookings.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">У вас ще немає записів.</td></tr>';
            return;
        }

        bookings.forEach(b => {
            const tr = document.createElement('tr');
            
            // Кольорова індикація статусів
            let statusColor = 'var(--text-color)';
            const statusLower = b.booking_status.toLowerCase();
            
            if (statusLower === 'очікує підтвердження') statusColor = '#f0ad4e'; // Помаранчевий
            if (statusLower === 'підтверджено') statusColor = 'var(--secondary-color)'; // Зелений
            if (statusLower === 'скасовано') statusColor = 'var(--danger-color)'; // Червоний

            // Кнопка скасування доступна лише якщо запис ще не скасовано
            const canCancel = statusLower !== 'скасовано';

            tr.innerHTML = `
                <td>
                    <strong>${b.data}</strong><br>
                    <small>${b.chas_poch}</small>
                </td>
                <td>
                    ${b.service_name}<br>
                    <small>${b.cina} грн</small>
                </td>
                <td>${b.spec_prizvyshche || 'Не вказано'}</td>
                <td style="color: ${statusColor}; font-weight: bold;">${b.booking_status}</td>
                <td>
                    ${canCancel 
                        ? `<button class="btn-primary" style="background-color: var(--danger-color); padding: 5px 10px; font-size: 0.9rem;" 
                            onclick="cancelMyBooking(${b.booking_id})">Скасувати</button>` 
                        : '—'}
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error(error);
        tbody.innerHTML = '<tr><td colspan="5" class="error-msg" style="text-align: center;">Не вдалося завантажити таблицю записів.</td></tr>';
    }
}

// [K4] Скасування запису клієнтом
async function cancelMyBooking(bookingId) {
    if (!confirm('Ви дійсно бажаєте скасувати цей запис?')) return;
    
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${API_BASE}/bookings/${bookingId}/status`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status: 'Скасовано' }) // Передаємо статус згідно з ТЗ
        });
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Помилка скасування');
        
        showNotification('Запис успішно скасовано.');
        
        // Оновлюємо таблицю записів
        loadMyBookings();
        
        // Фоново оновлюємо каталог, щоб відразу звільнити місце в UI
        const activeCategoryId = document.getElementById('category-filter') ? document.getElementById('category-filter').value : '';
        loadServices(activeCategoryId);
        
    } catch (error) {
        showNotification(error.message, true);
    }
}

// ==========================================
// 8. ПАНЕЛЬ АДМІНІСТРАТОРА (A3, A4, A5)
// ==========================================

function initAdmin() {
    // Налаштування вкладок адмін-панелі
    const adminTabs = document.querySelectorAll('.admin-tabs .btn-tab');
    adminTabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            // Знімаємо активний клас з усіх кнопок і контенту
            adminTabs.forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.add('hidden'));
            
            // Активуємо обрану вкладку
            e.target.classList.add('active');
            const targetContent = document.getElementById(e.target.getAttribute('data-tab'));
            if (targetContent) targetContent.classList.remove('hidden');

            // Завантажуємо відповідні дані
            loadAdminData(e.target.getAttribute('data-tab'));
        });
    });

    // Налаштування пошуку клієнтів (Тест 2)
    const searchInput = document.getElementById('admin-user-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            loadAdminUsers(e.target.value);
        });
    }

    // Завантажуємо дашборд при переході в Адмін-панель
    const adminNavBtn = document.querySelector('[data-target="admin-view"]');
    if (adminNavBtn) {
        adminNavBtn.addEventListener('click', () => {
            loadDashboardStats();
            document.querySelector('.admin-tabs .btn-tab[data-tab="admin-bookings"]').click();
        });
    }
}

// Розподільник завантаження даних для вкладок
function loadAdminData(tabId) {
    if (tabId === 'admin-bookings') loadAdminBookings();
    if (tabId === 'admin-users') loadAdminUsers();
    if (tabId === 'admin-catalog') loadAdminCatalogUi();
    if (tabId === 'admin-schedule') loadAdminScheduleUi();
}

// [A5] Завантаження статистики дашборду (Тест 4)
async function loadDashboardStats() {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${API_BASE}/stats/dashboard`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Помилка завантаження статистики');
        
        const stats = await response.json();
        
        document.getElementById('stat-today-bookings').textContent = stats.bookings_today || 0;
        document.getElementById('stat-new-clients').textContent = stats.new_clients_week || 0;
    } catch (error) {
        console.error(error);
    }
}

// [A4] Завантаження списку клієнтів із пошуком (Тести 1, 2)
async function loadAdminUsers(searchQuery = '') {
    const token = localStorage.getItem('token');
    const container = document.getElementById('admin-users-list');
    
    try {
        let url = `${API_BASE}/users`;
        if (searchQuery) url += `?search=${encodeURIComponent(searchQuery)}`;

        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Помилка завантаження клієнтів');
        
        const users = await response.json();
        
        let html = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Прізвище та Ім'я</th>
                        <th>Email</th>
                        <th>Телефон</th>
                        <th>Дата реєстрації</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        if (users.length === 0) {
            html += '<tr><td colspan="5" style="text-align: center;">Клієнтів не знайдено</td></tr>';
        } else {
            users.forEach(u => {
                html += `
                    <tr>
                        <td>${u.id}</td>
                        <td><strong>${u.prizvyshche} ${u.imya}</strong></td>
                        <td>${u.email}</td>
                        <td>${u.telefon || '—'}</td>
                        <td>${new Date(u.data_reyestr).toLocaleDateString('uk-UA')}</td>
                    </tr>
                `;
            });
        }
        html += '</tbody></table>';
        container.innerHTML = html;
        
    } catch (error) {
        console.error(error);
        container.innerHTML = '<p class="error-msg">Помилка завантаження бази клієнтів.</p>';
    }
}

// [A3] Завантаження черги записів
async function loadAdminBookings() {
    const token = localStorage.getItem('token');
    const container = document.getElementById('admin-bookings');
    
    try {
        const response = await fetch(`${API_BASE}/bookings/admin`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Помилка завантаження записів');
        
        const bookings = await response.json();
        
        let html = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Створено</th>
                        <th>Клієнт</th>
                        <th>Слот (Послуга)</th>
                        <th>Статус</th>
                        <th>Дії</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        if (bookings.length === 0) {
            html += '<tr><td colspan="5" style="text-align: center;">Записів немає</td></tr>';
        } else {
            bookings.forEach(b => {
                let statusColor = '#333';
                const sLower = b.booking_status.toLowerCase();
                if (sLower === 'очікує підтвердження') statusColor = '#f0ad4e';
                if (sLower === 'підтверджено') statusColor = 'var(--secondary-color)';
                if (sLower === 'скасовано') statusColor = 'var(--danger-color)';

                html += `
                    <tr>
                        <td><small>${new Date(b.data_stvor).toLocaleString('uk-UA')}</small></td>
                        <td>
                            <strong>${b.prizvyshche} ${b.imya}</strong><br>
                            <small>${b.telefon}</small>
                        </td>
                        <td>
                            <strong>${b.service_name}</strong><br>
                            <small>${b.data} | ${b.chas_poch}</small>
                        </td>
                        <td style="color: ${statusColor}; font-weight: bold;">${b.booking_status}</td>
                        <td>
                            ${sLower === 'очікує підтвердження' ? `
                                <button class="btn-secondary" style="padding: 5px; font-size: 0.8rem; margin-bottom: 5px; width: 100%;" 
                                    onclick="updateAdminBookingStatus(${b.booking_id}, 'Підтверджено')">Підтвердити</button>
                                <button class="btn-primary" style="background-color: var(--danger-color); padding: 5px; font-size: 0.8rem; width: 100%;" 
                                    onclick="updateAdminBookingStatus(${b.booking_id}, 'Скасовано')">Скасувати</button>
                            ` : '—'}
                        </td>
                    </tr>
                `;
            });
        }
        html += '</tbody></table>';
        container.innerHTML = html;
        
    } catch (error) {
        console.error(error);
        container.innerHTML = '<p class="error-msg">Помилка завантаження черги записів.</p>';
    }
}

// [A3] Оновлення статусу запису адміністратором
async function updateAdminBookingStatus(bookingId, newStatus) {
    if (!confirm(`Змінити статус запису на "${newStatus}"?`)) return;
    
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${API_BASE}/bookings/${bookingId}/status`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status: newStatus })
        });
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Помилка оновлення статусу');
        
        showNotification(data.message);
        
        // Оновлюємо таблиці та дашборд
        loadAdminBookings();
        loadDashboardStats();
    } catch (error) {
        showNotification(error.message, true);
    }
}

// Завантаження UI Каталогу для Адміна
async function loadAdminCatalogUi() {
    try {
        const catRes = await fetch(`${API_BASE}/catalog/categories`);
        const categories = await catRes.json();
        
        const catSelect = document.getElementById('add-srv-cat');
        catSelect.innerHTML = '<option value="">Оберіть категорію...</option>';
        categories.forEach(c => {
            catSelect.innerHTML += `<option value="${c.id}">${c.nazva}</option>`;
        });
    } catch (e) { console.error(e); }
}

// Завантаження UI Розкладу для Адміна
async function loadAdminScheduleUi() {
    try {
        const [srvRes, specRes, slotsRes] = await Promise.all([
            fetch(`${API_BASE}/catalog/services`),
            fetch(`${API_BASE}/catalog/specialists`),
            fetch(`${API_BASE}/schedule`)
        ]);
        
        const services = await srvRes.json();
        const specialists = await specRes.json();
        const slots = await slotsRes.json();
        
        // Заповнення селектів
        const srvSelect = document.getElementById('add-slot-service');
        srvSelect.innerHTML = '<option value="">Оберіть послугу...</option>';
        services.forEach(s => srvSelect.innerHTML += `<option value="${s.id}">${s.nazva}</option>`);
        
        const specSelect = document.getElementById('add-slot-spec');
        specSelect.innerHTML = '<option value="">Оберіть спеціаліста...</option>';
        specialists.forEach(s => specSelect.innerHTML += `<option value="${s.id}">${s.prizvyshche} ${s.imya}</option>`);

        // Відмальовка наявних слотів
        let html = '<table class="data-table"><thead><tr><th>Дата і Час</th><th>Послуга</th><th>Місця</th></tr></thead><tbody>';
        slots.forEach(slot => {
            html += `<tr>
                <td>${slot.data} <br> <small>${slot.chas_poch} - ${slot.chas_kin}</small></td>
                <td>${slot.service_name}</td>
                <td>${slot.vilni_miscya} / ${slot.maks_misc}</td>
            </tr>`;
        });
        document.getElementById('admin-schedule-list').innerHTML = html + '</tbody></table>';

    } catch (e) { console.error(e); }
}

// --- Обробники подання форм ---
document.getElementById('admin-add-category-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    await fetch(`${API_BASE}/catalog/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ nazva: document.getElementById('add-cat-name').value, opys: document.getElementById('add-cat-desc').value })
    });
    showNotification('Категорію створено!');
    e.target.reset();
    loadAdminCatalogUi();
});

document.getElementById('admin-add-service-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    await fetch(`${API_BASE}/catalog/services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ 
            category_id: document.getElementById('add-srv-cat').value,
            nazva: document.getElementById('add-srv-name').value,
            tryvalist_hv: document.getElementById('add-srv-dur').value,
            cina: document.getElementById('add-srv-price').value
        })
    });
    showNotification('Послугу додано!');
    e.target.reset();
});

document.getElementById('admin-add-slot-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    await fetch(`${API_BASE}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ 
            service_id: document.getElementById('add-slot-service').value,
            specialist_id: document.getElementById('add-slot-spec').value,
            data: document.getElementById('add-slot-date').value,
            chas_poch: document.getElementById('add-slot-start').value,
            chas_kin: document.getElementById('add-slot-end').value,
            maks_misc: document.getElementById('add-slot-capacity').value,
            status: 'відкритий'
        })
    });
    showNotification('Слот додано в розклад!');
    e.target.reset();
    loadAdminScheduleUi(); // Оновлюємо таблицю
});