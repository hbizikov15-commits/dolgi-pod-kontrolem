/* Метки «из какого поста пришёл».
 *
 * Как это работает:
 *   1. В посте ссылка выглядит так:  https://<сайт>/?from=p10
 *      (можно добавить utm_source=telegram&utm_medium=post&utm_campaign=dolgi — они тоже читаются)
 *   2. Скрипт берёт код оттуда и запоминает его в браузере.
 *   3. Все кнопки «получить материалы» получают этот код:
 *      https://t.me/KhetagJr_bot?start=p10
 *   4. Бот записывает код в таблицу лидов — видно, какой пост привёл человека.
 *
 * Никаких внешних запросов: код никуда не отправляется со страницы, только в ссылку на бота.
 * Если код пустой или странный — ставим direct, чтобы лид не потерялся.
 */

(function () {
  'use strict';

  var BOT = 'KhetagJr_bot';
  var CHANNEL = 'dolgipodkontrol1'; // запасной путь, если бот недоступен
  var STORE_KEY = 'dolgi_code';

  // Допустимые коды: p10, p15, p23, yt01, hub, direct и подобные.
  // Всё остальное отбрасываем, чтобы чужой мусор не попал в таблицу.
  var CODE_OK = /^[a-z0-9_-]{1,24}$/;

  function izStroki(parametry, imya) {
    var znachenie = parametry.get(imya);
    return znachenie ? String(znachenie).trim().toLowerCase() : '';
  }

  function kod() {
    var parametry = new URLSearchParams(window.location.search);
    var kandidat = izStroki(parametry, 'from') || izStroki(parametry, 'utm_content');
    if (CODE_OK.test(kandidat)) {
      try { localStorage.setItem(STORE_KEY, kandidat); } catch (e) { /* приватный режим */ }
      return kandidat;
    }
    try {
      var zapomnennyy = localStorage.getItem(STORE_KEY) || '';
      if (CODE_OK.test(zapomnennyy)) return zapomnennyy;
    } catch (e) { /* приватный режим */ }
    return 'direct';
  }

  var KOD = kod();

  // Заголовок под тему поста: одна главная страница подстраивается под метку,
  // чтобы человек, пришедший из поста №22, сразу видел свою тему, а не общий текст.
  // Список меток сверяется с voronka.json проверкой в proverka.cjs.
  var PRIVETSTVIYA = {
    p22: {
      zagolovok: 'Платишь минимальный платёж, а долг не падает',
      podzagolovok: 'Посчитай проценты по своим долгам: остаток × ставка ÷ 12. Если выходит больше твоего платежа — долг растёт, даже когда платишь вовремя.',
    },
    p25: {
      zagolovok: 'Первый шаг: выписать все долги в одну таблицу',
      podzagolovok: 'Двадцать минут — и вместо тумана из уведомлений появляется список: кому, сколько и под какой процент. Дальше видно, что закрывать первым.',
    },
    p27: {
      zagolovok: 'Проверь свой микрозайм на переплату',
      podzagolovok: 'По договорам с 1 апреля 2026 года переплата ограничена законом. Сравни тело займа и текущий долг — и посмотри, где закон на твоей стороне.',
    },
    'yt*': {
      zagolovok: 'Считать долги, а не надеяться',
      podzagolovok: 'Короткие ролики и бесплатные инструменты: калькулятор долгов, чек-лист «Первые 7 дней» и таблица-трекер. Без мотивации и без обещаний списать то, что списать нельзя.',
    },
  };

  // Ключ со звёздочкой — семейство меток: 'yt*' подходит для yt01, yt02 и так далее.
  function privetstviePoKodu(kodPosta) {
    if (PRIVETSTVIYA[kodPosta]) return PRIVETSTVIYA[kodPosta];
    var semya = String(kodPosta).replace(/\d+$/, '') + '*';
    return PRIVETSTVIYA[semya] || null;
  }

  function podstavitPrivetstvie() {
    var svoy = privetstviePoKodu(KOD);
    if (!svoy) return;
    var zagolovok = document.querySelector('[data-hero-h1]');
    var podzagolovok = document.querySelector('[data-hero-p]');
    if (zagolovok && svoy.zagolovok) zagolovok.textContent = svoy.zagolovok;
    if (podzagolovok && svoy.podzagolovok) podzagolovok.textContent = svoy.podzagolovok;
  }

  function ssylkaNaBota(kodPosta) {
    return 'https://t.me/' + BOT + '?start=' + encodeURIComponent(kodPosta || KOD);
  }

  function ssylkaNaKanal() {
    return 'https://t.me/' + CHANNEL;
  }

  function podstavit() {
    podstavitPrivetstvie();

    // Кнопки «получить материалы в Telegram»
    var bot = document.querySelectorAll('a[data-bot]');
    for (var i = 0; i < bot.length; i++) {
      var svoy = bot[i].getAttribute('data-bot');
      bot[i].setAttribute('href', ssylkaNaBota(svoy && CODE_OK.test(svoy) ? svoy : KOD));
      if (!bot[i].getAttribute('rel')) {
        bot[i].setAttribute('rel', 'noopener');
      }
    }

    // Внутренние ссылки «следующий шаг» — код едет с человеком дальше
    var vnutri = document.querySelectorAll('a[data-s-kodom]');
    for (var j = 0; j < vnutri.length; j++) {
      var baza = vnutri[j].getAttribute('href').split('?')[0];
      vnutri[j].setAttribute('href', baza + '?from=' + encodeURIComponent(KOD));
    }

    var kanal = document.querySelectorAll('a[data-kanal]');
    for (var k = 0; k < kanal.length; k++) {
      kanal[k].setAttribute('href', ssylkaNaKanal());
      kanal[k].setAttribute('rel', 'noopener');
    }

    // Показать метку там, где она уместна (блок захвата)
    var mesta = document.querySelectorAll('[data-pokazat-kod]');
    for (var m = 0; m < mesta.length; m++) {
      mesta[m].textContent = KOD === 'direct' ? 'прямой переход' : KOD;
    }

    // Год в подвале, чтобы не править вручную
    var gody = document.querySelectorAll('[data-god]');
    for (var g = 0; g < gody.length; g++) {
      gody[g].textContent = String(new Date().getFullYear());
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', podstavit);
  } else {
    podstavit();
  }
})();
