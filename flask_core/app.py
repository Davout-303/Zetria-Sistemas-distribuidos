from flask import Flask, render_template, request, jsonify, session, redirect, url_for, flash
from flask_cors import CORS
import mysql.connector
from mysql.connector import Error
import hashlib
import re
from datetime import datetime
from functools import wraps

app = Flask(__name__)
app.secret_key = 'zetria_secret_key_2024'
CORS(app, origins="*")


DB_CONFIG = {
    'host': 'localhost',
    'database': 'zetria',
    'user': 'root',
    'password': ''
}

def get_db_connection():
   
    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        return connection
    except Error as e:
        print(f"Erro ao conectar ao MySQL: {e}")
        return None

def require_login(f):
    
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            if request.is_json:
                return jsonify({'error': 'Acesso não autorizado', 'success': False}), 401
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

def hash_password(password):
    
    return hashlib.sha256(password.encode()).hexdigest()

def extract_tags(content):
    
    tags = re.findall(r'#(\w+)', content)
    return list(set(tags))  # Remove duplicatas

def extract_links(content):
    
    links = re.findall(r'\[\[([^\]]+)\]\]', content)
    return list(set(links))  # Remove duplicatas

# ROTAS DE AUTENTICAÇÃO

@app.route('/')
def index():
    
    if 'user_id' in session:
        return redirect(url_for('dashboard'))
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
   
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '')
        
        if not username or not password:
            flash('Por favor, preencha todos os campos', 'error')
            return render_template('login.html')
        
        connection = get_db_connection()
        if not connection:
            flash('Erro de conexão com o banco de dados', 'error')
            return render_template('login.html')
        
        try:
            cursor = connection.cursor(dictionary=True)
            hashed_password = hash_password(password)
            
            cursor.execute(
                "SELECT id, username FROM usuarios WHERE username = %s AND password_hash = %s",
                (username, hashed_password)
            )
            user = cursor.fetchone()
            
            if user:
                session['user_id'] = user['id']
                session['username'] = user['username']
                flash('Login realizado com sucesso!', 'success')
                return redirect(url_for('dashboard'))
            else:
                flash('Usuário ou senha incorretos', 'error')
                
        except Error as e:
            print(f"Erro no login: {e}")
            flash('Erro interno do servidor', 'error')
        finally:
            if connection.is_connected():
                cursor.close()
                connection.close()
    
    return render_template('login.html')

@app.route('/cadastro', methods=['GET', 'POST'])
def cadastro():
    
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '')
        confirm_password = request.form.get('confirm_password', '')
        
        # Validações
        if not username or not password or not confirm_password:
            flash('Por favor, preencha todos os campos', 'error')
            return render_template('Cadastro.html')
        
        if len(username) < 3:
            flash('O nome de usuário deve ter pelo menos 3 caracteres', 'error')
            return render_template('Cadastro.html')
        
        if len(password) < 6:
            flash('A senha deve ter pelo menos 6 caracteres', 'error')
            return render_template('Cadastro.html')
        
        if password != confirm_password:
            flash('As senhas não coincidem', 'error')
            return render_template('Cadastro.html')
        
        connection = get_db_connection()
        if not connection:
            flash('Erro de conexão com o banco de dados', 'error')
            return render_template('Cadastro.html')
        
        try:
            cursor = connection.cursor()
            
            # Verificar se usuário já existe
            cursor.execute("SELECT id FROM usuarios WHERE username = %s", (username,))
            if cursor.fetchone():
                flash('Este nome de usuário já está em uso', 'error')
                return render_template('Cadastro.html')
            
            # Criar novo usuário
            hashed_password = hash_password(password)
            cursor.execute(
                "INSERT INTO usuarios (username, password_hash, created_at) VALUES (%s, %s, %s)",
                (username, hashed_password, datetime.now())
            )
            connection.commit()
            
            flash('Conta criada com sucesso! Faça login para continuar.', 'success')
            return redirect(url_for('login'))
            
        except Error as e:
            print(f"Erro no cadastro: {e}")
            flash('Erro interno do servidor', 'error')
        finally:
            if connection.is_connected():
                cursor.close()
                connection.close()
    
    return render_template('Cadastro.html')

@app.route('/logout')
def logout():
   
    session.clear()
    flash('Logout realizado com sucesso!', 'success')
    return redirect(url_for('login'))

# ROTAS PRINCIPAIS
@app.route('/dashboard')
@require_login
def dashboard():
    
    return render_template('dashboard.html', username=session.get('username'))

@app.route('/notas')
@require_login
def listar_notas():
    
    return render_template('Interface.notas.html', username=session.get('username'))

@app.route('/notas/nova')
@require_login
def nova_nota():
    
    return render_template('nota.html', username=session.get('username'))

@app.route('/notas/<int:nota_id>/editar')
@require_login
def editar_nota(nota_id):
    
    return render_template('nota.html', username=session.get('username'), nota_id=nota_id)

# API CRUD NOTAS

