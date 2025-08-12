document.addEventListener("DOMContentLoaded", function () {  
  // Configurações visuais que você já tinha
  const options = {
    nodes: {
      shape: "hexagon",
      size: 20,
      font: { color: "#ffffff", size: 12 },
      borderWidth: 2,
      color: { background: "#FFE600", border: "#FFE600" }
    },
    edges: {
      width: 2,
      smooth: { type: "continuous" },
      color: "#FFE600",
      arrows: { to: { enabled: true } }
    },
    physics: {
      stabilization: { iterations: 100 },
      repulsion: { nodeDistance: 150 },
    },
    layout: {
      randomSeed: 42,
    },
    interaction: {
      hover: true,
    }
  };


  

  // Carregar dados do servidor
  fetch('/notes/graph_data')
    .then(response => {
      if (!response.ok) {
        throw new Error('Erro ao carregar dados do grafo');
      }
      return response.json();
    })
    .then(data => {
      const container = document.getElementById("graph");
      
      // Converter os dados do servidor para o formato do vis.js
      const nodes = new vis.DataSet(
        data.nodes.map(node => ({
          ...node,
          shape: "hexagon",
          color: { background: "#FFE600", border: "#FFE600" }
        }))
      );
      
      const edges = new vis.DataSet(
        data.edges.map(edge => ({
          ...edge,
          color: "#FFE600"
        }))
      );
      
      const graphData = { nodes, edges };
      const network = new vis.Network(container, graphData, options);

      // Adicionar interação de clique
      network.on("click", function (params) {
        if (params.nodes.length > 0) {
          const nodeId = params.nodes[0];
          const node = nodes.get(nodeId);
          // Redirecionar para a nota ao invés de alert
          window.location.href = `/notes${nodeId}`;
        }
      });
    })
    .catch(error => {
      console.error("Erro:", error);
      // Mostrar mensagem de erro para o usuário
      document.getElementById("graph").innerHTML = `
        <div class="error-message">
          <p>Não foi possível carregar o grafo. Tente recarregar a página.</p>
          <p>${error.message}</p>
        </div>
      `;
    });
});



// Variável global para a rede
let network;
let allNotes = [];

// Função para carregar todas as notas para os selects
async function loadAllNotes() {
    try {
        const response = await fetch('/notes/all');
        if (!response.ok) throw new Error('Erro ao carregar notas');
        allNotes = await response.json();
        
        const sourceSelect = document.getElementById('sourceNote');
        const targetSelect = document.getElementById('targetNote');
        
        // Limpar e popular os selects
        sourceSelect.innerHTML = '';
        targetSelect.innerHTML = '';
        
        allNotes.forEach(note => {
            const option = document.createElement('option');
            option.value = note.id;
            option.textContent = note.title;
            sourceSelect.appendChild(option.cloneNode(true));
            targetSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Erro:', error);
        alert('Não foi possível carregar a lista de notas');
    }
}

// Configuração dos modais
function setupModals() {
    // Elementos
    const modalNota = document.getElementById('modalNota');
    const modalConexao = document.getElementById('modalConexao');
    const btnNovaNota = document.getElementById('btnNovaNota');
    const btnNovaConexao = document.getElementById('btnNovaConexao');
    const spanNota = modalNota.querySelector('.close');
    const spanConexao = modalConexao.querySelector('.close');

    // Abrir modal de nota
    btnNovaNota.onclick = function() {
        modalNota.style.display = 'block';
        document.getElementById('noteTitle').focus();
    }

    // Abrir modal de conexão
    btnNovaConexao.onclick = function() {
        loadAllNotes();
        modalConexao.style.display = 'block';
    }

    // Fechar modais
    spanNota.onclick = function() { modalNota.style.display = 'none'; }
    spanConexao.onclick = function() { modalConexao.style.display = 'none'; }

    // Fechar ao clicar fora
    window.onclick = function(event) {
        if (event.target === modalNota) modalNota.style.display = 'none';
        if (event.target === modalConexao) modalConexao.style.display = 'none';
    }

    // Formulário de nova nota
    document.getElementById('formNota').onsubmit = async function(e) {
        e.preventDefault();
        
        const title = document.getElementById('noteTitle').value;
        const content = document.getElementById('noteContent').value;
        const tags = document.getElementById('noteTags').value.split(',').map(t => t.trim());
        
        try {
            const response = await fetch('/notessave', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    'title': title,
                    'content': content + ' ' + tags.map(t => `#${t}`).join(' ')
                })
            });
            
            if (response.ok) {
                alert('Nota criada com sucesso!');
                modalNota.style.display = 'none';
                this.reset();
                
                // Atualizar o grafo
                updateGraph();
            } else {
                throw new Error('Erro ao criar nota');
            }
        } catch (error) {
            console.error('Erro:', error);
            alert('Erro ao criar nota: ' + error.message);
        }
    };

    // Formulário de nova conexão
    document.getElementById('formConexao').onsubmit = async function(e) {
        e.preventDefault();
        
        const sourceId = document.getElementById('sourceNote').value;
        const targetId = document.getElementById('targetNote').value;
        
        try {
            const response = await fetch('/notes/create_link', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    source_id: sourceId,
                    target_id: targetId
                })
            });
            
            if (response.ok) {
                alert('Conexão criada com sucesso!');
                modalConexao.style.display = 'none';
                
                // Atualizar o grafo
                updateGraph();
            } else {
                throw new Error('Erro ao criar conexão');
            }
        } catch (error) {
            console.error('Erro:', error);
            alert('Erro ao criar conexão: ' + error.message);
        }
    };
}

