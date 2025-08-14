// cronometro br
function parseDateBR(dataString) {
    const partes = dataString.split(' ');
    const dataPartes = partes[0].split('/');
    const tempoPartes = partes[1].split(':');
    return new Date(dataPartes[2], dataPartes[1] - 1, dataPartes[0], tempoPartes[0], tempoPartes[1], tempoPartes[2]);
}

const dataStringBR = '28/09/2025 00:00:00';
const dataFinal = parseDateBR(dataStringBR).getTime();

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
        const container = document.getElementById('cronometro-container');
        if (container) {
            container.innerHTML = "<h2 style='color:#e00000; font-size: 1.5em;'>VOTAÇÃO ENCERRADA!</h2>";
        }
    }
}, 1000);