@app.route('/api/notas', methods=['GET'])
@require_login
def api_listar_notas():
   
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': 'Erro de conexão com o banco', 'success': False}), 500
    
    try:
        cursor = connection.cursor(dictionary=True)
        
        # Buscar notas do usuário
        cursor.execute("""
            SELECT n.id, n.title, n.content, n.created_at, n.updated_at
            FROM notas n
            WHERE n.user_id = %s
            ORDER BY n.updated_at DESC
        """, (session['user_id'],))
        
        notas = cursor.fetchall()
        
        # Buscar tags para cada nota
        for nota in notas:
            cursor.execute("""
                SELECT t.name
                FROM tags t
                JOIN nota_tags nt ON t.id = nt.tag_id
                WHERE nt.nota_id = %s
            """, (nota['id'],))
            
            tags = [row['name'] for row in cursor.fetchall()]
            nota['tags'] = tags
            
            
            if isinstance(nota['created_at'], datetime):
                nota['created_at'] = nota['created_at'].isoformat()
            if isinstance(nota['updated_at'], datetime):
                nota['updated_at'] = nota['updated_at'].isoformat()
        
        return jsonify({'notas': notas, 'success': True})
        
    except Error as e:
        print(f"Erro ao listar notas: {e}")
        return jsonify({'error': 'Erro interno do servidor', 'success': False}), 500
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()

@app.route('/api/notas', methods=['POST'])
@require_login
def api_criar_nota():
    
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Dados não fornecidos', 'success': False}), 400
    
    title = data.get('title', '').strip()
    content = data.get('content', '').strip()
    
    if not title or not content:
        return jsonify({'error': 'Título e conteúdo são obrigatórios', 'success': False}), 400
    
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': 'Erro de conexão com o banco', 'success': False}), 500
    
    try:
        cursor = connection.cursor(dictionary=True)
        now = datetime.now()
        
        # Inserir nova nota
        cursor.execute("""
            INSERT INTO notas (user_id, title, content, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s)
        """, (session['user_id'], title, content, now, now))
        
        nota_id = cursor.lastrowid
        
        # Processar tags
        tags = extract_tags(content)
        if tags:
            # Inserir tags que não existem
            for tag in tags:
                cursor.execute("INSERT IGNORE INTO tags (name) VALUES (%s)", (tag,))
            
            # Buscar IDs das tags
            placeholders = ','.join(['%s'] * len(tags))
            cursor.execute(f"SELECT id, name FROM tags WHERE name IN ({placeholders})", tags)
            tag_data = cursor.fetchall()
            
            # Associar tags à nota
            for tag_row in tag_data:
                cursor.execute(
                    "INSERT INTO nota_tags (nota_id, tag_id) VALUES (%s, %s)",
                    (nota_id, tag_row['id'])
                )
        
        connection.commit()
        
        # Retornar nota criada
        cursor.execute("""
            SELECT id, title, content, created_at, updated_at
            FROM notas WHERE id = %s
        """, (nota_id,))
        
        nova_nota = cursor.fetchone()
        nova_nota['tags'] = tags
        
        # Converter datetime para string
        if isinstance(nova_nota['created_at'], datetime):
            nova_nota['created_at'] = nova_nota['created_at'].isoformat()
        if isinstance(nova_nota['updated_at'], datetime):
            nova_nota['updated_at'] = nova_nota['updated_at'].isoformat()
        
        return jsonify({'nota': nova_nota, 'success': True}), 201
        
    except Error as e:
        print(f"Erro ao criar nota: {e}")
        return jsonify({'error': 'Erro interno do servidor', 'success': False}), 500
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()

@app.route('/api/notas/<int:nota_id>', methods=['GET'])
@require_login
def api_obter_nota(nota_id):
    
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': 'Erro de conexão com o banco', 'success': False}), 500
    
    try:
        cursor = connection.cursor(dictionary=True)
        
        # Buscar nota
        cursor.execute("""
            SELECT id, title, content, created_at, updated_at
            FROM notas
            WHERE id = %s AND user_id = %s
        """, (nota_id, session['user_id']))
        
        nota = cursor.fetchone()
        if not nota:
            return jsonify({'error': 'Nota não encontrada', 'success': False}), 404
        
        # Buscar tags
        cursor.execute("""
            SELECT t.name
            FROM tags t
            JOIN nota_tags nt ON t.id = nt.tag_id
            WHERE nt.nota_id = %s
        """, (nota_id,))
        
        tags = [row['name'] for row in cursor.fetchall()]
        nota['tags'] = tags
        
        # Converter datetime para string
        if isinstance(nota['created_at'], datetime):
            nota['created_at'] = nota['created_at'].isoformat()
        if isinstance(nota['updated_at'], datetime):
            nota['updated_at'] = nota['updated_at'].isoformat()
        
        return jsonify({'nota': nota, 'success': True})
        
    except Error as e:
        print(f"Erro ao obter nota: {e}")
        return jsonify({'error': 'Erro interno do servidor', 'success': False}), 500
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()

