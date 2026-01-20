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

/* ТЕМПЛЕЙТЫ (Ищем строго по data-workflow) */
const cardTmp = document.querySelector('[data-workflow="card"]');
const preloaderTmp = document.querySelector('[data-workflow="preloader"]');
const videoNotFoundTmp = document.querySelector('[data-workflow="error"]');
const moreButtonTmp = document.querySelector('[data-workflow="more-button"]');

let cardsOnPageState = [];

// Первая загрузка
showPreloader(preloaderTmp, videoContainer);
showPreloader(preloaderTmp, cardsContainer);
mainMechanics(endpoint);

form.onsubmit = (e) => {
  e.preventDefault();
  cardsContainer.textContent = '';
  const errorEl = videoContainer.querySelector('.error');
  if (errorEl) errorEl.remove();

  showPreloader(preloaderTmp, videoContainer);
  showPreloader(preloaderTmp, cardsContainer);
  
  const formData = serializeFormData(form);
  const requestUrl = generateFilterRequest(endpoint, formData.city, formData.timeArray);
  mainMechanics(requestUrl);
};

async function mainMechanics(url) {
  try {
    const response = await fetch(url);
    const data = await response.json();
    cardsOnPageState = data.results;

    if (!data?.results?.[0]) throw new Error('not-found');

    appendCards({ baseUrl: BASE_URL, dataArray: data.results, cardTmp, container: cardsContainer });
    setVideo({ baseUrl: BASE_URL, video: videoElement, videoUrl: data.results[0].video.url, posterUrl: data.results[0].poster.url });
    
    const firstCard = document.querySelectorAll('.content__card-link')[0];
    if (firstCard) firstCard.classList.add('content__card-link_current');

    await waitForReadyVideo(videoElement);
    await delay(preloaderWaitindTime);
    removePreloader(videoContainer, '.preloader');
    removePreloader(cardsContainer, '.preloader');

    chooseCurrentVideo({
      baseUrl: BASE_URL,
      videoData: cardsOnPageState,
      cardLinksSelector: '.content__card-link',
      currentLinkClassName: 'content__card-link_current',
      mainVideo: videoElement,
    });

    showMoreCards({
      dataArray: data,
      buttonTemplate: moreButtonTmp,
      cardsContainer,
      buttonSelector: '.more-button',
      initialEndpoint: url,
      baseUrl: BASE_URL,
      cardTmp: cardTmp,
    });
  } catch (err) {
    removePreloader(videoContainer, '.preloader');
    removePreloader(cardsContainer, '.preloader');
    if (err.message === 'not-found') {
      showError(videoContainer, videoNotFoundTmp, 'Нет подходящих видео =(');
    } else {
      showError(videoContainer, videoNotFoundTmp, 'Ошибка получения данных :(');
    }
  }
}

/* УТИЛИТЫ */
async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForReadyVideo(video) {
  return new Promise((resolve) => {
    video.oncanplaythrough = resolve;
    if (video.readyState >= 4) resolve();
  });
}

function showPreloader(tmp, parent) {
  if (!tmp) return;
  const node = tmp.content.cloneNode(true);
  parent.append(node);
}

function removePreloader(parent, preloaderSelector) {
  const preloader = parent.querySelector(preloaderSelector);
  if (preloader) preloader.remove();
}

function appendCards({ baseUrl, dataArray, cardTmp, container }) {
  dataArray.forEach((el) => {
    const node = cardTmp.content.cloneNode(true);
    node.querySelector('a').setAttribute('id', el.id);
    node.querySelector('.content__video-card-title').textContent = el.city;
    node.querySelector('.content__video-card-description').textContent = el.description;
    const img = node.querySelector('.content__video-card-thumbnail');
    img.setAttribute('src', `${baseUrl}${el.thumbnail.url}`);
    img.setAttribute('alt', el.description);
    container.append(node);
  });
}

function setVideo({ baseUrl, video, videoUrl, posterUrl }) {
  video.setAttribute('src', `${baseUrl}${videoUrl}`);
  video.setAttribute('poster', `${baseUrl}${posterUrl}`);
}

function serializeFormData(form) {
  const city = form.querySelector('input[name="city"]');
  const checkboxes = form.querySelectorAll('input[name="time"]');
  const checkedValuesArray = [...checkboxes].filter(item => item.checked).map(item => item.value);
  return { city: city.value, timeArray: checkedValuesArray };
}

function generateFilterRequest(endpoint, city, timeArray) {
  let url = endpoint;
  if (city) url += `filters[city][$containsi]=${city}&`;
  if (timeArray) {
    timeArray.forEach((timeslot) => {
      url += `filters[time_of_day][$eqi]=${timeslot}&`;
    });
  }
  return url;
}

function chooseCurrentVideo({ baseUrl, videoData, cardLinksSelector, currentLinkClassName, mainVideo }) {
  const cardsList = document.querySelectorAll(cardLinksSelector);
  cardsList.forEach((item) => {
    item.onclick = async (e) => {
      e.preventDefault();
      if (item.classList.contains(currentLinkClassName)) return;
      cardsList.forEach((link) => link.classList.remove(currentLinkClassName));
      item.classList.add(currentLinkClassName);
      
      showPreloader(preloaderTmp, videoContainer);
      const videoObj = videoData.find((video) => String(video.id) === String(item.id));
      setVideo({ baseUrl, video: mainVideo, videoUrl: videoObj.video.url, posterUrl: videoObj.poster.url });
      
      await waitForReadyVideo(mainVideo);
      await delay(preloaderWaitindTime);
      removePreloader(videoContainer, '.preloader');
    };
  });
}

function showError(container, errorTemplate, errorMessage) {
  const node = errorTemplate.content.cloneNode(true);
  node.querySelector('.error__title').textContent = errorMessage;
  container.append(node);
}

function showMoreCards({ dataArray, buttonTemplate, cardsContainer, buttonSelector, initialEndpoint, baseUrl, cardTmp }) {
  if (dataArray.pagination.page >= dataArray.pagination.pageCount) return;
  const buttonNode = buttonTemplate.content.cloneNode(true);
  cardsContainer.append(buttonNode);
  const buttonInDOM = cardsContainer.querySelector(buttonSelector);

  buttonInDOM.onclick = async () => {
    let nextUrl = `${initialEndpoint}pagination[page]=${dataArray.pagination.page + 1}&`;
    try {
      const response = await fetch(nextUrl);
      const data = await response.json();
      buttonInDOM.remove();
      cardsOnPageState = [...cardsOnPageState, ...data.results];
      appendCards({ baseUrl, dataArray: data.results, cardTmp, container: cardsContainer });
      chooseCurrentVideo({
        baseUrl: BASE_URL,
        videoData: cardsOnPageState,
        cardLinksSelector: '.content__card-link',
        currentLinkClassName: 'content__card-link_current',
        mainVideo: videoElement,
      });
      showMoreCards({ dataArray: data, buttonTemplate, cardsContainer, buttonSelector, initialEndpoint, baseUrl, cardTmp });
    } catch (err) { console.error(err); }
  };
}
