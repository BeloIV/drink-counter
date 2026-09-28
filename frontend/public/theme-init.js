// Applies the saved theme before the first paint, so the page never flashes the wrong one.
// A separate file rather than an inline script, which the Content Security Policy blocks.
;(function () {
  var theme = localStorage.getItem('theme')
  if (theme !== 'dark' && theme !== 'light') theme = 'dark' // dark-first kiosk
  document.documentElement.setAttribute('data-theme', theme)
})()