@app.route('/api/notas/<int:nota_id>', methods=['PUT'])
@require_login
def api_atualizar_nota(nota_id):
    
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Dados não fornecidos', 'success': False}), 400
    
    title = data.get('title', '').strip()
    content = data.get('content', '').strip()
    
    if not title or not content:
        return jsonify({'error': 'Título e conteúdo são obrigatórios', 'success': False}), 400
    
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': 'Erro de conexão com o banco', 'success': False}), 500
    
    try:
        cursor = connection.cursor(dictionary=True)
        
        # Verificar se a nota existe e pertence ao usuário
        cursor.execute("""
            SELECT id FROM notas
            WHERE id = %s AND user_id = %s
        """, (nota_id, session['user_id']))
        
        if not cursor.fetchone():
            return jsonify({'error': 'Nota não encontrada', 'success': False}), 404
        
        # Atualizar nota
        cursor.execute("""
            UPDATE notas
            SET title = %s, content = %s, updated_at = %s
            WHERE id = %s
        """, (title, content, datetime.now(), nota_id))
        
        # Remover tags antigas
        cursor.execute("DELETE FROM nota_tags WHERE nota_id = %s", (nota_id,))
        
        # Processar novas tags
        tags = extract_tags(content)
        if tags:
            # Inserir tags que não existem
            for tag in tags:
                cursor.execute("INSERT IGNORE INTO tags (name) VALUES (%s)", (tag,))
            
            # Buscar IDs das tags
            placeholders = ','.join(['%s'] * len(tags))
            cursor.execute(f"SELECT id, name FROM tags WHERE name IN ({placeholders})", tags)
            tag_data = cursor.fetchall()
            
            # Associar tags à nota
            for tag_row in tag_data:
                cursor.execute(
                    "INSERT INTO nota_tags (nota_id, tag_id) VALUES (%s, %s)",
                    (nota_id, tag_row['id'])
                )
        
        connection.commit()
        
        return jsonify({'message': 'Nota atualizada com sucesso', 'success': True})
        
    except Error as e:
        print(f"Erro ao atualizar nota: {e}")
        return jsonify({'error': 'Erro interno do servidor', 'success': False}), 500
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()

@app.route('/api/notas/<int:nota_id>', methods=['DELETE'])
@require_login
def api_deletar_nota(nota_id):
    """API: Deletar nota"""
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': 'Erro de conexão com o banco', 'success': False}), 500
    
    try:
        cursor = connection.cursor()
        
        # Verificar se a nota existe e pertence ao usuário
        cursor.execute("""
            SELECT id FROM notas
            WHERE id = %s AND user_id = %s
        """, (nota_id, session['user_id']))
        
        if not cursor.fetchone():
            return jsonify({'error': 'Nota não encontrada', 'success': False}), 404
        
        # Deletar associações de tags
        cursor.execute("DELETE FROM nota_tags WHERE nota_id = %s", (nota_id,))
        
        # Deletar links relacionados
        cursor.execute("DELETE FROM links WHERE source_nota_id = %s OR target_nota_id = %s", (nota_id, nota_id))
        
        # Deletar nota
        cursor.execute("DELETE FROM notas WHERE id = %s", (nota_id,))
        
        connection.commit()
        
        return jsonify({'message': 'Nota deletada com sucesso', 'success': True})
        
    except Error as e:
        print(f"Erro ao deletar nota: {e}")
        return jsonify({'error': 'Erro interno do servidor', 'success': False}), 500
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()


@app.route('/flashcards')
@require_login
def listar_flashcards():
    
    return render_template('interface.flashcard1.html', username=session.get('username'))

@app.route('/flashcards/novo')
@require_login
def novo_flashcard():
   
    return render_template('interface.flashcard2.html', username=session.get('username'))

@app.route('/flashcards/estudar')
@require_login
def estudar_flashcards():
    
    return render_template('interface.flashcard3.html', username=session.get('username'))

# API CRUD FLASHCARDS

@app.route('/api/flashcards', methods=['GET'])
@require_login
def api_listar_flashcards():
    
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': 'Erro de conexão com o banco', 'success': False}), 500
    
    try:
        cursor = connection.cursor(dictionary=True)
        
        # Buscar flashcards do usuário
        cursor.execute("""
            SELECT f.id, f.front_content, f.back_content, f.audio_path, 
                   f.created_at, f.review_at, n.title as nota_title
            FROM flashcards f
            JOIN notas n ON f.nota_id = n.id
            WHERE n.user_id = %s
            ORDER BY f.created_at DESC
        """, (session['user_id'],))
        
        flashcards = cursor.fetchall()
        
        
        for flashcard in flashcards:
            if isinstance(flashcard['created_at'], datetime):
                flashcard['created_at'] = flashcard['created_at'].isoformat()
            if flashcard['review_at'] and isinstance(flashcard['review_at'], datetime):
                flashcard['review_at'] = flashcard['review_at'].isoformat()
        
        return jsonify({'flashcards': flashcards, 'success': True})
        
    except Error as e:
        print(f"Erro ao listar flashcards: {e}")
        return jsonify({'error': 'Erro interno do servidor', 'success': False}), 500
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()

@app.route('/api/flashcards', methods=['POST'])
@require_login
def api_criar_flashcard():
    
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Dados não fornecidos', 'success': False}), 400
    
    nota_id = data.get('nota_id')
    front_content = data.get('front_content', '').strip()
    back_content = data.get('back_content', '').strip()
    
    if not nota_id or not front_content or not back_content:
        return jsonify({'error': 'Nota ID, frente e verso são obrigatórios', 'success': False}), 400
    
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': 'Erro de conexão com o banco', 'success': False}), 500
    
    try:
        cursor = connection.cursor(dictionary=True)
        
        # Verificar se a nota pertence ao usuário
        cursor.execute("""
            SELECT id FROM notas WHERE id = %s AND user_id = %s
        """, (nota_id, session['user_id']))
        
        if not cursor.fetchone():
            return jsonify({'error': 'Nota não encontrada', 'success': False}), 404
        
        # Inserir novo flashcard
        cursor.execute("""
            INSERT INTO flashcards (nota_id, front_content, back_content, created_at)
            VALUES (%s, %s, %s, %s)
        """, (nota_id, front_content, back_content, datetime.now()))
        
        flashcard_id = cursor.lastrowid
        connection.commit()
        
        # Retornar flashcard criado
        cursor.execute("""
            SELECT f.id, f.front_content, f.back_content, f.audio_path, 
                   f.created_at, f.review_at, n.title as nota_title
            FROM flashcards f
            JOIN notas n ON f.nota_id = n.id
            WHERE f.id = %s
        """, (flashcard_id,))
        
        novo_flashcard = cursor.fetchone()
        
        # Converter datetime para string
        if isinstance(novo_flashcard['created_at'], datetime):
            novo_flashcard['created_at'] = novo_flashcard['created_at'].isoformat()
        
        return jsonify({'flashcard': novo_flashcard, 'success': True}), 201
        
    except Error as e:
        print(f"Erro ao criar flashcard: {e}")
        return jsonify({'error': 'Erro interno do servidor', 'success': False}), 500
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()

