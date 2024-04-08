let auth0Client;
let user = null;
let tarefasContainer = null;

document.addEventListener('DOMContentLoaded', async () => {
    tarefasContainer = document.getElementById('tasks-list');
    auth0Client = await createAuth0Client({
        domain: 'dev-6je86woartrc1pi1.us.auth0.com',
        client_id: 'W167A9iGNOl6wtYnkNAkFbgkmclnFf4W',
        redirect_uri: 'http://localhost:5500/callback',
    });

    try {
        await auth0Client.getTokenSilently();
        user = await auth0Client.getUser();
        carregarTarefasDoBackend();
    } catch (error) {
        carregarTarefasLocais();
    }

    updateUI(await auth0Client.isAuthenticated());

    document.getElementById('btn-login').addEventListener('click', login);
    document.getElementById('btn-logout').addEventListener('click', logout);
    document.getElementById('form-tarefa').addEventListener('submit', adicionarTarefa);
});

async function login() {
    await auth0Client.loginWithRedirect();
}

async function logout() {
    await auth0Client.logout({ returnTo: window.location.origin });
    localStorage.removeItem('tarefas');
    user = null;
    updateUI(false);
}

async function updateUI(isAuthenticated) {
    document.getElementById('btn-login').style.display = isAuthenticated ? 'none' : 'block';
    document.getElementById('btn-logout').style.display = isAuthenticated ? 'block' : 'none';
    if (isAuthenticated) {
        user = await auth0Client.getUser();
        await migrarTarefasParaBackend();
    } else {
        carregarTarefasLocais();
    }
}

function adicionarTarefa(event) {
    event.preventDefault();
    if (!user) {
        alert("Você precisa estar logado para adicionar tarefas.");
        return;
    }
    
    const title = document.getElementById('title').value;
    const info = document.getElementById('info').value;
    const label = document.getElementById('label').value;
    const date = document.getElementById('date').value;
    
    const tarefaData = { id: Date.now().toString(), title, info, label, date, userId: user.sub };
    
    adicionarTarefaDOM(tarefaData);
    salvarTarefaNoBackend(tarefaData);
    
    document.getElementById('form-tarefa').reset();
}

function adicionarTarefaDOM(tarefaData) {        
    if (!user || user.sub !== tarefaData.userId) {
        return;
    }
        
    const tarefaDiv = document.createElement('div');
    tarefaDiv.classList.add('tarefa');
    tarefaDiv.setAttribute('data-task-id', tarefaData.id);
  
    const titleEl = document.createElement('h3');
    titleEl.textContent = tarefaData.title;
  
    const infoEl = document.createElement('p');
    infoEl.textContent = tarefaData.info;
  
    const labelEl = document.createElement('span');
    labelEl.textContent = tarefaData.label;
  
    const dateEl = document.createElement('time');
    dateEl.textContent = tarefaData.date;
  
    const concluirBtn = document.createElement('button');
    concluirBtn.textContent = 'Concluir';
    concluirBtn.addEventListener('click', () => tarefaDiv.classList.toggle('concluida'));
  
    const excluirBtn = document.createElement('button');
    excluirBtn.textContent = 'Excluir';
    excluirBtn.addEventListener('click', () => tarefaDiv.remove());
  
    const editarBtn = document.createElement('button');
    editarBtn.textContent = 'Editar';
  
    tarefaDiv.appendChild(titleEl);
    tarefaDiv.appendChild(infoEl);
    tarefaDiv.appendChild(labelEl);
    tarefaDiv.appendChild(dateEl);
    tarefaDiv.appendChild(concluirBtn);
    tarefaDiv.appendChild(excluirBtn);
    tarefaDiv.appendChild(editarBtn);

    const tarefasContainer = document.getElementById('tasks-list');
    tarefasContainer.appendChild(tarefaDiv);
}
  
function salvarTarefaLocalmente(tarefaData) {
    let tarefas = JSON.parse(localStorage.getItem('tarefas')) || [];
    tarefas.push(user ? { ...tarefaData, userId: user.sub } : tarefaData);
    localStorage.setItem('tarefas', JSON.stringify(tarefas));
}
    
async function salvarTarefaNoBackend(tarefaData) {
    const token = await auth0Client.getTokenSilently();
    try {
        const response = await fetch('/api/tarefas', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(tarefaData)
        });

        if (!response.ok) throw new Error(await response.text());
    } catch (error) {
        console.error('Erro ao salvar no backend:', error.message);
    }
}
  
function carregarTarefasLocais() {
    let tarefas = JSON.parse(localStorage.getItem('tarefas')) || [];
    tarefasContainer.innerHTML = '';
    tarefas.forEach(tarefaData => adicionarTarefaDOM(tarefaData));
}
  
async function carregarTarefasDoBackend() {
    try {
        const token = await auth0Client.getTokenSilently();
        const response = await fetch('/api/tarefas', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Não foi possível carregar as tarefas do backend');

        const tarefas = await response.json();
        tarefasContainer.innerHTML = ''; 
        tarefas.forEach(tarefaData => adicionarTarefaDOM(tarefaData));
    } catch (error) {
        console.error(error.message);
    }
}

async function migrarTarefasParaBackend() {
    let tarefas = JSON.parse(localStorage.getItem('tarefas')) || [];
    for (const tarefa of tarefas) {
        if (!tarefa.userId) tarefa.userId = user.sub;
        await salvarTarefaNoBackend(tarefa);
    }
    localStorage.removeItem('tarefas'); 
    await carregarTarefasDoBackend(); 
}
