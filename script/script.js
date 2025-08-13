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
    statusMessage.textContent = `Logado como: ${user.user_metadata.full_name}. Vote agora!`
    loginButton.classList.add("hidden") // esconde btn login
    formVotacao.classList.remove("hidden") // mostra o formulario
  } else {
    //usuario deslogado
    statusMessage.textContent = "Faça login com o seu Discord para poder votar."
    loginButton.classList.remove("hidden") // mostra btn login
    formVotacao.classList.add("hidden") // esconde o formulario
  }
}

// login com discord
async function loginComDiscord() {
  await _supabase.auth.signInWithOAuth({
    provider: "discord"
  })
}
// chamando a função no botao de login
loginButton.addEventListener("click", loginComDiscord)

// funcao para enviar os votos
async function handleFormSubit() {
event.preventDefault()

  const submitButton = formVotacao.querySelector("button[type= 'submit']")
  submitButton.disabled = true
  submitButton.textContent = "Enviando..."

  //pega id do usuario
  const {data: {user}} = await _supabase.auth.getUser()

  //verifica se o usuario ja votou
  const {data: existingVote, error:selectError} = await _supabase
  .from("votos")
  .select("id")
  .eq("user_id", user.id)
  .single()

  if(selectError && selectError.code != "PGRST116") {
    alert(`Erro ao verificar seu voto: ${selectError.message}`)
    submitButton.disabled = false
    submitButton.textContent = "Enviar Votos"
    return
  }
  
  if(existingVote) {
    alert("Você já votou! Obrigaado por participar.")
    formVotacao.classList.add("hidden")
    statusMessage.innerHTML = `<h2>Seu voto já foi registrado anteriormente. ✅</h2><p>Obrigado, ${user.user_metadata.full_name}! Os resultados serão divulgados em breve.</p>`
    return
  }

  //se nao tiver votado, os dados do form sao enviados
  const formData = new FormData(formVotacao)
  const voto = {
      user_id: user.id,
      mais_querido: formData.get("mais_querido"),
      staff_do_ano: formData.get("staff_do_ano"),
      membro_do_ano: formData.get("membro_do_ano"),
      membro_mais_ativo: formData.get("membro_mais_ativo"),
      rei_da_resenha: formData.get("rei_da_resenha"),
      o_mais_chato: formData.get("o_mais_chato"),
  }
  const {error: insertError} = await _supabase.from("votos").insert(voto)

  if(insertError) {
    alert(`Ocorreu um erro ao registrar seu voto: ${insertError.message}`)
    submitButton.disabled = false
    submitButton.textContent = "Enviar Votos"
  } else {
    alert("Voto registrado com sucesso! Obrigado por participar!")
    formVotacao.classList.add("hidden")
    statusMessage.innerHTML = `<h2>Voto Confirmado! ✅</h2><p>Obrigado, ${user.user_metadata.full_name}! Os resultados serão divulgados em breve no Discord.`
  }
  
}
formVotacao.addEventListener("submit", handleFormSubit)


//verificar o estado da autenticação
_supabase.auth.onAuthStateChange((event, session) => {
  const user = session ? session.user  : null
  updateUserInterface(user)
})
  
