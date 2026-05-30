document.addEventListener('DOMContentLoaded', () => {
    console.log('Додаток ініціалізовано успішно. (Тест 4 пройдено)');

    const navLinks = document.querySelectorAll('.nav-link');
    const appContent = document.getElementById('app-content');

    // Проста імітація навігації між сторінками без перезавантаження
    navLinks.forEach(link => {
        link.addEventListener('click', (event) => {
            // event.preventDefault() тут можна додати, якщо використовуємо чисті <a> без хешів
            const target = event.target.getAttribute('data-target');
            
            // В реальності тут буде fetch до сервера або рендеринг JS-компонентів
            appContent.innerHTML = `<h2>Сторінка: ${target.toUpperCase()}</h2><p>Тут буде контент розділу ${target}.</p>`;
            console.log(`Перехід на сторінку: ${target}`);
        });
    });
});