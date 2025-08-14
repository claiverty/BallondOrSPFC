const ADMIN_USER_ID = "9e3c0f66-eeaa-408b-a75b-f6417af41ee9"

const painelResultados = document.getElementById("painel-resultados")
const acessoNegado = document.getElementById("acesso-negado")

// conectando com supabase
const SUPABASE_URL = "https://yuadgwysfngfcxujxhdw.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1YWRnd3lzZm5nZmN4dWp4aGR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5NjA3MjgsImV4cCI6MjA3MDUzNjcyOH0.aXphwPM8SAfq7sSCMbH_s5-i59InG2f2z6JgF0zeyf0"

const {createClient} = supabase 
const _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// funcao para carreegar os resultados e graficos
async function carregarResultados() {
  console.log("Buscando votos na Supabase...");
  const { data: votos, error} = await _supabase.from("votos").select("*")

  if(error) {
    console.error("Erro ao buscar votos:", error)
    alert("Não foi possível carregar os resultados.")
    return
  }
  
  if(votos.length === 0) {
    console.log("Nenhum voto encontrado para exibir")
    return
  }

  console.log("Votos encontrados:", votos)

  // mapeando entre os nomes das colunas e ids no html
  const categorias = {
      mais_querido: "graficoMaisQuerido",
      staff_do_ano: "graficoStaffAno",
      membro_do_ano: "graficoMembroAno",
      membro_mais_ativo: "graficoMembroAtivo",
      rei_da_resenha: "graficoReiResenha",
      o_mais_chato: "graficoMaisChato"
  }

  // processa e gria grafico para cada categoria
  for (const categoriaNome in categorias) {
    const canvasId = categorias[categoriaNome]
    const contagemVotos = {}

    // contagem de votos para a categoria
    for (const voto of votos) {
      const indicado = voto[categoriaNome]
      if(indicado) {
        contagemVotos[indicado] = (contagemVotos[indicado] || 0) + 1
      }
    }

    // prepara os dados do grafico
    const labels = Object.keys(contagemVotos)
    const dataPoints = Object.values(contagemVotos)

    // cria o grafico
    if (labels.length > 0) {
        new Chart(document.getElementById(canvasId), {
          type: "bar",
          data: {
            labels: labels,
            datasets: [{
              label: "Total de Votos",
              data: dataPoints,
              backgroundColor: "rgba(224, 0, 0, 0.8)",
              borderColor: "rgba(255, 255, 255, 1)",
              borderWidth: 1
            }]
          },
          options: {
                    indexAxis: 'y', // Deixa as barras na horizontal, melhor para ler os nomes
                    scales: {
                        x: {
                            beginAtZero: true,
                            ticks: {
                                color: '#fff', // Cor dos números no eixo X
                                stepSize: 1 // Garante que a contagem seja de 1 em 1
                            }
                        },
                        y: {
                            ticks: {
                                color: '#fff' // Cor dos nomes no eixo Y
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: false // Esconde a legenda "Total de Votos"
                        }
                    }
                }
        })
    }
  }
}

async function verificarAcesso() {
  // pega o usuario logado
  const {data: {user}} = await _supabase.auth.getUser()

    // se o usuario logado é o ID do admin
    if(user && user.id === ADMIN_USER_ID) {
      console.log("Acesso concedido. Bem vindo, Claiverty!")
      painelResultados.classList.remove("hidden")
      
      // AQUI ESTÁ A MUDANÇA PRINCIPAL
      carregarResultados();

    } else {
    // se nao esta logado ou é outro usuario
    console.log("Acesso negado!")
    acessoNegado.classList.remove("hidden") 
    }
}

verificarAcesso()