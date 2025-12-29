const STYLE_ID = "temp-modtooltip-bg";

const css = `
.modttt .modtooltip {

  background-image: url("../ui/parchment.jpg");
  background-repeat: repeat;
  background-position: top left;
}
`;

let el = document.getElementById(STYLE_ID);
if (!el) {
  el = document.createElement("style");
  el.id = STYLE_ID;
  el.textContent = css;
  document.head.appendChild(el);
} else {
  el.textContent = css;
}