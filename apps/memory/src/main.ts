import kaplay from "kaplay";

const k = kaplay({
  width: 480,
  height: 720,
  background: [26, 26, 46],
  touchToMouse: true,
  canvas: document.createElement("canvas"),
});

document.body.appendChild(k.canvas);

k.add([
  k.text("Memory Pairs", { size: 48 }),
  k.pos(k.center()),
  k.anchor("center"),
  k.color(255, 255, 255),
]);
