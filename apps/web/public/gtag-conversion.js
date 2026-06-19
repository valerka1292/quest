function gtag_report_conversion(url) {
  var callback = function () {
    if (typeof(url) != 'undefined') {
      window.location = url;
    }
  };
  gtag('event', 'conversion', {
      'send_to': 'AW-18253190023/LJKmCOWm98EcEIen5v9D',
      'value': 1.0,
      'currency': 'UAH',
      'event_callback': callback
  });
  return false;
}
