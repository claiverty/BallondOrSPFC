// elementos do HTML que vão ser usados
const loginButton = document.getElementById("login-btn");
const formVotacao = document.getElementById("form-votacao");
const cronometroDiv = document.getElementById('cronometro');

// conectando com o supabase
const SUPABASE_URL = "https://yuadgwysfngfcxujxhdw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1YWRnd3lzZm5nZmN4dWp4aGR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5NjA3MjgsImV4cCI6MjA3MDUzNjcyOH0.aXphwPM8SAfq7sSCMbH_s5-i59InG2f2z6JgF0zeyf0";

// inicializando o client da supabse
const { createClient } = supabase;
const _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


// logica pagina votacao
if (loginButton && formVotacao) {
    const statusMessage = document.getElementById("mensagem-status");
    const painelEncerrado = document.getElementById("votacao-encerrada");
    
    // data de encerramento 
    const dataStringVotacao = "26/09/2025 23:59:59";
    
    function parseDateBRVotacao(dataString) {
        const partes = dataString.split(" ");
        const dataPartes = partes[0].split("/");
        const tempoPartes = partes[1].split(":");
        return new Date(dataPartes[2], dataPartes[1] - 1, dataPartes[0], tempoPartes[0], tempoPartes[1], tempoPartes[2]);
    }
    const dataFinalVotacao = parseDateBRVotacao(dataStringVotacao).getTime();
    const agoraVotacao = new Date().getTime();

    if (agoraVotacao > dataFinalVotacao) {
        // se a votacao acabou
        const painelPrincipal = document.querySelector("main");
        const tituloOriginal = document.querySelector('.container > h1');
        
        if(painelPrincipal) painelPrincipal.style.display = 'none';
        if(painelEncerrado) painelEncerrado.classList.remove('hidden');
        if(tituloOriginal) tituloOriginal.style.display = 'none';

    } else {
        // se a votacao esta aberta
        
        // interface apos login
        function updateUserInterface(user) {
            if (user) {
                //usuario ta logado
                statusMessage.textContent = `Logado como: ${user.user_metadata.full_name}. Vote agora!`;
                loginButton.classList.add("hidden"); // esconde btn login
                formVotacao.classList.remove("hidden"); // mostra o formulario
            } else {
                //usuario deslogado
                statusMessage.textContent = "Faça login com o seu Discord para poder votar.";
                loginButton.classList.remove("hidden"); // mostra btn login
                formVotacao.classList.add("hidden"); // esconde o formulario
            }
        }

        // login com discord
        async function loginComDiscord() {
            await _supabase.auth.signInWithOAuth({
                provider: "discord"
            });
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
                alert("Você já votou antes! Obrigado por participar."); 
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
                statusMessage.innerHTML = `<h2>Voto Confirmado! ✅</h2><p>Obrigado, ${user.user_metadata.full_name}! Os resultados serão divulgados em breve no Discord.</p>`; // CORRIGIDO: Fechamento do </p>
            }
        }
        formVotacao.addEventListener("submit", handleFormSubmit);

        //verificar o estado da autenticação
        _supabase.auth.onAuthStateChange((_, session) => {
            const user = session ? session.user : null;
            updateUserInterface(user);
        });
    }
}


// logica do cronometro
if (cronometroDiv) {
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
        
        //calcula o tempo
        const dias = Math.floor(distancia / (1000 * 60 * 60 * 24));
        const horas = Math.floor((distancia % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutos = Math.floor((distancia % (1000 * 60 * 60)) / (1000 * 60));
        const segundos = Math.floor((distancia % (1000 * 60)) / 1000);

        document.getElementById('dias').innerText = dias.toString().padStart(2, '0');
        document.getElementById('horas').innerText = horas.toString().padStart(2, '0');
        document.getElementById('minutos').innerText = minutos.toString().padStart(2, '0');
        document.getElementById('segundos').innerText = segundos.toString().padStart(2, '0');

        //mensagem exibida quando a contagem acabar
        if (distancia < 0) {
            clearInterval(intervalo);
            const container = document.getElementById("cronometro-container");
            if (container) {
                container.innerHTML = "<h2 style='color:#e00000; font-size: 1.5em;'>VOTAÇÃO ENCERRADA!</h2>";
            }
        }
    }, 1000);
}