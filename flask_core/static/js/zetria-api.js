class ZetriaAPI {
    constructor() {
        this.baseURL = window.location.origin;
        this.apiURL = `${this.baseURL}/api`;
    }

    // Fazer requisição HTTP

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

    // OPERAÇÕES CRUD

    
    async listarNotas() {
        return await this.request(`${this.apiURL}/notas`);
    }

    
    async obterNota(id) {
        return await this.request(`${this.apiURL}/notas/${id}`);
    }

    
    async criarNota(dados) {
        return await this.request(`${this.apiURL}/notas`, {
            method: 'POST',
            body: JSON.stringify(dados)
        });
    }

    
    async atualizarNota(id, dados) {
        return await this.request(`${this.apiURL}/notas/${id}`, {
            method: 'PUT',
            body: JSON.stringify(dados)
        });
    }

    
    async deletarNota(id) {
        return await this.request(`${this.apiURL}/notas/${id}`, {
            method: 'DELETE'
        });
    }
}


function mostrarNotificacao(mensagem, tipo = 'info') {
    
    const existentes = document.querySelectorAll('.notificacao-toast');
    existentes.forEach(n => n.remove());

    const toast = document.createElement('div');
    toast.className = `notificacao-toast notificacao-${tipo}`;
    toast.innerHTML = `
        <div class="toast-content">
            <i class="fas fa-${getIconeNotificacao(tipo)}"></i>
            <span>${mensagem}</span>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;

    
    if (!document.getElementById('toast-styles')) {
        const styles = document.createElement('style');
        styles.id = 'toast-styles';
        styles.textContent = `
            .notificacao-toast {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                min-width: 300px;
                max-width: 500px;
                padding: 16px;
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
                backdrop-filter: blur(10px);
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                animation: slideIn 0.3s ease-out;
            }
            
            .notificacao-success {
                background: rgba(46, 204, 113, 0.9);
                border: 1px solid rgba(46, 204, 113, 0.3);
                color: white;
            }
            
            .notificacao-error {
                background: rgba(231, 76, 60, 0.9);
                border: 1px solid rgba(231, 76, 60, 0.3);
                color: white;
            }
            
            .notificacao-warning {
                background: rgba(241, 196, 15, 0.9);
                border: 1px solid rgba(241, 196, 15, 0.3);
                color: #1e1e2f;
            }
            
            .notificacao-info {
                background: rgba(52, 152, 219, 0.9);
                border: 1px solid rgba(52, 152, 219, 0.3);
                color: white;
            }
            
            .toast-content {
                display: flex;
                align-items: center;
                gap: 8px;
                flex: 1;
            }
            
            .toast-close {
                background: none;
                border: none;
                color: inherit;
                cursor: pointer;
                padding: 4px;
                border-radius: 4px;
                opacity: 0.7;
                transition: opacity 0.2s;
            }
            
            .toast-close:hover {
                opacity: 1;
            }
            
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(styles);
    }

    document.body.appendChild(toast);

    // Auto-remover após 5 segundos
    setTimeout(() => {
        if (toast.parentElement) {
            toast.style.animation = 'slideIn 0.3s ease-out reverse';
            setTimeout(() => toast.remove(), 300);
        }
    }, 5000);
}

function getIconeNotificacao(tipo) {
    const icones = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    return icones[tipo] || 'info-circle';
}


function mostrarLoading(elemento, texto = 'Carregando...') {
    if (typeof elemento === 'string') {
        elemento = document.querySelector(elemento);
    }
    
    if (!elemento) return;

    elemento.innerHTML = `
        <div class="loading-state">
            <div class="spinner"></div>
            <p>${texto}</p>
        </div>
    `;
    elemento.classList.add('loading');
}


function removerLoading(elemento) {
    if (typeof elemento === 'string') {
        elemento = document.querySelector(elemento);
    }
    
    if (!elemento) return;
    
    elemento.classList.remove('loading');
}


function formatarData(dataString) {
    const data = new Date(dataString);
    const agora = new Date();
    const diffMs = agora - data;
    const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDias === 0) return 'Hoje';
    if (diffDias === 1) return 'Ontem';
    if (diffDias < 7) return `${diffDias} dias atrás`;
    
    return data.toLocaleDateString('pt-BR');
}


function truncarTexto(texto, limite = 100) {
    if (texto.length <= limite) return texto;
    return texto.substring(0, limite) + '...';
}


function extrairTags(conteudo) {
    const matches = conteudo.match(/#\w+/g);
    return matches ? matches.map(tag => tag.substring(1)) : [];
}


function confirmarAcao(mensagem, callback) {
    if (confirm(mensagem)) {
        callback();
    }
}


function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}



// Instância global da API
const api = new ZetriaAPI();

// Adicionar estilos de loading se não existirem
document.addEventListener('DOMContentLoaded', function() {
    if (!document.getElementById('loading-styles')) {
        const styles = document.createElement('style');
        styles.id = 'loading-styles';
        styles.textContent = `
            .loading-state {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 40px 20px;
                color: rgba(255, 255, 255, 0.6);
            }
            
            .loading-state .spinner {
                margin-bottom: 16px;
            }
            
            .loading-state p {
                margin: 0;
                font-size: 14px;
            }
            
            .loading {
                opacity: 0.6;
                pointer-events: none;
            }
        `;
        document.head.appendChild(styles);
    }
});

// Exportar para uso global
window.ZetriaAPI = ZetriaAPI;
window.api = api;
window.mostrarNotificacao = mostrarNotificacao;
window.mostrarLoading = mostrarLoading;
window.removerLoading = removerLoading;
window.formatarData = formatarData;
window.truncarTexto = truncarTexto;
window.extrairTags = extrairTags;
window.confirmarAcao = confirmarAcao;
window.debounce = debounce;

