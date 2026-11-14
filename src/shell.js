// Standalone page skeleton shared by the build scripts, so every page has a doctype,
// charset, viewport and safe-area padding when served as a plain static file.
module.exports = {
  open: (lang = "en") =>
    `<!doctype html><html lang="${lang}"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">` +
    `<style>:root{box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}` +
    `html{scroll-padding-top:env(safe-area-inset-top,0px)}body{margin:0;padding:0}img{max-width:100%}` +
    `[hidden]:not([hidden=until-found i]){display:none!important}</style></head><body>\n`,
  close: "\n</body></html>\n"
};
