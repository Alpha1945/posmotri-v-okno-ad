/* КОНФИГ */
const preloaderWaitindTime = 1200;
const cardsOnPage = 5;
const BASE_URL = 'https://v-content.practicum-team.ru';
const endpoint = `${BASE_URL}/api/videos?pagination[pageSize]=${cardsOnPage}&`;

/* ЭЛЕМЕНТЫ СТРАНИЦЫ */
const cardsContainer = document.querySelector('.content__list');
// Используем data-атрибут для контейнера видео
const videoContainer = document.querySelector('[data-video-container]');
const videoElement = document.querySelector('.result__video');
const form = document.querySelector('.search-form');

/* ТЕМПЛЕЙТЫ (Теперь ищем строго по data-workflow, как просят в подсказке) */
const cardTmp = document.querySelector('[data-workflow="card"]');
const preloaderTmp = document.querySelector('[data-workflow="preloader"]');
const videoNotFoundTmp = document.querySelector('[data-workflow="error"]');
const moreButtonTmp = document.querySelector('[data-workflow="more-button"]');

/* МЕХАНИКА */

let cardsOnPageState = [];

// Первая загрузка
showPreloader(preloaderTmp, videoContainer);
showPreloader(preloaderTmp, cardsContainer);
mainMechanics(endpoint);

// Поиск
form.onsubmit = (e) => {
  e.preventDefault();
  cardsContainer.textContent = '';
  
  // Очищаем старые ошибки перед новым поиском
  const oldError = videoContainer.querySelector('.error');
  if (oldError) oldError.remove();

  showPreloader(preloaderTmp, videoContainer);
  showPreloader(preloaderTmp, cardsContainer);
  
  const formData = serializeFormData(form);
  const requestUrl = generateFilterRequest(
    endpoint,
    formData.city,
    formData.timeArray
  );
  mainMechanics(requestUrl);
};

/* ФУНКЦИЯ, КОТОРАЯ ВСЕ ГЕНЕРИТ */

async function mainMechanics(endpoint) {
  try {
    const response = await fetch(endpoint);
    const data = await response.json();
    cardsOnPageState = data.results;

    if (!data?.results || data.results.length === 0) {
      throw new Error('not-found');
    }

    appendCards({
      baseUrl: BASE_URL,
      dataArray: data.results,
      cardTmp,
      container: cardsContainer,
    });

    setVideo({
      baseUrl: BASE_URL,
      video: videoElement,
      videoUrl: data.results[0].video.url,
      posterUrl: data.results[0].poster.url,
    });

    // Делаем первую карточку активной
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
      initialEndpoint: endpoint,
      baseUrl: BASE_URL,
      cardTmp: cardTmp,
    });
  } catch (err) {
    console.log(err);
    removePreloader(videoContainer, '.preloader');
    removePreloader(cardsContainer, '.preloader');

    if (err.message === 'not-found') {
      showError(videoContainer, videoNotFoundTmp, 'НЕТ ПОДХОДЯЩИХ ВИДЕО =(');
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
    // Если видео уже загружено к этому моменту
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
    const link = node.querySelector('a');
    link.setAttribute('id', el.id);
    node.querySelector('.content__video-card-title').textContent = el.city;
    node.querySelector('.content__video-card-description').textContent = el.description;
    
    const img = node.querySelector('.content__video-card-thumbnail');
    img.setAttribute('src', `${baseUrl}${el.thumbnail.url}`);
    img.setAttribute('alt', el.city);
    
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
  const checkedValuesArray = [...checkboxes]
    .filter(item => item.checked)
    .map(item => item.value);

  return {
    city: city.value,
    timeArray: checkedValuesArray,
  };
}

function generateFilterRequest(endpoint, city, timeArray) {
  let url = endpoint;
  if (city) {
    url += `filters[city][$containsi]=${city}&`;
  }
  if (timeArray && timeArray.length > 0) {
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
      
      setVideo({
        baseUrl,
        video: mainVideo,
        videoUrl: videoObj.video.url,
        posterUrl: videoObj.poster.url,
      });

      await waitForReadyVideo(mainVideo);
      await delay(preloaderWaitindTime);
      removePreloader(videoContainer, '.preloader');
    };
  });
}

function showError(container, errorTemplate, errorMessage) {
  if (!errorTemplate) return;
  const node = errorTemplate.content.cloneNode(true);
  node.querySelector('.error__title').textContent = errorMessage;
  container.append(node);
}

function showMoreCards({ dataArray, buttonTemplate, cardsContainer, buttonSelector, initialEndpoint, baseUrl, cardTmp }) {
  if (!dataArray.pagination || dataArray.pagination.page === dataArray.pagination.pageCount) return;

  const node = buttonTemplate.content.cloneNode(true);
  cardsContainer.append(node);
  
  const buttonInDOM = cardsContainer.querySelector(buttonSelector);
  buttonInDOM.addEventListener('click', async () => {
    let currentPage = dataArray.pagination.page;
    let urlToFetch = `${initialEndpoint}pagination[page]=${currentPage + 1}&`;
    
    try {
      const response = await fetch(urlToFetch);
      const data = await response.json();
      buttonInDOM.remove();
      
      cardsOnPageState = cardsOnPageState.concat(data.results);
      
      appendCards({
        baseUrl,
        dataArray: data.results,
        cardTmp,
        container: cardsContainer,
      });

      chooseCurrentVideo({
        baseUrl: BASE_URL,
        videoData: cardsOnPageState,
        cardLinksSelector: '.content__card-link',
        currentLinkClassName: 'content__card-link_current',
        mainVideo: videoElement,
      });

      showMoreCards({
        dataArray: data,
        buttonTemplate,
        cardsContainer,
        buttonSelector,
        initialEndpoint,
        baseUrl,
        cardTmp,
      });
    } catch (err) {
      console.error(err);
    }
  });
}
