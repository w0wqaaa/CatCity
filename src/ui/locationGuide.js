const LOCATION_GUIDES = {
  city: {
    title: "CatCity",
    subtitle: "Тихий город, где начинается странная история.",
    story: [
      "В CatCity все выглядит почти спокойно: торговцы ждут покупателей, страж охраняет дорогу, жители ищут тех, кто поможет с небольшими поручениями.",
      "Но в городе уже появился портал. Он ведет туда, где старые руины помнят больше, чем должны.",
    ],
    goals: [
      "Поговори с NPC и возьми первые квесты.",
      "Освой движение, миникарту, инвентарь и взаимодействие.",
      "Найди городской портал, когда будешь готов выйти за привычные улицы.",
    ],
    controls: [
      "WASD / стрелки - движение",
      "Shift - бег",
      "E - говорить или взаимодействовать",
      "Q - квесты, I - инвентарь, M - миникарта",
    ],
  },
  south_outskirts: {
    title: "Южная окраина",
    subtitle: "Дорога за городом уже не такая безопасная.",
    story: [
      "За воротами городские звуки быстро стихают. Здесь начинаются тропы, по которым ходят торговцы, разведчики и те, кто ищет пропавшие вещи.",
    ],
    goals: [
      "Следи за дорогами и выходами на миникарте.",
      "Ищи квестовые предметы и NPC за пределами города.",
      "Будь готов вернуться, если HP станет мало.",
    ],
    controls: [
      "Space - атака перед героем",
      "E - взаимодействие с объектами и переходами",
    ],
  },
  overgrown_garden: {
    title: "Заросший сад",
    subtitle: "Старый сад, где растения уже не просто растения.",
    story: [
      "Когда-то здесь были аккуратные дорожки и цветы. Теперь тропы заросли, а среди руин шевелятся агрессивные существа.",
    ],
    goals: [
      "Двигайся по открытым дорожкам и не застревай в зарослях.",
      "Побеждай мобов, чтобы получать золото.",
      "Следи за HP: враги могут атаковать в ответ.",
    ],
    controls: [
      "Space - ударить моба рядом",
      "Shift - быстро выйти из опасной зоны",
    ],
  },
  lost_portal_valley: {
    title: "Долина затерянных порталов",
    subtitle: "Узел будущих измерений и мини-уровней.",
    story: [
      "В этой долине порталы стоят на старых площадках, будто их кто-то расставил задолго до появления CatCity.",
      "Некоторые разломы пока нестабильны. Один уже открыл путь в Эхо-лабиринт.",
    ],
    goals: [
      "Ищи активные порталы: они подсвечены и реагируют на E.",
      "Закрытые порталы можно осмотреть, но они пока не переносят игрока.",
      "Используй зеленый портал, чтобы вернуться в город.",
    ],
    controls: [
      "E - войти в активный портал",
      "E - осмотреть закрытый портал",
      "M - свериться с миникартой",
    ],
  },
  portal_world_2: {
    title: "Долина порталов II",
    subtitle: "Новые порталы. Новые испытания.",
    story: [
      "За синим порталом скрывается ещё одна площадка. Здесь пока тихо — порталы закрыты и ждут своего часа.",
    ],
    goals: [
      "Активные порталы появятся со временем.",
      "Зелёный портал вернёт тебя обратно в первую долину.",
    ],
    controls: [
      "E — войти в портал",
      "M — миникарта",
    ],
  },
  echo_maze: {
    title: "Эхо-лабиринт",
    subtitle: "Первое испытание портала.",
    story: [
      "Здесь темно, тихо и слишком пусто. В центре лабиринта слышно эхо, а выходной портал молчит.",
      "Чтобы открыть выход, нужно активировать четыре руны в правильном порядке.",
    ],
    goals: [
      "Порядок рун: Лист -> Камень -> Луна -> Пламя.",
      "Верная руна начинает светиться и продвигает головоломку.",
      "Ошибка сбрасывает прогресс, наносит 1 HP урона и призывает Эхо-тень.",
      "После решения ты получишь 25 Gold и Осколок эха.",
    ],
    controls: [
      "E - активировать руну",
      "Space - отбиться от Эхо-тени",
      "E - выйти через портал после решения",
    ],
  },
  merchant_shop: {
    title: "Лавка торговца",
    subtitle: "Место, где золото превращается в полезные вещи.",
    story: [
      "Внутри лавки безопаснее, чем на дорогах. Торговец может продать простые предметы, которые пригодятся в путешествиях.",
    ],
    goals: [
      "Поговори с торговцем, чтобы открыть магазин.",
      "Покупки тратят Gold и добавляют предметы в инвентарь.",
      "Найди выход, чтобы вернуться в город.",
    ],
    controls: [
      "E - говорить с торговцем или выйти",
      "I - проверить инвентарь",
    ],
  },
  healer_house: {
    title: "Дом травницы",
    subtitle: "Тихое место для передышки.",
    story: [
      "Здесь пахнет травами и сухими цветами. Такие дома напоминают, что приключение не всегда начинается с боя.",
    ],
    goals: [
      "Осмотри интерьер и поговори с жителями, если они рядом.",
      "Запоминай такие места: позже они могут стать важными для квестов.",
    ],
    controls: [
      "E - взаимодействовать",
      "Esc - закрыть открытые окна",
    ],
  },
};

let guidePanel;
let closeButton;
let activeCloseHandler = null;

export function initLocationGuide() {
  if (guidePanel) {
    return guidePanel;
  }

  guidePanel = document.createElement("div");
  guidePanel.id = "locationGuide";
  guidePanel.className = "hidden";
  guidePanel.innerHTML = `
    <div class="location-guide-card">
      <div class="location-guide-kicker">Путеводитель</div>
      <h2 id="locationGuideTitle"></h2>
      <p id="locationGuideSubtitle" class="location-guide-subtitle"></p>
      <div id="locationGuideStory"></div>
      <h3>Что делать</h3>
      <ul id="locationGuideGoals"></ul>
      <h3>Управление здесь</h3>
      <ul id="locationGuideControls"></ul>
      <button id="closeLocationGuide" type="button">Понятно, в путь</button>
    </div>
  `;
  document.body.appendChild(guidePanel);
  closeButton = guidePanel.querySelector("#closeLocationGuide");
  closeButton.addEventListener("click", closeLocationGuide);
  return guidePanel;
}

export function openLocationGuide(locationId, { onClose } = {}) {
  initLocationGuide();
  const guide = LOCATION_GUIDES[locationId] || LOCATION_GUIDES.city;
  activeCloseHandler = onClose || null;

  guidePanel.querySelector("#locationGuideTitle").textContent = guide.title;
  guidePanel.querySelector("#locationGuideSubtitle").textContent = guide.subtitle;
  guidePanel.querySelector("#locationGuideStory").innerHTML = guide.story
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join("");
  guidePanel.querySelector("#locationGuideGoals").innerHTML = guide.goals
    .map((line) => `<li>${escapeHtml(line)}</li>`)
    .join("");
  guidePanel.querySelector("#locationGuideControls").innerHTML = guide.controls
    .map((line) => `<li>${escapeHtml(line)}</li>`)
    .join("");

  guidePanel.classList.remove("hidden");
  closeButton.focus();
}

export function closeLocationGuide() {
  if (!guidePanel || guidePanel.classList.contains("hidden")) {
    return false;
  }

  guidePanel.classList.add("hidden");
  const handler = activeCloseHandler;
  activeCloseHandler = null;
  handler?.();
  return true;
}

export function isLocationGuideOpen() {
  return Boolean(guidePanel && !guidePanel.classList.contains("hidden"));
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
