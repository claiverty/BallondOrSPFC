// elementos do HTML que vão ser usados
const loginButton = document.getElementById("login-btn")
const formVotacao = document.getElementById("form-votacao")
const statusMessage = document.getElementById("mensagem-status")

// conectando com o supabase
const SUPABASE_URL = "https://yuadgwysfngfcxujxhdw.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1YWRnd3lzZm5nZmN4dWp4aGR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5NjA3MjgsImV4cCI6MjA3MDUzNjcyOH0.aXphwPM8SAfq7sSCMbH_s5-i59InG2f2z6JgF0zeyf0"

// inicializando o client da supabse
const {createClient} = supabase 
const _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// interface apos login
function updateUserInterface(user) {
  if(user) {
    //usuario ta logado
    console.log("Usuário está logado:", user)
    statusMessage.textContent = `Logado como: ${user.user_metadata.full_name}. Vote agora!`
    loginButton.classList.add("hidden") // esconde btn login
    formVotacao.classList.remove("hidden") // mostra o formulario
  } else {
    //usuario deslogado
    console.log("Nenhum usuário está logado.")
    statusMessage.textContent = "Faça login com o seu Discord para poder votar."
    loginButton.classList.remove("hidden") // mostra btn login
    formVotacao.classList.add("hidden") // esconde o formulario
  }
}

// login com discord
async function loginComDiscord() {
  const {error} = await _supabase.auth.signInWithOAuth({
    provider: "discord"
  })

  if(error) {
    console.error("Erro no login: ", error)
  }
}

// chamando a função no botao de login
loginButton.addEventListener("click", () => {
  loginComDiscord()
})

//verificar o estado da autenticação
_supabase.auth.onAuthStateChange((event, session) => {
  //session contem as informacoes do usuario logado
  // se a sessao existe, session.user tambem existe
  const user = session ? session.user  : null
  updateUserInterface(user)
})
  
