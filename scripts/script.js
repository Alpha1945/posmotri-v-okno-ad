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

/* ТЕМПЛЕЙТЫ (ПОИСК СТРОГО ПО WORKFLOW) */
const preloaderTmp = document.querySelector('[data-workflow="preloader"]');
const cardTmp = document.querySelector('[data-workflow="card"]');
const moreButtonTmp = document.querySelector('[data-workflow="more-button"]');
const videoNotFoundTmp = document.querySelector('[data-workflow="error"]');

let cardsOnPageState = [];

/* МЕХАНИКА */

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
  if (tmp && parent) {
    const node = tmp.content.cloneNode(true);
    parent.append(node);
  }
}

function removePreloader(parent) {
  const preloader = parent.querySelector('.preloader');
  if (preloader) preloader.remove();
}

function setVideo(video, data) {
  video.src = `${BASE_URL}${data.video.url}`;
  video.poster = `${BASE_URL}${data.poster.url}`;
}

function renderCards(dataArray) {
  dataArray.forEach(item => {
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
}

async function init(url) {
  try {
    const res = await fetch(url);
    const data = await res.json();
    cardsOnPageState = data.results;

    if (!cardsOnPageState || cardsOnPageState.length === 0) {
      throw new Error('404');
    }

    renderCards(cardsOnPageState);
    setVideo(videoElement, cardsOnPageState[0]);
    
    const first = cardsContainer.querySelector('.content__card-link');
    if (first) first.classList.add('content__card-link_current');

    await waitForReadyVideo(videoElement);
    await delay(preloaderWaitindTime);
    
    removePreloader(videoContainer);
    removePreloader(cardsContainer);
    
    setupVideoSelection();
    setupMoreButton(data, url);

  } catch (err) {
    removePreloader(videoContainer);
    removePreloader(cardsContainer);
    if (err.message === '404') {
      const node = videoNotFoundTmp.content.cloneNode(true);
      videoContainer.append(node);
    }
  }
}

function setupVideoSelection() {
  const links = document.querySelectorAll('.content__card-link');
  links.forEach(link => {
    link.onclick = async (e) => {
      e.preventDefault();
      if (link.classList.contains('content__card-link_current')) return;
      
      links.forEach(l => l.classList.remove('content__card-link_current'));
      link.classList.add('content__card-link_current');
      
      showPreloader(preloaderTmp, videoContainer);
      const videoData = cardsOnPageState.find(v => String(v.id) === String(link.id));
      setVideo(videoElement, videoData);
      
      await waitForReadyVideo(videoElement);
      await delay(preloaderWaitindTime);
      removePreloader(videoContainer);
    };
  });
}

function setupMoreButton(data, currentUrl) {
  if (data.pagination.page >= data.pagination.pageCount) return;
  
  const node = moreButtonTmp.content.cloneNode(true);
  cardsContainer.append(node);
  const btn = cardsContainer.querySelector('.more-button');
  
  btn.onclick = async () => {
    const nextPage = data.pagination.page + 1;
    const res = await fetch(`${currentUrl}&pagination[page]=${nextPage}`);
    const nextData = await res.json();
    
    btn.remove();
    cardsOnPageState = [...cardsOnPageState, ...nextData.results];
    renderCards(nextData.results);
    setupVideoSelection();
    setupMoreButton(nextData, currentUrl);
  };
}

form.onsubmit = (e) => {
  e.preventDefault();
  cardsContainer.innerHTML = '';
  const error = videoContainer.querySelector('.error');
  if (error) error.remove();
  
  showPreloader(preloaderTmp, videoContainer);
  showPreloader(preloaderTmp, cardsContainer);
  
  const city = form.city.value;
  const times = [...form.time].filter(c => c.checked).map(c => c.value);
  let searchUrl = endpoint;
  if (city) searchUrl += `filters[city][$containsi]=${city}&`;
  times.forEach(t => searchUrl += `filters[time_of_day][$eqi]=${t}&`);
  
  init(searchUrl);
};

/* СТАРТ */
init(endpoint);