@app.route('/api/flashcards/<int:flashcard_id>', methods=['DELETE'])
@require_login
def api_deletar_flashcard(flashcard_id):
    
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': 'Erro de conexão com o banco', 'success': False}), 500
    
    try:
        cursor = connection.cursor()
        
        # Verificar se o flashcard existe e pertence ao usuário
        cursor.execute("""
            SELECT f.id FROM flashcards f
            JOIN notas n ON f.nota_id = n.id
            WHERE f.id = %s AND n.user_id = %s
        """, (flashcard_id, session['user_id']))
        
        if not cursor.fetchone():
            return jsonify({'error': 'Flashcard não encontrado', 'success': False}), 404
        
        # Deletar flashcard
        cursor.execute("DELETE FROM flashcards WHERE id = %s", (flashcard_id,))
        connection.commit()
        
        return jsonify({'message': 'Flashcard deletado com sucesso', 'success': True})
        
    except Error as e:
        print(f"Erro ao deletar flashcard: {e}")
        return jsonify({'error': 'Erro interno do servidor', 'success': False}), 500
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()



@app.route('/calendario')
@require_login
def calendario():
    
    return render_template('calendario.html', username=session.get('username'))

# API CRUD TAREFAS/EVENTOS

@app.route('/api/tasks', methods=['GET'])
@require_login
def api_listar_tasks():
    
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': 'Erro de conexão com o banco', 'success': False}), 500
    
    try:
        cursor = connection.cursor(dictionary=True)
        
        # Buscar tarefas do usuário
        cursor.execute("""
            SELECT id, title, description, due_date, recurring, 
                   recurrence_rule, completed, created_at
            FROM tasks
            WHERE user_id = %s
            ORDER BY due_date ASC, created_at DESC
        """, (session['user_id'],))
        
        tasks = cursor.fetchall()
        
       
        for task in tasks:
            if isinstance(task['created_at'], datetime):
                task['created_at'] = task['created_at'].isoformat()
            if task['due_date'] and isinstance(task['due_date'], datetime):
                task['due_date'] = task['due_date'].isoformat()
        
        return jsonify({'tasks': tasks, 'success': True})
        
    except Error as e:
        print(f"Erro ao listar tarefas: {e}")
        return jsonify({'error': 'Erro interno do servidor', 'success': False}), 500
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()

