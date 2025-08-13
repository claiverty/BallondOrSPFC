const ADMIN_USER_ID = "9e3c0f66-eeaa-408b-a75b-f6417af41ee9"

const painelResultados = document.getElementById("painel-resultados")
const acessoNegado = document.getElementById("acesso-negado")

// conectando com supabase
const SUPABASE_URL = "https://yuadgwysfngfcxujxhdw.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1YWRnd3lzZm5nZmN4dWp4aGR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5NjA3MjgsImV4cCI6MjA3MDUzNjcyOH0.aXphwPM8SAfq7sSCMbH_s5-i59InG2f2z6JgF0zeyf0"

const {createClient} = supabase 
const _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// funcao para carreegar os resultados e graficos
// Substitua sua função antiga por esta versão com "espiões"
async function carregarResultados() {
    console.log('--- ETAPA 1: Iniciando busca por votos...');
    const { data: votos, error } = await _supabase.from('votos').select('*');

    if (error) {
        console.error('ERRO na busca de votos:', error);
        alert('Não foi possível carregar os resultados.');
        return;
    }

    // ESPAÇO DE VERIFICAÇÃO 1: O que veio do Supabase?
    console.log('--- ETAPA 2: Dados recebidos do Supabase:', votos);
    
    if (!votos || votos.length === 0) {
        console.log('AVISO: A tabela de votos está vazia. Nenhum gráfico será desenhado.');
        return;
    }

    const categorias = {
        mais_querido: 'graficoMaisQuerido',
        staff_do_ano: 'graficoStaffAno',
        membro_do_ano: 'graficoMembroAno',
        membro_mais_ativo: 'graficoMembroAtivo',
        rei_da_resenha: 'graficoReiResenha',
        o_mais_chato: 'graficoMaisChato'
    };

    console.log('--- ETAPA 3: Iniciando contagem de votos para cada categoria...');
    for (const categoriaNome in categorias) {
        const canvasId = categorias[categoriaNome];
        const contagemVotos = {};

        for (const voto of votos) {
            const indicado = voto[categoriaNome];
            if (indicado) {
                contagemVotos[indicado] = (contagemVotos[indicado] || 0) + 1;
            }
        }

        // ESPAÇO DE VERIFICAÇÃO 2: A contagem funcionou?
        console.log(`-> Contagem para "${categoriaNome}":`, contagemVotos);

        const labels = Object.keys(contagemVotos);
        const dataPoints = Object.values(contagemVotos);

        // ESPAÇO DE VERIFICAÇÃO 3: Os dados para o gráfico estão corretos?
        console.log(`-> Preparando gráfico "${canvasId}" com:`, { labels, dataPoints });

        // Só desenha o gráfico se tiver pelo menos um voto para a categoria
        if (labels.length > 0) {
            new Chart(document.getElementById(canvasId), {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Total de Votos',
                        data: dataPoints,
                        backgroundColor: 'rgba(224, 0, 0, 0.8)',
                        borderColor: 'rgba(255, 255, 255, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    indexAxis: 'y',
                    scales: {
                        x: {
                            beginAtZero: true,
                            ticks: {
                                color: '#fff',
                                stepSize: 1
                            }
                        },
                        y: {
                            ticks: {
                                color: '#fff'
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: false
                        }
                    }
                }
            });
            console.log(`--> Gráfico para "${categoriaNome}" desenhado com sucesso.`);
        } else {
            console.log(`--> Nenhum voto para "${categoriaNome}", gráfico não será desenhado.`);
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
    } else {
    // se nao esta logado ou é outro usuario
    console.log("Acesso negado!")
    acessoNegado.classList.remove("hidden") 
    }
  
  
}

verificarAcesso()