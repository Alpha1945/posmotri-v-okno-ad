/* КОНФИГ */
const preloaderWaitindTime = 1200;
const cardsOnPage = 5;
const BASE_URL = 'https://v-content.practicum-team.ru';
const endpoint = `${BASE_URL}/api/videos?pagination[pageSize]=${cardsOnPage}&`;

/* ЭЛЕМЕНТЫ СТРАНИЦЫ */
const cardsContainer = document.querySelector('.content__list');
const videoContainer = document.querySelector('[data-video-container]');
const videoElement = document.querySelector('.result__video');
const form = document.querySelector('.search-form');

/* ТЕМПЛЕЙТЫ — ПОИСК СТРОГО ПО DATA-WORKFLOW */
const cardTmp = document.querySelector('template[data-workflow="card"]');
const preloaderTmp = document.querySelector('template[data-workflow="preloader"]');
const videoNotFoundTmp = document.querySelector('template[data-workflow="error"]');
const moreButtonTmp = document.querySelector('template[data-workflow="more-button"]');

let cardsOnPageState = [];

/* ФУНКЦИИ */

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForReadyVideo(video) {
  return new Promise(resolve => {
    video.oncanplaythrough = resolve;
    if (video.readyState >= 4) resolve();
  });
}

function showPreloader(tmp, parent) {
  if (!tmp) return;
  const node = tmp.content.cloneNode(true);
  parent.append(node);
}

function removePreloader(parent, selector) {
  const el = parent.querySelector(selector);
  if (el) el.remove();
}

function setVideo({ baseUrl, video, videoUrl, posterUrl }) {
  video.src = `${baseUrl}${videoUrl}`;
  video.poster = `${baseUrl}${posterUrl}`;
}

function appendCards({ baseUrl, dataArray, cardTmp, container }) {
  dataArray.forEach(el => {
    const node = cardTmp.content.cloneNode(true);
    const link = node.querySelector('a');
    link.id = el.id;
    node.querySelector('.content__video-card-title').textContent = el.city;
    node.querySelector('.content__video-card-description').textContent = el.description;
    const img = node.querySelector('.content__video-card-thumbnail');
    img.src = `${baseUrl}${el.thumbnail.url}`;
    img.alt = el.city;
    container.append(node);
  });
}

function showError(container, tmp, message) {
  const node = tmp.content.cloneNode(true);
  node.querySelector('.error__title').textContent = message;
  container.append(node);
}

async function mainMechanics(url) {
  try {
    const res = await fetch(url);
    const data = await res.json();
    cardsOnPageState = data.results;

    if (!cardsOnPageState || cardsOnPageState.length === 0) throw new Error('not-found');

    appendCards({ baseUrl: BASE_URL, dataArray: cardsOnPageState, cardTmp, container: cardsContainer });
    setVideo({ baseUrl: BASE_URL, video: videoElement, videoUrl: cardsOnPageState[0].video.url, posterUrl: cardsOnPageState[0].poster.url });

    const firstCard = cardsContainer.querySelector('.content__card-link');
    if (firstCard) firstCard.classList.add('content__card-link_current');

    await waitForReadyVideo(videoElement);
    await delay(preloaderWaitindTime);
    removePreloader(videoContainer, '.preloader');
    removePreloader(cardsContainer, '.preloader');

    chooseCurrentVideo();
    renderMoreButton(data);
  } catch (err) {
    removePreloader(videoContainer, '.preloader');
    removePreloader(cardsContainer, '.preloader');
    if (err.message === 'not-found') {
      showError(videoContainer, videoNotFoundTmp, 'НЕТ ПОДХОДЯЩИХ ВИДЕО =(');
    }
  }
}

function chooseCurrentVideo() {
  const links = document.querySelectorAll('.content__card-link');
  links.forEach(link => {
    link.onclick = async (e) => {
      e.preventDefault();
      links.forEach(l => l.classList.remove('content__card-link_current'));
      link.classList.add('content__card-link_current');
      showPreloader(preloaderTmp, videoContainer);
      const videoObj = cardsOnPageState.find(v => String(v.id) === String(link.id));
      setVideo({ baseUrl: BASE_URL, video: videoElement, videoUrl: videoObj.video.url, posterUrl: videoObj.poster.url });
      await waitForReadyVideo(videoElement);
      await delay(preloaderWaitindTime);
      removePreloader(videoContainer, '.preloader');
    }
  });
}

function renderMoreButton(data) {
  if (data.pagination.page >= data.pagination.pageCount) return;
  const node = moreButtonTmp.content.cloneNode(true);
  cardsContainer.append(node);
  const btn = cardsContainer.querySelector('.more-button');
  btn.onclick = async () => {
    const nextUrl = `${endpoint}pagination[page]=${data.pagination.page + 1}`;
    const res = await fetch(nextUrl);
    const nextData = await res.json();
    btn.remove();
    cardsOnPageState = [...cardsOnPageState, ...nextData.results];
    appendCards({ baseUrl: BASE_URL, dataArray: nextData.results, cardTmp, container: cardsContainer });
    chooseCurrentVideo();
    renderMoreButton(nextData);
  }
}

function serializeFormData(f) {
  const city = f.city.value;
  const times = [...f.time].filter(c => c.checked).map(c => c.value);
  return { city, times };
}

function generateUrl(base, { city, times }) {
  let url = base;
  if (city) url += `filters[city][$containsi]=${city}&`;
  times.forEach(t => url += `filters[time_of_day][$eqi]=${t}&`);
  return url;
}

form.onsubmit = (e) => {
  e.preventDefault();
  cardsContainer.innerHTML = '';
  const err = videoContainer.querySelector('.error');
  if (err) err.remove();
  showPreloader(preloaderTmp, videoContainer);
  showPreloader(preloaderTmp, cardsContainer);
  mainMechanics(generateUrl(endpoint, serializeFormData(form)));
};

/* СТАРТ */
mainMechanics(endpoint);