@app.route('/api/tasks', methods=['POST'])
@require_login
def api_criar_task():
    
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Dados não fornecidos', 'success': False}), 400
    
    title = data.get('title', '').strip()
    description = data.get('description', '').strip()
    due_date_str = data.get('due_date')
    recurring = data.get('recurring', False)
    recurrence_rule = data.get('recurrence_rule', '')
    
    if not title:
        return jsonify({'error': 'Título é obrigatório', 'success': False}), 400
    
    # Converter string de data para datetime se fornecida
    due_date = None
    if due_date_str:
        try:
            due_date = datetime.fromisoformat(due_date_str.replace('Z', '+00:00'))
        except ValueError:
            return jsonify({'error': 'Formato de data inválido', 'success': False}), 400
    
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': 'Erro de conexão com o banco', 'success': False}), 500
    
    try:
        cursor = connection.cursor(dictionary=True)
        
        # Inserir nova tarefa
        cursor.execute("""
            INSERT INTO tasks (user_id, title, description, due_date, recurring, recurrence_rule, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (session['user_id'], title, description, due_date, recurring, recurrence_rule, datetime.now()))
        
        task_id = cursor.lastrowid
        connection.commit()
        
        # Retornar tarefa criada
        cursor.execute("""
            SELECT id, title, description, due_date, recurring, 
                   recurrence_rule, completed, created_at
            FROM tasks WHERE id = %s
        """, (task_id,))
        
        nova_task = cursor.fetchone()
        
        # Converter datetime para string
        if isinstance(nova_task['created_at'], datetime):
            nova_task['created_at'] = nova_task['created_at'].isoformat()
        if nova_task['due_date'] and isinstance(nova_task['due_date'], datetime):
            nova_task['due_date'] = nova_task['due_date'].isoformat()
        
        return jsonify({'task': nova_task, 'success': True}), 201
        
    except Error as e:
        print(f"Erro ao criar tarefa: {e}")
        return jsonify({'error': 'Erro interno do servidor', 'success': False}), 500
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()

@app.route('/api/tasks/<int:task_id>', methods=['PUT'])
@require_login
def api_atualizar_task(task_id):
   
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Dados não fornecidos', 'success': False}), 400
    
    title = data.get('title', '').strip()
    description = data.get('description', '').strip()
    due_date_str = data.get('due_date')
    completed = data.get('completed', False)
    recurring = data.get('recurring', False)
    recurrence_rule = data.get('recurrence_rule', '')
    
    if not title:
        return jsonify({'error': 'Título é obrigatório', 'success': False}), 400
    
    
    due_date = None
    if due_date_str:
        try:
            due_date = datetime.fromisoformat(due_date_str.replace('Z', '+00:00'))
        except ValueError:
            return jsonify({'error': 'Formato de data inválido', 'success': False}), 400
    
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': 'Erro de conexão com o banco', 'success': False}), 500
    
    try:
        cursor = connection.cursor(dictionary=True)
        
        # Verificar se a tarefa existe e pertence ao usuário
        cursor.execute("""
            SELECT id FROM tasks
            WHERE id = %s AND user_id = %s
        """, (task_id, session['user_id']))
        
        if not cursor.fetchone():
            return jsonify({'error': 'Tarefa não encontrada', 'success': False}), 404
        
        # Atualizar tarefa
        cursor.execute("""
            UPDATE tasks
            SET title = %s, description = %s, due_date = %s, completed = %s, 
                recurring = %s, recurrence_rule = %s
            WHERE id = %s
        """, (title, description, due_date, completed, recurring, recurrence_rule, task_id))
        
        connection.commit()
        
        return jsonify({'message': 'Tarefa atualizada com sucesso', 'success': True})
        
    except Error as e:
        print(f"Erro ao atualizar tarefa: {e}")
        return jsonify({'error': 'Erro interno do servidor', 'success': False}), 500
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()

@app.route('/api/tasks/<int:task_id>', methods=['DELETE'])
@require_login
def api_deletar_task(task_id):
    
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': 'Erro de conexão com o banco', 'success': False}), 500
    
    try:
        cursor = connection.cursor()
        
        # Verificar se a tarefa existe e pertence ao usuário
        cursor.execute("""
            SELECT id FROM tasks
            WHERE id = %s AND user_id = %s
        """, (task_id, session['user_id']))
        
        if not cursor.fetchone():
            return jsonify({'error': 'Tarefa não encontrada', 'success': False}), 404
        
        # Deletar tarefa
        cursor.execute("DELETE FROM tasks WHERE id = %s", (task_id,))
        connection.commit()
        
        return jsonify({'message': 'Tarefa deletada com sucesso', 'success': True})
        
    except Error as e:
        print(f"Erro ao deletar tarefa: {e}")
        return jsonify({'error': 'Erro interno do servidor', 'success': False}), 500
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()

# def send_grafos_message(data):
#     connection = pika.BlockingConnection(pika.ConnectionParameters(host='rabbitmq'))
#     channel = connection.channel()
#     channel.queue_declare(queue='grafos_queue')

#     message = json.dumps(data)
#     channel.basic_publish(exchange='', routing_key='grafos_queue', body=message)
#     connection.close()


@app.route('/grafos')
@require_login
def grafos():
    
    return render_template('grafos.html', username=session.get('username'))

# API CRUD GRAFOS

@app.route('/api/grafos/nodes', methods=['GET'])
@require_login
def api_grafos_nodes():
    
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': 'Erro de conexão com o banco', 'success': False}), 500
    
    try:
        cursor = connection.cursor(dictionary=True)
        
        # Buscar notas do usuário
        cursor.execute("""
            SELECT id, title, content, created_at
            FROM notas
            WHERE user_id = %s
        """, (session['user_id'],))
        
        notas = cursor.fetchall()
        
        # Buscar tags das notas do usuário
        cursor.execute("""
            SELECT DISTINCT t.id, t.name, COUNT(nt.nota_id) as usage_count
            FROM tags t
            JOIN nota_tags nt ON t.id = nt.tag_id
            JOIN notas n ON nt.nota_id = n.id
            WHERE n.user_id = %s
            GROUP BY t.id, t.name
        """, (session['user_id'],))
        
        tags = cursor.fetchall()
        
        # Criar nós para o grafo
        nodes = []
        
        # Adicionar notas como nós
        for nota in notas:
            nodes.append({
                'id': f'nota_{nota["id"]}',
                'label': nota['title'][:30] + ('...' if len(nota['title']) > 30 else ''),
                'type': 'nota',
                'data': {
                    'id': nota['id'],
                    'title': nota['title'],
                    'content': nota['content'][:100] + ('...' if len(nota['content']) > 100 else ''),
                    'created_at': nota['created_at'].isoformat() if isinstance(nota['created_at'], datetime) else str(nota['created_at'])
                }
            })
        
        # Adicionar tags como nós
        for tag in tags:
            nodes.append({
                'id': f'tag_{tag["id"]}',
                'label': f'#{tag["name"]}',
                'type': 'tag',
                'data': {
                    'id': tag['id'],
                    'name': tag['name'],
                    'usage_count': tag['usage_count']
                }
            })
        
        # # Enviar mensagem para o RabbitMQ
        # send_grafos_message({
        #     'event': 'nodes_retrieved',
        #     'user_id': session['user_id'],
        #     'node_count': len(nodes),
        #     'timestamp': datetime.now().isoformat()
        # })
        

        return jsonify({'nodes': nodes, 'success': True})
        
    except Error as e:
        print(f"Erro ao obter nós do grafo: {e}")
        return jsonify({'error': 'Erro interno do servidor', 'success': False}), 500
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()

@app.route('/api/grafos/edges', methods=['GET'])
@require_login
def api_grafos_edges():
    
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': 'Erro de conexão com o banco', 'success': False}), 500
    
    try:
        cursor = connection.cursor(dictionary=True)
        
        # Buscar relacionamentos nota-tag
        cursor.execute("""
            SELECT nt.nota_id, nt.tag_id
            FROM nota_tags nt
            JOIN notas n ON nt.nota_id = n.id
            WHERE n.user_id = %s
        """, (session['user_id'],))
        
        relationships = cursor.fetchall()
        
        # Criar arestas para o grafo
        edges = []
        
        for rel in relationships:
            edges.append({
                'from': f'nota_{rel["nota_id"]}',
                'to': f'tag_{rel["tag_id"]}',
                'type': 'nota_tag'
            })
        
        # # Enviar mensagem para o RabbitMQ
        # send_grafos_message({
        #     'event': 'edges_retrieved',
        #     'user_id': session['user_id'],
        #     'edge_count': len(edges),
        #     'timestamp': datetime.now().isoformat()
        # })

        return jsonify({'edges': edges, 'success': True})
        
    except Error as e:
        print(f"Erro ao obter arestas do grafo: {e}")
        return jsonify({'error': 'Erro interno do servidor', 'success': False}), 500
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()



if __name__ == '__main__':
    print("🐝 Iniciando Zetria...")
    print("📊 Dashboard: http://localhost:5000")
    print("🔐 Login: http://localhost:5000/login")
    print("📝 API Notas: http://localhost:5000/api/notas")
    
    app.run(host='0.0.0.0', port=5000, debug=True)

@app.route('/api/flashcards', methods=['GET'])
@require_login
def api_listar_flashcards():
    
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': 'Erro de conexão com o banco', 'success': False}), 500
    
    try:
        cursor = connection.cursor(dictionary=True)
        
        # Buscar flashcards do usuário através das notas
        cursor.execute("""
            SELECT f.id, f.front_content, f.back_content, f.audio_path, 
                   f.created_at, f.review_at, n.title as nota_title
            FROM flashcards f
            JOIN notas n ON f.nota_id = n.id
            WHERE n.user_id = %s
            ORDER BY f.created_at DESC
        """, (session['user_id'],))
        
        flashcards = cursor.fetchall()
        
        
        for flashcard in flashcards:
            if isinstance(flashcard['created_at'], datetime):
                flashcard['created_at'] = flashcard['created_at'].isoformat()
            if flashcard['review_at'] and isinstance(flashcard['review_at'], datetime):
                flashcard['review_at'] = flashcard['review_at'].isoformat()
        
        return jsonify({'flashcards': flashcards, 'success': True})
        
    except Error as e:
        print(f"Erro ao listar flashcards: {e}")
        return jsonify({'error': 'Erro interno do servidor', 'success': False}), 500
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()

@app.route('/api/flashcards', methods=['POST'])
@require_login
def api_criar_flashcard():
    
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Dados não fornecidos', 'success': False}), 400
    
    nota_id = data.get('nota_id')
    front_content = data.get('front_content', '').strip()
    back_content = data.get('back_content', '').strip()
    
    if not nota_id or not front_content or not back_content:
        return jsonify({'error': 'Nota ID, frente e verso são obrigatórios', 'success': False}), 400
    
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': 'Erro de conexão com o banco', 'success': False}), 500
    
    try:
        cursor = connection.cursor(dictionary=True)
        
        # Verificar se a nota pertence ao usuário
        cursor.execute("""
            SELECT id FROM notas WHERE id = %s AND user_id = %s
        """, (nota_id, session['user_id']))
        
        if not cursor.fetchone():
            return jsonify({'error': 'Nota não encontrada', 'success': False}), 404
        
        # Inserir novo flashcard
        cursor.execute("""
            INSERT INTO flashcards (nota_id, front_content, back_content, created_at)
            VALUES (%s, %s, %s, %s)
        """, (nota_id, front_content, back_content, datetime.now()))
        
        flashcard_id = cursor.lastrowid
        connection.commit()
        
        # Retornar flashcard criado
        cursor.execute("""
            SELECT f.id, f.front_content, f.back_content, f.audio_path, 
                   f.created_at, f.review_at, n.title as nota_title
            FROM flashcards f
            JOIN notas n ON f.nota_id = n.id
            WHERE f.id = %s
        """, (flashcard_id,))
        
        novo_flashcard = cursor.fetchone()
        
        
        if isinstance(novo_flashcard['created_at'], datetime):
            novo_flashcard['created_at'] = novo_flashcard['created_at'].isoformat()
        
        return jsonify({'flashcard': novo_flashcard, 'success': True}), 201
        
    except Error as e:
        print(f"Erro ao criar flashcard: {e}")
        return jsonify({'error': 'Erro interno do servidor', 'success': False}), 500
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()

@app.route('/api/flashcards/<int:flashcard_id>', methods=['GET'])
@require_login
def api_obter_flashcard(flashcard_id):
    
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': 'Erro de conexão com o banco', 'success': False}), 500
    
    try:
        cursor = connection.cursor(dictionary=True)
        
        # Buscar flashcard
        cursor.execute("""
            SELECT f.id, f.front_content, f.back_content, f.audio_path, 
                   f.created_at, f.review_at, n.title as nota_title
            FROM flashcards f
            JOIN notas n ON f.nota_id = n.id
            WHERE f.id = %s AND n.user_id = %s
        """, (flashcard_id, session['user_id']))
        
        flashcard = cursor.fetchone()
        if not flashcard:
            return jsonify({'error': 'Flashcard não encontrado', 'success': False}), 404
        
        
        if isinstance(flashcard['created_at'], datetime):
            flashcard['created_at'] = flashcard['created_at'].isoformat()
        if flashcard['review_at'] and isinstance(flashcard['review_at'], datetime):
            flashcard['review_at'] = flashcard['review_at'].isoformat()
        
        return jsonify({'flashcard': flashcard, 'success': True})
        
    except Error as e:
        print(f"Erro ao obter flashcard: {e}")
        return jsonify({'error': 'Erro interno do servidor', 'success': False}), 500
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()

@app.route('/api/flashcards/<int:flashcard_id>', methods=['PUT'])
@require_login
def api_atualizar_flashcard(flashcard_id):
    
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Dados não fornecidos', 'success': False}), 400
    
    front_content = data.get('front_content', '').strip()
    back_content = data.get('back_content', '').strip()
    
    if not front_content or not back_content:
        return jsonify({'error': 'Frente e verso são obrigatórios', 'success': False}), 400
    
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': 'Erro de conexão com o banco', 'success': False}), 500
    
    try:
        cursor = connection.cursor(dictionary=True)
        
        # Verifica se o flashcard existe e pertence ao usuário
        cursor.execute("""
            SELECT f.id FROM flashcards f
            JOIN notas n ON f.nota_id = n.id
            WHERE f.id = %s AND n.user_id = %s
        """, (flashcard_id, session['user_id']))
        
        if not cursor.fetchone():
            return jsonify({'error': 'Flashcard não encontrado', 'success': False}), 404
        
        # Atualizar flashcard
        cursor.execute("""
            UPDATE flashcards
            SET front_content = %s, back_content = %s
            WHERE id = %s
        """, (front_content, back_content, flashcard_id))
        
        connection.commit()
        
        return jsonify({'message': 'Flashcard atualizado com sucesso', 'success': True})
        
    except Error as e:
        print(f"Erro ao atualizar flashcard: {e}")
        return jsonify({'error': 'Erro interno do servidor', 'success': False}), 500
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()

@app.route('/api/flashcards/<int:flashcard_id>', methods=['DELETE'])
@require_login
def api_deletar_flashcard(flashcard_id):
    
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': 'Erro de conexão com o banco', 'success': False}), 500
    
    try:
        cursor = connection.cursor()
        
        # Verifica se o flashcard existe e pertence ao usuário
        cursor.execute("""
            SELECT f.id FROM flashcards f
            JOIN notas n ON f.nota_id = n.id
            WHERE f.id = %s AND n.user_id = %s
        """, (flashcard_id, session['user_id']))
        
        if not cursor.fetchone():
            return jsonify({'error': 'Flashcard não encontrado', 'success': False}), 404
        
        # Deletar flashcard
        cursor.execute("DELETE FROM flashcards WHERE id = %s", (flashcard_id,))
        connection.commit()
        
        return jsonify({'message': 'Flashcard deletado com sucesso', 'success': True})
        
    except Error as e:
        print(f"Erro ao deletar flashcard: {e}")
        return jsonify({'error': 'Erro interno do servidor', 'success': False}), 500
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()



@app.route('/calendario')
@require_login
def calendario():
    
    return render_template('calendario.html', username=session.get('username'))

# API CRUD TAREFAS/EVENTOS

@app.route('/api/tasks', methods=['GET'])
@require_login
def api_listar_tasks():
    
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': 'Erro de conexão com o banco', 'success': False}), 500
    
    try:
        cursor = connection.cursor(dictionary=True)
        
        # Buscar tarefas do usuário
        cursor.execute("""
            SELECT id, title, description, due_date, recurring, 
                   recurrence_rule, completed, created_at
            FROM tasks
            WHERE user_id = %s
            ORDER BY due_date ASC, created_at DESC
        """, (session['user_id'],))
        
        tasks = cursor.fetchall()
        
        
        for task in tasks:
            if isinstance(task['created_at'], datetime):
                task['created_at'] = task['created_at'].isoformat()
            if task['due_date'] and isinstance(task['due_date'], datetime):
                task['due_date'] = task['due_date'].isoformat()
        
        return jsonify({'tasks': tasks, 'success': True})
        
    except Error as e:
        print(f"Erro ao listar tarefas: {e}")
        return jsonify({'error': 'Erro interno do servidor', 'success': False}), 500
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()

@app.route('/api/tasks', methods=['POST'])
@require_login
def api_criar_task():
    
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Dados não fornecidos', 'success': False}), 400
    
    title = data.get('title', '').strip()
    description = data.get('description', '').strip()
    due_date_str = data.get('due_date')
    recurring = data.get('recurring', False)
    recurrence_rule = data.get('recurrence_rule', '')
    
    if not title:
        return jsonify({'error': 'Título é obrigatório', 'success': False}), 400
    
    # Converter string de data para datetime se fornecida
    due_date = None
    if due_date_str:
        try:
            due_date = datetime.fromisoformat(due_date_str.replace('Z', '+00:00'))
        except ValueError:
            return jsonify({'error': 'Formato de data inválido', 'success': False}), 400
    
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': 'Erro de conexão com o banco', 'success': False}), 500
    
    try:
        cursor = connection.cursor(dictionary=True)
        
        # Inserir nova tarefa
        cursor.execute("""
            INSERT INTO tasks (user_id, title, description, due_date, recurring, recurrence_rule, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (session['user_id'], title, description, due_date, recurring, recurrence_rule, datetime.now()))
        
        task_id = cursor.lastrowid
        connection.commit()
        
        # Retornar tarefa criada
        cursor.execute("""
            SELECT id, title, description, due_date, recurring, 
                   recurrence_rule, completed, created_at
            FROM tasks WHERE id = %s
        """, (task_id,))
        
        nova_task = cursor.fetchone()
        
        
        if isinstance(nova_task['created_at'], datetime):
            nova_task['created_at'] = nova_task['created_at'].isoformat()
        if nova_task['due_date'] and isinstance(nova_task['due_date'], datetime):
            nova_task['due_date'] = nova_task['due_date'].isoformat()
        
        return jsonify({'task': nova_task, 'success': True}), 201
        
    except Error as e:
        print(f"Erro ao criar tarefa: {e}")
        return jsonify({'error': 'Erro interno do servidor', 'success': False}), 500
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()

@app.route('/api/tasks/<int:task_id>', methods=['PUT'])
@require_login
def api_atualizar_task(task_id):
    
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Dados não fornecidos', 'success': False}), 400
    
    title = data.get('title', '').strip()
    description = data.get('description', '').strip()
    due_date_str = data.get('due_date')
    completed = data.get('completed', False)
    recurring = data.get('recurring', False)
    recurrence_rule = data.get('recurrence_rule', '')
    
    if not title:
        return jsonify({'error': 'Título é obrigatório', 'success': False}), 400
    
    
    due_date = None
    if due_date_str:
        try:
            due_date = datetime.fromisoformat(due_date_str.replace('Z', '+00:00'))
        except ValueError:
            return jsonify({'error': 'Formato de data inválido', 'success': False}), 400
    
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': 'Erro de conexão com o banco', 'success': False}), 500
    
    try:
        cursor = connection.cursor(dictionary=True)
        
        # Verifica se a tarefa existe e pertence ao usuário
        cursor.execute("""
            SELECT id FROM tasks
            WHERE id = %s AND user_id = %s
        """, (task_id, session['user_id']))
        
        if not cursor.fetchone():
            return jsonify({'error': 'Tarefa não encontrada', 'success': False}), 404
        
        # Atualizar tarefa
        cursor.execute("""
            UPDATE tasks
            SET title = %s, description = %s, due_date = %s, completed = %s, 
                recurring = %s, recurrence_rule = %s
            WHERE id = %s
        """, (title, description, due_date, completed, recurring, recurrence_rule, task_id))
        
        connection.commit()
        
        return jsonify({'message': 'Tarefa atualizada com sucesso', 'success': True})
        
    except Error as e:
        print(f"Erro ao atualizar tarefa: {e}")
        return jsonify({'error': 'Erro interno do servidor', 'success': False}), 500
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()

@app.route('/api/tasks/<int:task_id>', methods=['DELETE'])
@require_login
def api_deletar_task(task_id):
    
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': 'Erro de conexão com o banco', 'success': False}), 500
    
    try:
        cursor = connection.cursor()
        
        # Verifica se a tarefa existe e pertence ao usuário
        cursor.execute("""
            SELECT id FROM tasks
            WHERE id = %s AND user_id = %s
        """, (task_id, session['user_id']))
        
        if not cursor.fetchone():
            return jsonify({'error': 'Tarefa não encontrada', 'success': False}), 404
        
        # Deletar tarefa
        cursor.execute("DELETE FROM tasks WHERE id = %s", (task_id,))
        connection.commit()
        
        return jsonify({'message': 'Tarefa deletada com sucesso', 'success': True})
        
    except Error as e:
        print(f"Erro ao deletar tarefa: {e}")
        return jsonify({'error': 'Erro interno do servidor', 'success': False}), 500
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()

@app.route('/api/tasks/date/<date_str>', methods=['GET'])
@require_login
def api_tasks_por_data(date_str):
    
    try:
        # Converter string de data
        target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'Formato de data inválido (use YYYY-MM-DD)', 'success': False}), 400
    
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': 'Erro de conexão com o banco', 'success': False}), 500
    
    try:
        cursor = connection.cursor(dictionary=True)
        
        # Buscar tarefas para a data específica
        cursor.execute("""
            SELECT id, title, description, due_date, recurring, 
                   recurrence_rule, completed, created_at
            FROM tasks
            WHERE user_id = %s AND DATE(due_date) = %s
            ORDER BY due_date ASC
        """, (session['user_id'], target_date))
        
        tasks = cursor.fetchall()
        
        
        for task in tasks:
            if isinstance(task['created_at'], datetime):
                task['created_at'] = task['created_at'].isoformat()
            if task['due_date'] and isinstance(task['due_date'], datetime):
                task['due_date'] = task['due_date'].isoformat()
        
        return jsonify({'tasks': tasks, 'date': date_str, 'success': True})
        
    except Error as e:
        print(f"Erro ao buscar tarefas por data: {e}")
        return jsonify({'error': 'Erro interno do servidor', 'success': False}), 500
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()