// Função para atualizar o grafo
// Substitua a função updateGraph por esta versão melhorada
async function updateGraph() {
    try {
        const response = await fetch('/notes/graph_data?_=' + Date.now()); // Cache buster
        if (!response.ok) throw new Error('Erro ao atualizar grafo');
        const data = await response.json();
        
        // Atualizar os dados da rede
        network.setData({
            nodes: new vis.DataSet(
                data.nodes.map(node => ({
                    ...node,
                    shape: "hexagon",
                    color: { background: "#FFE600", border: "#FFE600" }
                }))
            ),
            edges: new vis.DataSet(
                data.edges.map(edge => ({
                    ...edge,
                    color: "#FFE600"
                }))
            )
        });
        
        // Focar na nova nota adicionada (se houver)
        if (window.lastAddedNodeId) {
            network.focus(window.lastAddedNodeId, { animation: true });
            delete window.lastAddedNodeId;
        }
    } catch (error) {
        console.error('Erro ao atualizar grafo:', error);
    }
}

// Modifique o manipulador de envio do formulário de nota
document.getElementById('formNota').onsubmit = async function(e) {
    e.preventDefault();
    
    const title = document.getElementById('noteTitle').value;
    const content = document.getElementById('noteContent').value;
    const tags = document.getElementById('noteTags').value.split(',').map(t => t.trim());
    
    try {
        const response = await fetch('/notessave', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                'title': title,
                'content': content + ' ' + tags.map(t => `#${t}`).join(' ')
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            window.lastAddedNodeId = result.note_id; // Armazena o ID da nova nota
            
            showNotification('Nota criada com sucesso!');
            modalNota.style.display = 'none';
            this.reset();
            
            // Atualizar o grafo imediatamente
            await updateGraph();
        } else {
            throw new Error(await response.text());
        }
    } catch (error) {
        console.error('Erro:', error);
        showNotification('Erro ao criar nota: ' + error.message, 'error');
    }
};



// Inicializar os modais quando o DOM estiver pronto
document.addEventListener("DOMContentLoaded", function() {
    // ... (seu código existente de inicialização do grafo)
    
    // Adicione esta linha após criar a rede
    setupModals();
});


