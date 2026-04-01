const css = `/* latin */
@font-face {
  font-family: "Codex Mock Font";
  src: url(https://fonts.gstatic.com/s/codexmock/v1/mock-font.woff2);
  font-weight: 400;
  font-style: normal;
}`;

module.exports = new Proxy({}, {
  get() {
    return css;
  },
});
