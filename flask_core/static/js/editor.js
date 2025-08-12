
marked.setOptions({
  breaks: true,
  gfm: true,
});

const editor = document.getElementById("editor");
const preview = document.getElementById("vizualizacao");


let updateTimeout;
const updatePreview = () => {
  preview.innerHTML = marked.parse(editor.value);
};

const debouncedUpdate = () => {
  clearTimeout(updateTimeout);
  updateTimeout = setTimeout(updatePreview, 100);
};


editor.addEventListener("entrada", debouncedUpdate);


updatePreview();


editor.addEventListener("scroll", () => {
  preview.scrollTop = editor.scrollTop;
});


editor.addEventListener("borrao", () => {
  editor.focus();
});


window.addEventListener("carregar", () => {
  editor.focus();
});


editor.addEventListener("keydown", (e) => {
  if (e.key === "Tab") {
    e.preventDefault();
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    editor.value =
      editor.value.substring(0, start) + "    " + editor.value.substring(end);
    editor.selectionStart = editor.selectionEnd = start + 4;
    updatePreview();
  }
});
