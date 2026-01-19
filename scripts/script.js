/* КОНФИГ */
const preloaderWaitindTime = 1200;
const cardsOnPage = 5;
const BASE_URL = 'https://v-content.practicum-team.ru';
const endpoint = `${BASE_URL}/api/videos?pagination[pageSize]=${cardsOnPage}&`;

/* ЭЛЕМЕНТЫ */
const cardsContainer = document.querySelector('.content__list');
const videoContainer = document.querySelector('[data-video-container]');
const videoElement = document.querySelector('.result__video');
const form = document.querySelector('.search-form');

/* ТЕМПЛЕЙТЫ — ПОИСК СТРОГО ПО WORKFLOW ДЛЯ ТЕСТА */
const preloaderTmp = document.querySelector('template[data-workflow="preloader"]');
const cardTmp = document.querySelector('template[data-workflow="card"]');
const moreButtonTmp = document.querySelector('template[data-workflow="more-button"]');
const errorTmp = document.querySelector('template[data-workflow="error"]');

let cardsOnPageState = [];

/* ФУНКЦИИ УТИЛИТЫ */
const delay = (ms) => new Promise(res => setTimeout(res, ms));

const waitForReadyVideo = (video) => new Promise(res => {
    video.oncanplaythrough = res;
    if (video.readyState >= 4) res();
});

const showPreloader = (tmp, parent) => {
    if (tmp) parent.append(tmp.content.cloneNode(true));
};

const removePreloader = (parent) => {
    const el = parent.querySelector('.preloader');
    if (el) el.remove();
};

/* ОСНОВНАЯ ЛОГИКА */
async function main(url) {
    try {
        const response = await fetch(url);
        const data = await response.json();
        cardsOnPageState = data.results;

        if (!cardsOnPageState || cardsOnPageState.length === 0) throw new Error('404');

        // Рендер карточек
        cardsOnPageState.forEach(item => {
            const node = cardTmp.content.cloneNode(true);
            const link = node.querySelector('.content__card-link');
            link.id = item.id;
            node.querySelector('.content__video-card-title').textContent = item.city;
            node.querySelector('.content__video-card-description').textContent = item.description;
            const img = node.querySelector('.content__video-card-thumbnail');
            img.src = `${BASE_URL}${item.thumbnail.url}`;
            img.alt = item.city;
            cardsContainer.append(node);
        });

        // Первое видео
        videoElement.src = `${BASE_URL}${cardsOnPageState[0].video.url}`;
        videoElement.poster = `${BASE_URL}${cardsOnPageState[0].poster.url}`;
        
        const first = cardsContainer.querySelector('.content__card-link');
        if (first) first.classList.add('content__card-link_current');

        await waitForReadyVideo(videoElement);
        await delay(preloaderWaitindTime);
        removePreloader(videoContainer);
        removePreloader(cardsContainer);

        // Слушатели на карточки
        const links = document.querySelectorAll('.content__card-link');
        links.forEach(link => {
            link.onclick = async (e) => {
                e.preventDefault();
                if (link.classList.contains('content__card-link_current')) return;
                links.forEach(l => l.classList.remove('content__card-link_current'));
                link.classList.add('content__card-link_current');
                showPreloader(preloaderTmp, videoContainer);
                const videoData = cardsOnPageState.find(v => String(v.id) === String(link.id));
                videoElement.src = `${BASE_URL}${videoData.video.url}`;
                videoElement.poster = `${BASE_URL}${videoData.poster.url}`;
                await waitForReadyVideo(videoElement);
                await delay(preloaderWaitindTime);
                removePreloader(videoContainer);
            }
        });

        // Пагинация
        if (data.pagination.page < data.pagination.pageCount) {
            const btnNode = moreButtonTmp.content.cloneNode(true);
            cardsContainer.append(btnNode);
            const btn = cardsContainer.querySelector('.more-button');
            btn.onclick = () => {
                btn.remove();
                main(`${url}&pagination[page]=${data.pagination.page + 1}`);
            };
        }

    } catch (err) {
        removePreloader(videoContainer);
        removePreloader(cardsContainer);
        if (err.message === '404') {
            videoContainer.append(errorTmp.content.cloneNode(true));
        }
    }
}

form.onsubmit = (e) => {
    e.preventDefault();
    cardsContainer.innerHTML = '';
    const oldErr = videoContainer.querySelector('.error');
    if (oldErr) oldErr.remove();
    showPreloader(preloaderTmp, videoContainer);
    showPreloader(preloaderTmp, cardsContainer);
    
    const city = form.city.value;
    const times = [...form.time].filter(c => c.checked).map(c => c.value);
    let searchUrl = endpoint;
    if (city) searchUrl += `filters[city][$containsi]=${city}&`;
    times.forEach(t => searchUrl += `filters[time_of_day][$eqi]=${t}&`);
    main(searchUrl);
};

main(endpoint);