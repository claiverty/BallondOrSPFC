import { _supabase } from './supabase-client.js';

const loginButton = document.getElementById('login-btn');
const formVotacao = document.getElementById('form-votacao');

function updateUserInterface(user) {
    const statusMessage = formVotacao.querySelector('#mensagem-status');

    if (user) {
        // se tem usuário, define o estado como logado
        document.body.classList.remove('logged-out');
        document.body.classList.add('logged-in');
        statusMessage.textContent = `Logado como: ${user.user_metadata.full_name}. Vote agora!`;
    } else {
        // se não tem, define o estado como deslogado
        document.body.classList.remove('logged-in');
        document.body.classList.add('logged-out');
        statusMessage.textContent = 'Faça o login com seu Discord para poder votar.';
    }
}}

async function loginComDiscord() {
    await _supabase.auth.signInWithOAuth({ provider: 'discord' });
}

async function handleFormSubmit(event) {
    event.preventDefault();
    const submitButton = formVotacao.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'Enviando...';
    
    const { data: { user } } = await _supabase.auth.getUser();
    
    const { data: existingVote } = await _supabase.from('votos').select('id').eq('user_id', user.id).single();
    if (existingVote) {
        alert('Você já votou!');
        formVotacao.classList.add('hidden');
        formVotacao.querySelector('#mensagem-status').innerHTML = `<h2>Seu voto já foi registrado anteriormente. ✅</h2>`;
        return;
    }
    
    const formData = new FormData(formVotacao);
    const voto = {
        user_id: user.id,
        mais_querido: formData.get('mais_querido'),
        staff_do_ano: formData.get('staff_do_ano'),
        membro_do_ano: formData.get('membro_do_ano'),
        membro_mais_ativo: formData.get('membro_mais_ativo'),
        rei_da_resenha: formData.get('rei_da_resenha'),
        o_mais_chato: formData.get('o_mais_chato'),
    };

    const { error: insertError } = await _supabase.from('votos').insert(voto);

    if (insertError) {
        alert(`Ocorreu um erro: ${insertError.message}`);
        submitButton.disabled = false;
        submitButton.textContent = 'Enviar Votos';
    } else {
        alert('Voto registrado com sucesso!');
        formVotacao.classList.add('hidden');
        formVotacao.querySelector('#mensagem-status').innerHTML = `<h2>Voto Confirmado! ✅</h2>`;
    }
}

loginButton.addEventListener('click', loginComDiscord);
formVotacao.addEventListener('submit', handleFormSubmit);

_supabase.auth.onAuthStateChange((_, session) => {
    const user = session ? session.user : null;
    updateUserInterface(user);
});