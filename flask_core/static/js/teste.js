function salvarNota() {
  const titulo = document.getElementById("titulo").value.trim();
  const conteudo = document.getElementById("editor").value;

  fetch("/salvar_nota", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ titulo, conteudo })
  })
    .then(res => res.json())
    .then(data => {
      alert("Nota salva com ID: " + data.id);
      window.location.reload();
    });
}
