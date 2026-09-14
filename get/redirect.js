// Одна ссылка для Direct и постов: уводит в магазин той платформы,
// с которой открыли. Десктоп и всё неопознанное остаются на странице
// и выбирают магазин руками.
(function () {
  var ua = navigator.userAgent || "";

  // iPadOS 13+ представляется Macintosh, отличаем по наличию тачскрина.
  var isIOS = /iPad|iPhone|iPod/.test(ua) ||
    (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  var isAndroid = /Android/.test(ua);

  var target = isIOS
    ? "https://apps.apple.com/ru/app/id6763663680"
    : isAndroid
      ? "https://www.rustore.ru/catalog/app/com.acrab"
      : null;

  // replace, а не href: страница не остаётся в истории и кнопка «назад»
  // возвращает туда, откуда пришли, а не в цикл редиректа.
  if (target) location.replace(target);
})();
