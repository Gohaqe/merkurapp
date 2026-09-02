// js/login.js
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const user = document.getElementById('username').value.trim();
    const pass = document.getElementById('password').value.trim();
    const btn = document.getElementById('btnLogin');
    const errorMsg = document.getElementById('errorMsg');

    btn.textContent = 'Verificando...';
    btn.disabled = true;
    errorMsg.classList.add('hidden');

    const { data, error } = await supabaseClient
        .from('usuarios')
        .select('id, nombres, apellidos, cargo') 
        .eq('usuario', user)
        .eq('contrasena', pass)
        .single(); 

    btn.textContent = 'Ingresar';
    btn.disabled = false;

    if (error || !data) {
        errorMsg.classList.remove('hidden');
    } else {
        // Guardamos la sesión de forma persistente
        localStorage.setItem('usuario_id', data.id);
        localStorage.setItem('usuario_nombre', `${data.nombres} ${data.apellidos}`);
        
        window.location.replace('dashboard.html');
    }
});