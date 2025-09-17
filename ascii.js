// ascii.js
document.addEventListener("DOMContentLoaded", () => {
  const src = document.getElementById("asciiText");
  if (!src) return;

  const box = src.parentElement;

  const pre = document.createElement("pre");
  pre.id = "asciiPre";
  box.insertBefore(pre, src);

  const LEADING_BLANK_LINES = 1;
  const TRAILING_BLANK_LINES = 1;

  const raw = src.textContent.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const text =
    "\n".repeat(LEADING_BLANK_LINES) + raw + "\n".repeat(TRAILING_BLANK_LINES);

  let i = 0;
  function typeWriter() {
    if (i < text.length) {
      pre.textContent += text.charAt(i);
      i++;
      setTimeout(typeWriter, 5);
    }
  }

  pre.textContent = "";
  typeWriter();
});
