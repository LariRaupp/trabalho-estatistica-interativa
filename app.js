// ========= Seleção rápida de elementos =========
const $ = (sel) => document.querySelector(sel);

// ========= Formatação e mensagens =========
// formata número com duas casas
function format(n, casas = 2) {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
}

// mostra mensagem de feedback
function setMsg(text, tipo = "ok") {
  const el = $("#msg");
  el.textContent = text;
  el.className = tipo === "ok" ? "ok small" : "error small";
}

// ========= Entrada de dados =========
// aceita vírgula, espaço e ; / ignora inválidos
function parseDados(texto) {
  if (!texto) return [];
  return texto
    .split(/[,\s;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => Number(s.replace(",", ".")))
    .filter((v) => Number.isFinite(v));
}

// ========= Funções estatísticas =========
// média
function media(dados) {
  const soma = dados.reduce((acc, x) => acc + x, 0);
  return soma / dados.length;
}

// mediana
function mediana(dados) {
  const arr = [...dados].sort((a, b) => a - b);
  const n = arr.length;
  const m = Math.floor(n / 2);
  return n % 2 === 0 ? (arr[m - 1] + arr[m]) / 2 : arr[m];
}

// moda (lista; [] se todas freq = 1)
function moda(dados) {
  const freq = new Map();
  for (const x of dados) freq.set(x, (freq.get(x) || 0) + 1);
  let max = 0;
  for (const v of freq.values()) if (v > max) max = v;
  if (max === 1) return [];
  const modas = [...freq.entries()]
    .filter(([, f]) => f === max)
    .map(([k]) => k)
    .sort((a, b) => a - b);
  return modas;
}

// variância (populacional)
function varianciaPop(dados) {
  const m = media(dados);
  const ssd = dados.reduce((acc, x) => acc + (x - m) ** 2, 0);
  return ssd / dados.length;
}

// variância (amostral)
function varianciaAmostra(dados) {
  if (dados.length < 2) return NaN;
  const m = media(dados);
  const ssd = dados.reduce((acc, x) => acc + (x - m) ** 2, 0);
  return ssd / (dados.length - 1);
}

// desvios padrão
const dpPop = (dados) => Math.sqrt(varianciaPop(dados));
const dpAmost = (dados) => Math.sqrt(varianciaAmostra(dados));

// amplitude
function amplitude(dados) {
  return Math.max(...dados) - Math.min(...dados);
}

// coeficiente de variação (%)
function coefVar(dp, m) {
  if (m === 0) return NaN;
  return (dp / m) * 100;
}

// ========= Preparação para gráficos =========
// frequência simples (para barras/pizza)
function frequenciaSimples(dados) {
  const mapa = new Map();
  for (const x of dados) mapa.set(x, (mapa.get(x) || 0) + 1);
  const pares = [...mapa.entries()].sort((a, b) => Number(a[0]) - Number(b[0]));
  return {
    labels: pares.map((p) => String(p[0])),
    values: pares.map((p) => p[1]),
  };
}

// bins pelo Sturges
function binsSturges(n) {
  return Math.max(1, Math.ceil(1 + 3.322 * Math.log10(n)));
}

// dados do histograma
function histogramaDados(dados) {
  const min = Math.min(...dados);
  const max = Math.max(...dados);
  const n = dados.length;
  const k = binsSturges(n);
  const largura = (max - min) / k || 1;

  const limites = [];
  const freq = new Array(k).fill(0);

  for (let i = 0; i < k; i++) {
    const ini = min + i * largura;
    const fim = i === k - 1 ? max : min + (i + 1) * largura;
    limites.push([ini, fim]);
  }

  for (const x of dados) {
    let idx = Math.floor((x - min) / largura);
    if (idx >= k) idx = k - 1; // borda superior
    if (idx < 0) idx = 0;
    freq[idx]++;
  }

  const labels = limites.map(([a, b]) => `${a.toFixed(2)} – ${b.toFixed(2)}`);
  return { labels, values: freq };
}

// ========= Configuração Chart.js =========
let charts = { hist: null, barras: null, disp: null, pizza: null };

// recria gráfico do jeito certo
function resetChart(key, ctx, cfg) {
  if (charts[key]) {
    charts[key].destroy();
    charts[key] = null;
  }
  charts[key] = new Chart(ctx, cfg);
}

// barras
function cfgBarras(labels, data, titulo) {
  return {
    type: "bar",
    data: { labels, datasets: [{ label: "Frequência", data }] },
    options: {
      responsive: true,
      plugins: { title: { display: true, text: titulo } },
      scales: { y: { beginAtZero: true } },
    },
  };
}

// pizza
function cfgPizza(labels, data, titulo) {
  return {
    type: "pie",
    data: { labels, datasets: [{ data }] },
    options: {
      responsive: true,
      plugins: {
        title: { display: true, text: titulo },
        legend: { position: "right" },
      },
    },
  };
}

// dispersão
function cfgDisp(pontos, titulo) {
  return {
    type: "scatter",
    data: { datasets: [{ label: "Dados", data: pontos, pointRadius: 4 }] },
    options: {
      responsive: true,
      plugins: { title: { display: true, text: titulo } },
      scales: {
        x: { title: { display: true, text: "Índice (1..n)" } },
        y: { title: { display: true, text: "Valor" } },
      },
    },
  };
}

// baixa PNG do canvas
function baixarPNG(canvasId, nome) {
  const canvas = document.getElementById(canvasId);
  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = `${nome}.png`;
  link.click();
}

// ========= UI principal =========
const entrada = $("#entrada");
const tabela = $("#tabela");

// calcula e preenche a tabela
function calcular() {
  const dados = parseDados(entrada.value);
  if (!dados.length) {
    setMsg("Nenhum número válido. Confira separadores.", "err");
    tabela.style.display = "none";
    return null;
  }

  const n = dados.length;
  const m = media(dados);
  const med = mediana(dados);
  const mo = moda(dados);
  const varP = varianciaPop(dados);
  const varA = varianciaAmostra(dados);
  const dpP_ = Math.sqrt(varP);
  const dpA_ = Math.sqrt(varA);
  const cvP_ = coefVar(dpP_, m);
  const cvA_ = coefVar(dpA_, m);
  const amp = amplitude(dados);
  const min = Math.min(...dados);
  const max = Math.max(...dados);

  // NOVO: ordena os dados e mostra na caixinha
  const ordenados = [...dados].sort((a, b) => a - b);
  document.getElementById("ordenado").value = ordenados.join(", ");
  document.getElementById("ordenadoBox").style.display = "";

  // preenche tabela
  $("#mediaP").textContent = format(m);
  $("#medianaP").textContent = format(med);
  $("#modaP").textContent = mo && mo.length ? mo.join(", ") : "Sem moda";
  $("#varP").textContent = format(varP);
  $("#varA").textContent = format(varA);
  $("#dpP").textContent = format(dpP_);
  $("#dpA").textContent = format(dpA_);
  $("#cvP").textContent = Number.isFinite(cvP_) ? `${format(cvP_)} %` : "—";
  $("#cvA").textContent = Number.isFinite(cvA_) ? `${format(cvA_)} %` : "—";
  $("#ampP").textContent = format(amp);
  $("#nP").textContent = String(n);
  $("#minmaxP").textContent = `${format(min)} / ${format(max)}`;

  tabela.style.display = "";
  setMsg(`OK! ${n} valores analisados.`, "ok");

  return { dados, n, m };
}

// ========= Eventos (botões) =========
// calcular
$("#btnCalcular").addEventListener("click", calcular);

// exemplo
$("#btnExemplo").addEventListener("click", () => {
  entrada.value = "7, 8, 5, 9, 10, 10, 6, 6, 8, 9, 7, 7, 5, 6, 10";
  calcular();
});

// limpar
$("#btnLimpar").addEventListener("click", () => {
  entrada.value = "";
  setMsg("", "ok");
  tabela.style.display = "none";

  // NOVO: esconde e limpa a caixinha ordenada
  document.getElementById("ordenadoBox").style.display = "none";
  document.getElementById("ordenado").value = "";

  // limpa gráficos
  for (const k of Object.keys(charts)) {
    if (charts[k]) {
      charts[k].destroy();
      charts[k] = null;
    }
  }
});

// gera histograma
$("#gHist").addEventListener("click", () => {
  const res = calcular();
  if (!res) return;
  const h = histogramaDados(res.dados);
  resetChart(
    "hist",
    document.getElementById("histCanvas"),
    cfgBarras(h.labels, h.values, "Histograma (Sturges)")
  );
});

// gera barras
$("#gBarras").addEventListener("click", () => {
  const res = calcular();
  if (!res) return;
  const { labels, values } = frequenciaSimples(res.dados);
  resetChart(
    "barras",
    document.getElementById("barrasCanvas"),
    cfgBarras(labels, values, "Frequência dos valores")
  );
});

// gera dispersão
$("#gDisp").addEventListener("click", () => {
  const res = calcular();
  if (!res) return;
  const pontos = res.dados.map((y, i) => ({ x: i + 1, y }));
  resetChart(
    "disp",
    document.getElementById("dispCanvas"),
    cfgDisp(pontos, "Dispersão (índice vs valor)")
  );
});

// gera pizza
$("#gPizza").addEventListener("click", () => {
  const res = calcular();
  if (!res) return;
  const { labels, values } = frequenciaSimples(res.dados);
  resetChart(
    "pizza",
    document.getElementById("pizzaCanvas"),
    cfgPizza(labels, values, "Distribuição (pizza)")
  );
});

// download PNG (todos os gráficos)
document.querySelectorAll("button[data-dl]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const key = btn.getAttribute("data-dl");
    const map = {
      hist: ["histCanvas", "histograma"],
      barras: ["barrasCanvas", "barras"],
      disp: ["dispCanvas", "dispersao"],
      pizza: ["pizzaCanvas", "pizza"],
    };
    const [id, nome] = map[key];
    baixarPNG(id, nome);
  });
});
