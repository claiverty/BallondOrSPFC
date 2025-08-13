const ADMIN_USER_ID = "9e3c0f66-eeaa-408b-a75b-f6417af41ee9"

const painelResultados = document.getElementById("painel-resultados")
const acessoNegado = document.getElementById("acesso-negado")

//conectando com supabase
const SUPABASE_URL = "https://yuadgwysfngfcxujxhdw.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1YWRnd3lzZm5nZmN4dWp4aGR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5NjA3MjgsImV4cCI6MjA3MDUzNjcyOH0.aXphwPM8SAfq7sSCMbH_s5-i59InG2f2z6JgF0zeyf0"

const {createClient} = supabase 
const _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function verificarAcesso() {
  // pega o usuario logado
  const {data: {user}} = await _supabase.auth.getUser()


// ADICIONE ESTAS DUAS LINHAS AQUI PARA DEPURAR
    console.log('ID do usuário que está logado:', user ? user.id : 'Ninguém logado');
    console.log('ID do Admin que eu espero:', ADMIN_USER_ID);


    // se o usuario logado é o ID do admin
    if(user && user.id === ADMIN_USER_ID) {
      console.log("Acesso concedido. Bem vindo, Claiverty!")
      painelResultados.classList.remove("hidden")
    } else {
    // se nao esta logado ou é outro usuario
    console.log("Acesso negado!")
    acessoNegado.classList.remove("hidden") 
    }
  
  
}

verificarAcesso()