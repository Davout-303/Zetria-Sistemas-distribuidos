class GrafosAPI {
    constructor() {
        this.network = null;
        this.nodes = new vis.DataSet([]);
        this.edges = new vis.DataSet([]);
        this.container = document.getElementById('graph-canvas');
        this.currentFilter = 'all';
        this.allNodes = [];
        this.allEdges = [];
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadGraphData();
    }

    setupEventListeners() {
       
        document.getElementById('view-all')?.addEventListener('click', () => {
            this.setFilter('all');
        });

        document.getElementById('view-notes')?.addEventListener('click', () => {
            this.setFilter('notes');
        });

        document.getElementById('view-tags')?.addEventListener('click', () => {
            this.setFilter('tags');
        });

        document.getElementById('reset-view')?.addEventListener('click', () => {
            this.resetView();
        });
    }

    async loadGraphData() {
        try {
            this.showLoading();

            
            const [nodesResponse, edgesResponse] = await Promise.all([
                fetch('/api/grafos/nodes'),
                fetch('/api/grafos/edges')
            ]);

            if (nodesResponse.ok && edgesResponse.ok) {
                const nodesData = await nodesResponse.json();
                const edgesData = await edgesResponse.json();

                if (nodesData.success && edgesData.success) {
                    this.allNodes = nodesData.nodes || [];
                    this.allEdges = edgesData.edges || [];
                    
                    this.updateStats();
                    this.renderGraph();
                } else {
                    this.showEmptyState();
                }
            } else {
                this.showError('Erro ao carregar dados do grafo');
            }
        } catch (error) {
            console.error('Erro ao carregar grafo:', error);
            this.showError('Erro de conexão');
        }
    }

    renderGraph() {
        if (this.allNodes.length === 0) {
            this.showEmptyState();
            return;
        }

        this.hideLoading();

        // Filtrar nós baseado no filtro atual
        const filteredNodes = this.filterNodes(this.allNodes);
        const filteredEdges = this.filterEdges(this.allEdges, filteredNodes);

       
        const visNodes = filteredNodes.map(node => ({
            id: node.id,
            label: node.label,
            color: this.getNodeColor(node.type),
            size: this.getNodeSize(node.type),
            font: {
                color: '#ffffff',
                size: 14,
                face: 'Arial'
            },
            data: node.data
        }));

        const visEdges = filteredEdges.map(edge => ({
            from: edge.from,
            to: edge.to,
            color: {
                color: 'rgba(255, 204, 0, 0.6)',
                highlight: '#ffcc00'
            },
            width: 2,
            smooth: {
                type: 'continuous'
            }
        }));

        // Atualizar datasets
        this.nodes.clear();
        this.edges.clear();
        this.nodes.add(visNodes);
        this.edges.add(visEdges);

        // Configurações do grafo
        const options = {
            nodes: {
                shape: 'dot',
                borderWidth: 2,
                borderColor: '#ffffff',
                chosen: true,
                shadow: {
                    enabled: true,
                    color: 'rgba(0, 0, 0, 0.5)',
                    size: 10,
                    x: 2,
                    y: 2
                }
            },
            edges: {
                arrows: {
                    to: {
                        enabled: false
                    }
                },
                smooth: {
                    enabled: true,
                    type: 'continuous'
                }
            },
            physics: {
                enabled: true,
                stabilization: {
                    enabled: true,
                    iterations: 100
                },
                barnesHut: {
                    gravitationalConstant: -2000,
                    centralGravity: 0.3,
                    springLength: 95,
                    springConstant: 0.04,
                    damping: 0.09
                }
            },
            interaction: {
                hover: true,
                selectConnectedEdges: false
            },
            layout: {
                improvedLayout: true
            }
        };

        // Criar e atualizar rede
        if (!this.network) {
            this.network = new vis.Network(this.container, {
                nodes: this.nodes,
                edges: this.edges
            }, options);

            
            this.network.on('click', (params) => {
                if (params.nodes.length > 0) {
                    this.showNodeInfo(params.nodes[0]);
                } else {
                    this.hideNodeInfo();
                }
            });

            this.network.on('hoverNode', (params) => {
                this.container.style.cursor = 'pointer';
            });

            this.network.on('blurNode', (params) => {
                this.container.style.cursor = 'default';
            });
        } else {
            this.network.setOptions(options);
        }
    }

    filterNodes(nodes) {
        switch (this.currentFilter) {
            case 'notes':
                return nodes.filter(node => node.type === 'nota');
            case 'tags':
                return nodes.filter(node => node.type === 'tag');
            default:
                return nodes;
        }
    }

    filterEdges(edges, filteredNodes) {
        const nodeIds = new Set(filteredNodes.map(node => node.id));
        return edges.filter(edge => 
            nodeIds.has(edge.from) && nodeIds.has(edge.to)
        );
    }

    getNodeColor(type) {
        switch (type) {
            case 'nota':
                return {
                    background: '#3b82f6',
                    border: '#1d4ed8',
                    highlight: {
                        background: '#60a5fa',
                        border: '#2563eb'
                    }
                };
            case 'tag':
                return {
                    background: '#10b981',
                    border: '#047857',
                    highlight: {
                        background: '#34d399',
                        border: '#059669'
                    }
                };
            default:
                return {
                    background: '#6b7280',
                    border: '#374151'
                };
        }
    }

    getNodeSize(type) {
        switch (type) {
            case 'nota':
                return 25;
            case 'tag':
                return 20;
            default:
                return 15;
        }
    }

    setFilter(filter) {
        this.currentFilter = filter;
        
        // Atualizar botões 
        document.querySelectorAll('.control-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const activeBtn = document.getElementById(`view-${filter === 'all' ? 'all' : filter === 'notes' ? 'notes' : 'tags'}`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }

        this.renderGraph();
    }

    resetView() {
        if (this.network) {
            this.network.fit({
                animation: {
                    duration: 1000,
                    easingFunction: 'easeInOutQuad'
                }
            });
        }
    }

    showNodeInfo(nodeId) {
        const node = this.allNodes.find(n => n.id === nodeId);
        if (!node) return;

        const infoPanel = document.getElementById('graph-info');
        const detailsDiv = document.getElementById('node-details');

        let content = '';
        
        if (node.type === 'nota') {
            content = `
                <div class="node-info">
                    <h5><i class="fas fa-sticky-note"></i> ${node.data.title}</h5>
                    <p><strong>Conteúdo:</strong> ${node.data.content}</p>
                    <p><strong>Criado em:</strong> ${new Date(node.data.created_at).toLocaleDateString('pt-BR')}</p>
                </div>
            `;
        } else if (node.type === 'tag') {
            content = `
                <div class="node-info">
                    <h5><i class="fas fa-hashtag"></i> ${node.data.name}</h5>
                    <p><strong>Usado em:</strong> ${node.data.usage_count} nota(s)</p>
                </div>
            `;
        }

        detailsDiv.innerHTML = content;
        infoPanel.style.display = 'block';
    }

    hideNodeInfo() {
        const infoPanel = document.getElementById('graph-info');
        infoPanel.style.display = 'none';
    }

    updateStats() {
        const totalNodes = this.allNodes.length;
        const totalNotes = this.allNodes.filter(n => n.type === 'nota').length;
        const totalTags = this.allNodes.filter(n => n.type === 'tag').length;
        const totalConnections = this.allEdges.length;

        document.getElementById('total-nodes').textContent = totalNodes;
        document.getElementById('total-notes').textContent = totalNotes;
        document.getElementById('total-tags').textContent = totalTags;
        document.getElementById('total-connections').textContent = totalConnections;
    }

    showLoading() {
        const loadingState = document.getElementById('loading-state');
        if (loadingState) {
            loadingState.style.display = 'flex';
        }
    }

    hideLoading() {
        const loadingState = document.getElementById('loading-state');
        if (loadingState) {
            loadingState.style.display = 'none';
        }
    }

    showEmptyState() {
        this.hideLoading();
        
        const emptyHTML = `
            <div class="empty-state">
                <i class="fas fa-project-diagram"></i>
                <h3>Nenhum grafo disponível</h3>
                <p>Crie algumas notas com tags para visualizar as conexões entre seus conhecimentos.</p>
            </div>
        `;
        
        this.container.innerHTML = emptyHTML;
    }

    showError(message) {
        this.hideLoading();
        
        const errorHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Erro ao carregar grafo</h3>
                <p>${message}</p>
            </div>
        `;
        
        this.container.innerHTML = errorHTML;
    }
}

// Inicializar quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('grafos')) {
        new GrafosAPI();
    }
});


const style = document.createElement('style');
style.textContent = `
    .node-info h5 {
        color: #ffcc00;
        margin-bottom: 10px;
        display: flex;
        align-items: center;
        gap: 8px;
    }
    
    .node-info p {
        margin-bottom: 8px;
        font-size: 13px;
        line-height: 1.4;
    }
    
    .node-info strong {
        color: #ffffff;
    }
`;
document.head.appendChild(style);

