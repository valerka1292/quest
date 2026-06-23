function gtag_report_conversion(url) {
  var callback = function () {
    if (typeof(url) != 'undefined') {
      window.location = url;
    }
  };
  
  try {
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'conversion', {
          'send_to': 'AW-18253190023/JY8tCL2T98McEIen5v9D',
          'value': 1.0,
          'currency': 'UAH',
          'event_callback': callback
      });
    } else if (window.dataLayer) {
      window.dataLayer.push({
        event: 'conversion',
        send_to: 'AW-18253190023/JY8tCL2T98McEIen5v9D',
        value: 1.0,
        currency: 'UAH',
        event_callback: callback
      });
    } else {
      console.warn("Google Ads скрипты заблокированы (например, AdBlock) или не загрузились.");
      callback();
    }
  } catch (e) {
    console.error("Ошибка при отправке конверсии Google Ads:", e);
    callback();
  }
  
  return false;
}
