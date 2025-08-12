
class CalendarioAPI {
    constructor() {
        this.baseUrl = '/api/tasks';
        this.currentDate = new Date();
        this.tasks = [];
        this.init();
    }

    init() {
        this.loadTasks();
        this.setupEventListeners();
        this.renderCalendar();
    }

    setupEventListeners() {
        // Navegação do calendário
        const prevBtn = document.querySelector('.nav-btn.prev');
        const nextBtn = document.querySelector('.nav-btn.next');
        const todayBtn = document.querySelector('.today-btn');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                this.currentDate.setMonth(this.currentDate.getMonth() - 1);
                this.renderCalendar();
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                this.currentDate.setMonth(this.currentDate.getMonth() + 1);
                this.renderCalendar();
            });
        }

        if (todayBtn) {
            todayBtn.addEventListener('click', () => {
                this.currentDate = new Date();
                this.renderCalendar();
            });
        }

        // Formulário de nova tarefa
        const taskForm = document.getElementById('taskForm');
        if (taskForm) {
            taskForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.createTask();
            });
        }

        
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('calendar-day')) {
                this.selectDay(e.target);
            }
        });
    }

    async loadTasks() {
        try {
            const response = await fetch(this.baseUrl);
            if (response.ok) {
                const data = await response.json();
                this.tasks = data.tasks || [];
                this.renderCalendar();
            }
        } catch (error) {
            console.error('Erro ao carregar tarefas:', error);
        }
    }

    async createTask() {
        const form = document.getElementById('taskForm');
        const formData = new FormData(form);
        
        const taskData = {
            title: formData.get('title'),
            description: formData.get('description'),
            due_date: formData.get('due_date')
        };

        try {
            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(taskData)
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    this.showNotification('Tarefa criada com sucesso!', 'success');
                    form.reset();
                    this.loadTasks();
                }
            }
        } catch (error) {
            console.error('Erro ao criar tarefa:', error);
            this.showNotification('Erro ao criar tarefa', 'error');
        }
    }

    async updateTask(taskId, taskData) {
        try {
            const response = await fetch(`${this.baseUrl}/${taskId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(taskData)
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    this.showNotification('Tarefa atualizada!', 'success');
                    this.loadTasks();
                }
            }
        } catch (error) {
            console.error('Erro ao atualizar tarefa:', error);
            this.showNotification('Erro ao atualizar tarefa', 'error');
        }
    }

    async deleteTask(taskId) {
        if (!confirm('Tem certeza que deseja excluir esta tarefa?')) {
            return;
        }

        try {
            const response = await fetch(`${this.baseUrl}/${taskId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    this.showNotification('Tarefa excluída!', 'success');
                    this.loadTasks();
                }
            }
        } catch (error) {
            console.error('Erro ao excluir tarefa:', error);
            this.showNotification('Erro ao excluir tarefa', 'error');
        }
    }

    renderCalendar() {
        const monthNames = [
            'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ];

        // Atualizar título do mês
        const monthTitle = document.querySelector('.month-title');
        if (monthTitle) {
            monthTitle.textContent = `${monthNames[this.currentDate.getMonth()]} ${this.currentDate.getFullYear()}`;
        }

        // Renderizar dias do calendário
        const calendarGrid = document.querySelector('.calendar-grid');
        if (!calendarGrid) return;

        const firstDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
        const lastDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());

        let calendarHTML = '';
        const today = new Date();

        for (let week = 0; week < 6; week++) {
            for (let day = 0; day < 7; day++) {
                const currentDate = new Date(startDate);
                currentDate.setDate(startDate.getDate() + (week * 7) + day);

                const isCurrentMonth = currentDate.getMonth() === this.currentDate.getMonth();
                const isToday = currentDate.toDateString() === today.toDateString();
                const dayTasks = this.getTasksForDate(currentDate);

                let dayClass = 'calendar-day';
                if (!isCurrentMonth) dayClass += ' other-month';
                if (isToday) dayClass += ' today';

                let tasksHTML = '';
                if (dayTasks.length > 0) {
                    tasksHTML = dayTasks.map(task => 
                        `<div class="task-item" title="${task.title}">${task.title.substring(0, 15)}${task.title.length > 15 ? '...' : ''}</div>`
                    ).join('');
                }

                calendarHTML += `
                    <div class="${dayClass}" data-date="${currentDate.toISOString().split('T')[0]}">
                        <span class="day-number">${currentDate.getDate()}</span>
                        <div class="day-tasks">${tasksHTML}</div>
                    </div>
                `;
            }
        }

        calendarGrid.innerHTML = calendarHTML;
    }

    getTasksForDate(date) {
        const dateStr = date.toISOString().split('T')[0];
        return this.tasks.filter(task => {
            const taskDate = new Date(task.due_date).toISOString().split('T')[0];
            return taskDate === dateStr;
        });
    }

    selectDay(dayElement) {
        // Remover seleção anterior
        document.querySelectorAll('.calendar-day.selected').forEach(day => {
            day.classList.remove('selected');
        });

        // Adicionar seleção atual
        dayElement.classList.add('selected');

        // Preencher data no formulário
        const selectedDate = dayElement.dataset.date;
        const dateInput = document.getElementById('due_date');
        if (dateInput) {
            dateInput.value = selectedDate + 'T12:00';
        }
    }

    showNotification(message, type = 'info') {
        // Criar elemento de notificação
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;

        // Adicionar estilos
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 6px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;

        if (type === 'success') {
            notification.style.background = '#10b981';
        } else if (type === 'error') {
            notification.style.background = '#ef4444';
        } else {
            notification.style.background = '#3b82f6';
        }

        document.body.appendChild(notification);

        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
}

// Inicializar quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('calendario')) {
        new CalendarioAPI();
    }
});


const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .calendar-day.selected {
        background: rgba(255, 204, 0, 0.2) !important;
        border: 2px solid #ffcc00 !important;
    }
    
    .task-item {
        background: rgba(255, 204, 0, 0.8);
        color: #1e1e2f;
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 10px;
        margin: 1px 0;
        cursor: pointer;
    }
`;
document.head.appendChild(style);

