document.addEventListener("DOMContentLoaded", function() {
    
    const deckList = document.getElementById('deck-list');
    const searchInput = document.querySelector('.entrada-pesquisa');
    const createDeckBtn = document.querySelector('acao-botao:first-child');
    
    
    let decks = [];

    
    function loadDecks() {
        const savedDecks = localStorage.getItem('decks');
        if (savedDecks) {
            decks = JSON.parse(savedDecks);
            renderDecks();
        } else {
            
            decks = [
                {nome: "Segunda guerra mundial", cards: []},
                {nome: "Guerra fria", cards: []},
                {nome: "Revolução Industrial", cards: []},
                {nome: "Geografia do Brasil", cards: []}
            ];
            saveDecks();
            renderDecks();
        }
    }

    
    function renderDecks(filteredDecks = null) {
        deckList.innerHTML = '';
        const decksToRender = filteredDecks || decks;
        
        decksToRender.forEach((deck, index) => {
            const deckElement = document.createElement('div');
            deckElement.className = 'termo-pesquisa';
            deckElement.innerHTML = `
                <span class="deck-name" data-index="${index}">${deck.name}</span>
                <div class="term-icons">
                    <i class="fas fa-edit edit-deck" title="Editar" data-index="${index}"></i>
                    <i class="fas fa-trash-alt delete-deck" title="Excluir" data-index="${index}"></i>
                </div>
            `;
            deckList.appendChild(deckElement);
        });

        
        addDeckNameEvents();
        addEditEvents();
        addDeleteEvents();
    }

    
    function addDeckNameEvents() {
        document.querySelectorAll('.deck-name').forEach(deckName => {
            deckName.addEventListener('click', function() {
                const index = this.getAttribute('data-index');
                openDeck(index);
            });
        });
    }

   
    function openDeck(index) {
        
        localStorage.setItem('selectedDeck', JSON.stringify(decks[index]));
        
        window.location.href = 'interface.flashcard2.html';
    }

    
    function addEditEvents() {
        document.querySelectorAll('.edit-deck').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation(); 
                const index = this.getAttribute('data-index');
                editDeck(index);
            });
        });
    }

    
    function addDeleteEvents() {
        document.querySelectorAll('.delete-deck').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation(); 
                const index = this.getAttribute('data-index');
                deleteDeck(index);
            });
        });
    }

    
    function createNewDeck() {
        const deckName = prompt("Digite o nome do novo baralho:");
        if (deckName && deckName.trim()) {
            decks.push({
                nome: deckName.trim(),
                cards: []
            });
            saveDecks();
            renderDecks();
        }
    }

    
    function editDeck(index) {
        const newName = prompt("Editar nome do baralho:", decks[index].nome);
        if (newName && newName.trim()) {
            decks[index].nome = newName.trim();
            saveDecks();
            renderDecks();
        }
    }

    
    function deleteDeck(index) {
        if (confirm(`Tem certeza que deseja excluir o baralho "${decks[index].nome}"?`)) {
            decks.splice(index, 1);
            saveDecks();
            renderDecks();
        }
    }

    
    function filterDecks(searchTerm) {
        const filtered = decks.filter(deck => 
            deck.nome.toLowerCase().includes(searchTerm.toLowerCase())
        );
        renderDecks(filtered);
    }

    
    function saveDecks() {
        localStorage.setItem('decks', JSON.stringify(decks));
    }

    
    createDeckBtn.addEventListener('click', createNewDeck);
    
    searchInput.addEventListener('entrada', function() {
        filterDecks(this.value);
    });

    
    loadDecks();
});