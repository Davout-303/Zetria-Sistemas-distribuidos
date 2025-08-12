class FlashcardsAPI {
    constructor() {
        this.baseURL = window.location.origin;
        this.apiURL = `${this.baseURL}/api`;
    }

    //Fazer requisição HTTP

    async request(url, options = {}) {
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'same-origin'
        };

        const config = { ...defaultOptions, ...options };

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('Erro na requisição:', error);
            throw error;
        }
    }

    
    async listarFlashcards() {
        return await this.request(`${this.apiURL}/flashcards`);
    }

    
    async obterFlashcard(id) {
        return await this.request(`${this.apiURL}/flashcards/${id}`);
    }

    
    async criarFlashcard(dados) {
        return await this.request(`${this.apiURL}/flashcards`, {
            method: 'POST',
            body: JSON.stringify(dados)
        });
    }

    
    async atualizarFlashcard(id, dados) {
        return await this.request(`${this.apiURL}/flashcards/${id}`, {
            method: 'PUT',
            body: JSON.stringify(dados)
        });
    }

    
    async deletarFlashcard(id) {
        return await this.request(`${this.apiURL}/flashcards/${id}`, {
            method: 'DELETE'
        });
    }

    
    async listarNotas() {
        return await this.request(`${this.apiURL}/notas`);
    }
}

// GERENCIADOR DE FLASHCARDS

class FlashcardManager {
    constructor() {
        this.api = new FlashcardsAPI();
        this.flashcardsCarregados = [];
        this.flashcardAtual = 0;
        this.modoEstudo = false;
        this.mostrandoResposta = false;
    }

    
    async carregarFlashcards() {
        try {
            const response = await this.api.listarFlashcards();
            if (response.success) {
                this.flashcardsCarregados = response.flashcards;
                return this.flashcardsCarregados;
            } else {
                throw new Error(response.error || 'Erro ao carregar flashcards');
            }
        } catch (error) {
            console.error('Erro ao carregar flashcards:', error);
            throw error;
        }
    }

    
    async criarFlashcard(notaId, frente, verso) {
        try {
            const dados = {
                nota_id: notaId,
                front_content: frente,
                back_content: verso
            };

            const response = await this.api.criarFlashcard(dados);
            if (response.success) {
                
                this.flashcardsCarregados.unshift(response.flashcard);
                return response.flashcard;
            } else {
                throw new Error(response.error || 'Erro ao criar flashcard');
            }
        } catch (error) {
            console.error('Erro ao criar flashcard:', error);
            throw error;
        }
    }

    
    async deletarFlashcard(id) {
        try {
            const response = await this.api.deletarFlashcard(id);
            if (response.success) {
                
                this.flashcardsCarregados = this.flashcardsCarregados.filter(f => f.id !== id);
                return true;
            } else {
                throw new Error(response.error || 'Erro ao deletar flashcard');
            }
        } catch (error) {
            console.error('Erro ao deletar flashcard:', error);
            throw error;
        }
    }

    
    iniciarEstudo() {
        if (this.flashcardsCarregados.length === 0) {
            throw new Error('Nenhum flashcard disponível para estudo');
        }
        
        this.modoEstudo = true;
        this.flashcardAtual = 0;
        this.mostrandoResposta = false;
        
        
        this.flashcardsCarregados = this.embaralharArray(this.flashcardsCarregados);
        
        return this.obterFlashcardAtual();
    }

    
    obterFlashcardAtual() {
        if (!this.modoEstudo || this.flashcardsCarregados.length === 0) {
            return null;
        }
        
        return this.flashcardsCarregados[this.flashcardAtual];
    }

    
    mostrarResposta() {
        this.mostrandoResposta = true;
        return this.obterFlashcardAtual();
    }

    
    proximoFlashcard() {
        if (!this.modoEstudo) return null;
        
        this.flashcardAtual++;
        this.mostrandoResposta = false;
        
        if (this.flashcardAtual >= this.flashcardsCarregados.length) {
            
            this.modoEstudo = false;
            return null;
        }
        
        return this.obterFlashcardAtual();
    }

    
    flashcardAnterior() {
        if (!this.modoEstudo || this.flashcardAtual <= 0) return null;
        
        this.flashcardAtual--;
        this.mostrandoResposta = false;
        
        return this.obterFlashcardAtual();
    }

    
    obterEstatisticas() {
        return {
            total: this.flashcardsCarregados.length,
            atual: this.flashcardAtual + 1,
            restantes: this.flashcardsCarregados.length - this.flashcardAtual - 1,
            progresso: Math.round(((this.flashcardAtual + 1) / this.flashcardsCarregados.length) * 100)
        };
    }

    
    embaralharArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    
    resetarEstudo() {
        this.modoEstudo = false;
        this.flashcardAtual = 0;
        this.mostrandoResposta = false;
    }
}


function mostrarNotificacaoFlashcard(mensagem, tipo = 'info') {
    
    if (typeof mostrarNotificacao === 'function') {
        mostrarNotificacao(mensagem, tipo);
    } else {
       
        alert(mensagem);
    }
}


function confirmarAcaoFlashcard(mensagem, callback) {
    if (confirm(mensagem)) {
        callback();
    }
}


function formatarDataFlashcard(dataString) {
    const data = new Date(dataString);
    return data.toLocaleDateString('pt-BR');
}


function truncarTextoFlashcard(texto, limite = 100) {
    if (texto.length <= limite) return texto;
    return texto.substring(0, limite) + '...';
}


// Instância global do gerenciador de flashcards
const flashcardManager = new FlashcardManager();

// Exportar para uso global
window.FlashcardsAPI = FlashcardsAPI;
window.FlashcardManager = FlashcardManager;
window.flashcardManager = flashcardManager;
window.mostrarNotificacaoFlashcard = mostrarNotificacaoFlashcard;
window.confirmarAcaoFlashcard = confirmarAcaoFlashcard;
window.formatarDataFlashcard = formatarDataFlashcard;
window.truncarTextoFlashcard = truncarTextoFlashcard;

