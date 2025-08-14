import { _supabase } from './supabase-client.js';

// --- LÓGICA DA PÁGINA DE VOTAÇÃO ---
const loginButton = document.getElementById("login-btn");
const formVotacao = document.getElementById("form-votacao");

if (loginButton && formVotacao) {
    const statusMessage = document.getElementById("mensagem-status");

    // interface apos login
    function updateUserInterface(user) {
        if (user) {
            //usuario ta logado
            statusMessage.textContent = `Logado como: ${user.user_metadata.full_name}. Vote agora!`;
            document.body.classList.remove('logged-out');
            document.body.classList.add('logged-in');
        } else {
            //usuario deslogado
            statusMessage.textContent = "Faça login com o seu Discord para poder votar.";
            document.body.classList.remove('logged-in');
            document.body.classList.add('logged-out');
        }
    }

    // login com discord
    async function loginComDiscord() {
        await _supabase.auth.signInWithOAuth({ provider: "discord" });
    }
    // chamando a função no botao de login
    loginButton.addEventListener("click", loginComDiscord);

    // funcao para enviar os votos
    async function handleFormSubmit(event) {
        event.preventDefault();
        const submitButton = formVotacao.querySelector("button[type='submit']");
        submitButton.disabled = true;
        submitButton.textContent = "Enviando...";

        //pega id do usuario
        const { data: { user } } = await _supabase.auth.getUser();

        //verifica se o usuario ja votou
        const { data: existingVote, error: selectError } = await _supabase
            .from("votos")
            .select("id")
            .eq("user_id", user.id)
            .single();

        if (selectError && selectError.code !== "PGRST116") {
            alert(`Erro ao verificar seu voto: ${selectError.message}`);
            submitButton.disabled = false;
            submitButton.textContent = "Enviar Votos";
            return;
        }

        if (existingVote) {
            alert("Você já votou! Obrigado por participar.");
            formVotacao.classList.add("hidden");
            statusMessage.innerHTML = `<h2>Seu voto já foi registrado anteriormente. ✅</h2><p>Obrigado, ${user.user_metadata.full_name}! Os resultados serão divulgados em breve.</p>`;
            return;
        }

        //se nao tiver votado, os dados do form sao enviados
        const formData = new FormData(formVotacao);
        const voto = {
            user_id: user.id,
            mais_querido: formData.get("mais_querido"),
            staff_do_ano: formData.get("staff_do_ano"),
            membro_do_ano: formData.get("membro_do_ano"),
            membro_mais_ativo: formData.get("membro_mais_ativo"),
            rei_da_resenha: formData.get("rei_da_resenha"),
            o_mais_chato: formData.get("o_mais_chato"),
        };
        const { error: insertError } = await _supabase.from("votos").insert(voto);

        if (insertError) {
            alert(`Ocorreu um erro ao registrar seu voto: ${insertError.message}`);
            submitButton.disabled = false;
            submitButton.textContent = "Enviar Votos";
        } else {
            alert("Voto registrado com sucesso! Obrigado por participar!");
            formVotacao.classList.add("hidden");
            statusMessage.innerHTML = `<h2>Voto Confirmado! ✅</h2><p>Obrigado, ${user.user_metadata.full_name}! Os resultados serão divulgados em breve no Discord.</p>`;
        }
    }
    formVotacao.addEventListener("submit", handleFormSubmit);

    //verificar o estado da autenticação
    _supabase.auth.onAuthStateChange((_, session) => {
        const user = session ? session.user : null;
        updateUserInterface(user);
    });
}

// --- LÓGICA DO CRONÔMETRO ---
if (document.getElementById("cronometro")) {
    //cronometro e data pt-br
    function parseDateBR(dataString) {
        const partes = dataString.split(" ");
        const dataPartes = partes[0].split("/");
        const tempoPartes = partes[1].split(":");
        return new Date(dataPartes[2], dataPartes[1] - 1, dataPartes[0], tempoPartes[0], tempoPartes[1], tempoPartes[2]);
    }

    const dataStringBR = "27/09/2025 23:59:59";
    const dataFinal = parseDateBR(dataStringBR).getTime();

    //atualiza o cronometro a cada 1 segundo
    const intervalo = setInterval(function() {
        const agora = new Date().getTime();
        const distancia = dataFinal - agora;
        const dias = Math.floor(distancia / (1000 * 60 * 60 * 24));
        const horas = Math.floor((distancia % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutos = Math.floor((distancia % (1000 * 60 * 60)) / (1000 * 60));
        const segundos = Math.floor((distancia % (1000 * 60)) / 1000);
        document.getElementById('dias').innerText = dias.toString().padStart(2, '0');
        document.getElementById('horas').innerText = horas.toString().padStart(2, '0');
        document.getElementById('minutos').innerText = minutos.toString().padStart(2, '0');
        document.getElementById('segundos').innerText = segundos.toString().padStart(2, '0');
        if (distancia < 0) {
            clearInterval(intervalo);
            const container = document.getElementById("cronometro-container");
            if (container) {
                container.innerHTML = "<h2 style='color:#e00000; font-size: 1.5em;'>VOTAÇÃO ENCERRADA!</h2>";
            }
        }
    }, 1000);
}