/* =========================================
   Utilidades básicas
   ========================================= */

// atalho para querySelector
const $ = (sel) => document.querySelector(sel);

// formata número (padrão: 2 casas)
function format(n, casas = 2) {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
}

/* =========================================
   Estatística — dados brutos
   ========================================= */

// mostra mensagem na área dos brutos
function setMsg(text, tipo = "ok") {
  const el = $("#msg");
  if (!el) return;
  el.textContent = text;
  el.className = tipo === "ok" ? "ok small" : "error small";
}

// transforma texto em números (aceita vírgula, espaço e ;)
function parseDados(texto) {
  if (!texto) return [];
  return texto
    .split(/[,\s;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => Number(s.replace(",", ".")))
    .filter((v) => Number.isFinite(v));
}

// medidas básicas
function media(dados) {
  const soma = dados.reduce((acc, x) => acc + x, 0);
  return soma / dados.length;
}
function mediana(dados) {
  const arr = [...dados].sort((a, b) => a - b);
  const n = arr.length;
  const m = Math.floor(n / 2);
  return n % 2 === 0 ? (arr[m - 1] + arr[m]) / 2 : arr[m];
}
function moda(dados) {
  const freq = new Map();
  for (const x of dados) freq.set(x, (freq.get(x) || 0) + 1);
  let max = 0;
  for (const v of freq.values()) if (v > max) max = v;
  if (max === 1) return [];
  return [...freq.entries()]
    .filter(([, f]) => f === max)
    .map(([k]) => k)
    .sort((a, b) => a - b);
}
function varianciaPop(dados) {
  const m = media(dados);
  const ssd = dados.reduce((acc, x) => acc + (x - m) ** 2, 0);
  return ssd / dados.length;
}
function varianciaAmostra(dados) {
  if (dados.length < 2) return NaN;
  const m = media(dados);
  const ssd = dados.reduce((acc, x) => acc + (x - m) ** 2, 0);
  return ssd / (dados.length - 1);
}
const dpPop = (dados) => Math.sqrt(varianciaPop(dados));
const dpAmost = (dados) => Math.sqrt(varianciaAmostra(dados));
function amplitude(dados) {
  return Math.max(...dados) - Math.min(...dados);
}
function coefVar(dp, m) {
  if (m === 0) return NaN;
  return (dp / m) * 100;
}

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

// histograma (Sturges)
function binsSturges(n) {
  return Math.max(1, Math.ceil(1 + 3.322 * Math.log10(n)));
}
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
    if (idx >= k) idx = k - 1;
    if (idx < 0) idx = 0;
    freq[idx]++;
  }
  const labels = limites.map(([a, b]) => `${a.toFixed(2)} – ${b.toFixed(2)}`);
  return { labels, values: freq };
}

/* =========================================
   Gráficos (configuração compartilhada)
   ========================================= */

let charts = {
  hist: null,
  barras: null,
  disp: null,
  pizza: null,
  histAgr: null,
  poligono: null,
  ogiva: null,
};

// cria/destrói gráfico corretamente
function resetChart(key, ctx, cfg) {
  if (charts[key]) {
    charts[key].destroy();
    charts[key] = null;
  }
  charts[key] = new Chart(ctx, cfg);
}

// presets de gráfico
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
function cfgLinha(labels, data, titulo) {
  return {
    type: "line",
    data: { labels, datasets: [{ label: "Frequência", data, tension: 0.1 }] },
    options: {
      responsive: true,
      plugins: { title: { display: true, text: titulo } },
      scales: { y: { beginAtZero: true } },
    },
  };
}

// baixa a imagem de um canvas
function baixarPNG(canvasId, nome) {
  const canvas = document.getElementById(canvasId);
  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = `${nome}.png`;
  link.click();
}

/* =========================================
   Tela — dados brutos (UI e eventos)
   ========================================= */

const entrada = $("#entrada");
const tabela = $("#tabela");

// calcula tudo e preenche a tabela (brutos)
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

  // mostra dados ordenados (caixa dos brutos)
  const ordenados = [...dados].sort((a, b) => a - b);
  $("#ordenado").value = ordenados.join(", ");
  $("#ordenadoBox").style.display = "";

  // escreve tabela
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

// troca de abas (brutos/agrupados)
function ativarAba(nome) {
  const brutos = $("#tabBrutos");
  const agrup = $("#tabAgrupados");
  const bBtn = $("#tabBrutosBtn");
  const aBtn = $("#tabAgrupadosBtn");

  if (nome === "agrupados") {
    agrup.style.display = "";
    brutos.style.display = "none";
    aBtn.classList.add("primary");
    bBtn.classList.remove("primary");
  } else {
    brutos.style.display = "";
    agrup.style.display = "none";
    bBtn.classList.add("primary");
    aBtn.classList.remove("primary");
  }
}
$("#tabBrutosBtn").addEventListener("click", () => ativarAba("brutos"));
$("#tabAgrupadosBtn").addEventListener("click", () => ativarAba("agrupados"));
ativarAba("brutos");

// botões dos brutos
$("#btnCalcular").addEventListener("click", calcular);
$("#btnExemplo").addEventListener("click", () => {
  entrada.value = "7, 8, 5, 9, 10, 10, 6, 6, 8, 9, 7, 7, 5, 6, 10";
  calcular();
});
$("#btnLimpar").addEventListener("click", () => {
  entrada.value = "";
  setMsg("", "ok");
  tabela.style.display = "none";
  $("#ordenadoBox").style.display = "none";
  $("#ordenado").value = "";
  for (const k of Object.keys(charts)) {
    if (charts[k]) {
      charts[k].destroy();
      charts[k] = null;
    }
  }
});

// gráficos (brutos)
$("#gHist").addEventListener("click", () => {
  const res = calcular();
  if (!res) return;
  const h = histogramaDados(res.dados);
  resetChart(
    "hist",
    $("#histCanvas"),
    cfgBarras(h.labels, h.values, "Histograma (Sturges)")
  );
});
$("#gBarras").addEventListener("click", () => {
  const res = calcular();
  if (!res) return;
  const { labels, values } = frequenciaSimples(res.dados);
  resetChart(
    "barras",
    $("#barrasCanvas"),
    cfgBarras(labels, values, "Frequência dos valores")
  );
});
$("#gDisp").addEventListener("click", () => {
  const res = calcular();
  if (!res) return;
  const pontos = res.dados.map((y, i) => ({ x: i + 1, y }));
  resetChart(
    "disp",
    $("#dispCanvas"),
    cfgDisp(pontos, "Dispersão (índice vs valor)")
  );
});
$("#gPizza").addEventListener("click", () => {
  const res = calcular();
  if (!res) return;
  const { labels, values } = frequenciaSimples(res.dados);
  resetChart(
    "pizza",
    $("#pizzaCanvas"),
    cfgPizza(labels, values, "Distribuição (pizza)")
  );
});

// download dos PNGs (todos)
document.querySelectorAll("button[data-dl]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const key = btn.getAttribute("data-dl");
    const map = {
      hist: ["histCanvas", "histograma"],
      barras: ["barrasCanvas", "barras"],
      disp: ["dispCanvas", "dispersao"],
      pizza: ["pizzaCanvas", "pizza"],
      histAgr: ["histAgrCanvas", "histograma-classes"],
      poligono: ["poligonoCanvas", "poligono-frequencias"],
      ogiva: ["ogivaCanvas", "ogiva"],
    };
    const item = map[key];
    if (!item) return;
    const [id, nome] = item;
    baixarPNG(id, nome);
  });
});

/* =========================================
   Estatística — dados agrupados (classes)
   ========================================= */

// cria uma linha de classe (Li, Ls, fi)
function addClasseRow(li = "", ls = "", fi = "") {
  const tbody = $("#classesBody");
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td class="muted small">Classe</td>
    <td><input type="number" step="any" class="li" placeholder="Li" value="${li}"></td>
    <td><input type="number" step="any" class="ls" placeholder="Ls" value="${ls}"></td>
    <td><input type="number" step="1" min="0" class="fi" placeholder="fi" value="${fi}"></td>
    <td><button class="ghost btnDelLinha">Remover</button></td>
  `;
  tbody.appendChild(tr);
  tr.querySelector(".btnDelLinha").addEventListener("click", () => tr.remove());
}

// lê as classes preenchidas
function lerClasses() {
  const linhas = Array.from($("#classesBody").querySelectorAll("tr"));
  const classes = [];
  for (const tr of linhas) {
    const li = parseFloat(tr.querySelector(".li").value);
    const ls = parseFloat(tr.querySelector(".ls").value);
    const fi = parseInt(tr.querySelector(".fi").value, 10);
    if (!Number.isFinite(li) || !Number.isFinite(ls) || !Number.isFinite(fi)) {
      alert("Preencha Li, Ls e fi com números válidos.");
      return null;
    }
    if (ls <= li) {
      alert("Cada classe deve ter Ls > Li.");
      return null;
    }
    if (fi < 0) {
      alert("A frequência (fi) não pode ser negativa.");
      return null;
    }
    classes.push({ li, ls, fi });
  }
  if (!classes.length) {
    alert("Adicione pelo menos uma classe.");
    return null;
  }
  // ordena e valida sobreposição
  classes.sort((a, b) => a.li - b.li);
  for (let i = 1; i < classes.length; i++) {
    if (classes[i].li < classes[i - 1].ls) {
      alert(
        "As classes não podem se sobrepor (use intervalos contíguos ou separados)."
      );
      return null;
    }
  }
  return classes;
}

// desenha/reseta o bloco de resumo das estatísticas dos agrupados
function renderResumoAgr(stats) {
  const box = $("#agrResumo");
  if (!box) return;

  box.innerHTML = `
    <b style="display:block;margin-bottom:.5rem">Estatísticas (cálculos com base no ponto médio das classes)</b>
    <table>
      <thead>
        <tr><th>Métrica</th><th>Populacional</th><th>Amostral</th></tr>
      </thead>
      <tbody>
        <tr><td>Média (x̄)</td><td>${format(
          stats.media
        )}</td><td class="muted">—</td></tr>
        <tr><td>Mediana</td><td>${format(
          stats.mediana
        )}</td><td class="muted">—</td></tr>
        <tr><td>Moda</td><td>${
          stats.moda.length ? stats.moda.map((x) => format(x)).join(", ") : "—"
        }</td><td class="muted">—</td></tr>
        <tr><td>Variância</td><td>${format(stats.varPop)}</td><td>${format(
    stats.varAmo
  )}</td></tr>
        <tr><td>Desvio padrão</td><td>${format(stats.dpPop)}</td><td>${format(
    stats.dpAmo
  )}</td></tr>
        <tr><td>Coeficiente de variação</td>
            <td>${
              Number.isFinite(stats.cvPop) ? format(stats.cvPop) + " %" : "—"
            }</td>
            <td>${
              Number.isFinite(stats.cvAmo) ? format(stats.cvAmo) + " %" : "—"
            }</td></tr>
<tr><td>Amplitude total (Ls<sub> máx</sub> – Li<sub> mín</sub>)</td><td>${format(
    stats.amplitudeTotal
  )}</td><td class="muted">—</td></tr>
<tr><td>Amplitude (pontos médios)</td><td>${format(
    stats.amplitudeXi
  )}</td><td class="muted">—</td></tr>
        <tr><td>n</td><td>${stats.N}</td><td class="muted">—</td></tr>
        <tr><td>Mín / Máx</td><td>${format(stats.minLi)} / ${format(
    stats.maxLs
  )}</td><td class="muted">—</td></tr>
      </tbody>
    </table>
  `;
  box.style.display = "";
}

// estado do último cálculo (para gráficos)
let ultimoAgrupado = null;

// calcula distribuição + estatísticas usando xi e fi
function calcularAgrupado() {
  const classes = lerClasses();
  if (!classes) return;

  const N = classes.reduce((acc, c) => acc + c.fi, 0);
  if (N <= 0) {
    alert("A soma das frequências (N) deve ser > 0.");
    return;
  }

  // monta distribuição (xi, fi, fr, Fi)
  const dist = [];
  let acum = 0;
  for (const c of classes) {
    const h = c.ls - c.li;
    const xi = (c.li + c.ls) / 2;
    acum += c.fi;
    dist.push({
      classeTxt: `${format(c.li, 2)} – ${format(c.ls, 2)}`,
      li: c.li,
      ls: c.ls,
      h,
      xi,
      fi: c.fi,
      fr: c.fi / N,
      Fi: acum,
    });
  }

  // cabeçalho da tabela
  const distTable = $("#distTable");
  let theadTr = distTable.querySelector("thead tr");
  if (!theadTr) {
    const thead = distTable.querySelector("thead") || distTable.createTHead();
    theadTr = document.createElement("tr");
    thead.appendChild(theadTr);
  }
  theadTr.innerHTML = `
  <th>xi (ponto médio)</th>
  <th>Classe</th>
  <th>fi</th>
  <th>fi / N</th>
  <th>Fi (acum.)</th>
`;

  // corpo da tabela
  const tbody = $("#distBody");
  tbody.innerHTML = "";
  for (const d of dist) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${format(d.xi, 2)}</td>
      <td>${d.classeTxt}</td>
      <td>${d.fi}</td>
      <td>${format(d.fr * 100, 2)}%</td>
      <td>${d.Fi}</td>
    `;
    tbody.appendChild(tr);
  }
  $("#distTable").style.display = "";

  // estatísticas (usando xi com peso fi)
  const sumFiXi = dist.reduce((acc, d) => acc + d.fi * d.xi, 0);
  const mediaG = sumFiXi / N;

  // mediana aprox.: xi da classe que contém (N+1)/2
  const alvo = (N + 1) / 2;
  let medianaG = dist[0].xi;
  for (const d of dist) {
    if (d.Fi >= alvo) {
      medianaG = d.xi;
      break;
    }
  }

  // moda aprox.: xi da(s) classe(s) com maior fi
  let maxFi = 0;
  for (const d of dist) if (d.fi > maxFi) maxFi = d.fi;
  const modaG = dist.filter((d) => d.fi === maxFi).map((d) => d.xi);

  // variâncias e derivados
  const ssd = dist.reduce((acc, d) => acc + d.fi * (d.xi - mediaG) ** 2, 0);
  const varPop = ssd / N;
  const varAmo = N > 1 ? ssd / (N - 1) : NaN;
  const dpPop = Math.sqrt(varPop);
  const dpAmo = Math.sqrt(varAmo);
  const cvPop = (dpPop / mediaG) * 100;
  const cvAmo = (dpAmo / mediaG) * 100;

  // amplitudes e limites globais
  const minLi = Math.min(...classes.map((c) => c.li));
  const maxLs = Math.max(...classes.map((c) => c.ls));
  const ampTotal = maxLs - minLi;
  const ampXi = dist[dist.length - 1].xi - dist[0].xi;

  // renderiza bloco-resumo
  renderResumoAgr({
    media: mediaG,
    mediana: medianaG,
    moda: modaG,
    varPop,
    varAmo,
    dpPop,
    dpAmo,
    cvPop,
    cvAmo,
    amplitudeTotal: ampTotal,
    amplitudeXi: ampXi,
    N,
    minLi,
    maxLs,
  });

  // guarda para gráficos
  ultimoAgrupado = {
    dist,
    N,
    labelsClasse: dist.map((d) => d.classeTxt),
    labelsXi: dist.map((d) => format(d.xi, 2)),
    fi: dist.map((d) => d.fi),
    Fi: dist.map((d) => d.Fi),
  };
}

/* =========================================
   Tela — agrupados (UI e eventos)
   ========================================= */

$("#addClasse").addEventListener("click", () => addClasseRow());
$("#btnCalcAgr").addEventListener("click", calcularAgrupado);
$("#btnLimparAgr").addEventListener("click", () => {
  $("#classesBody").innerHTML = "";
  $("#distBody").innerHTML = "";
  $("#distTable").style.display = "none";

  const resumo = $("#agrResumo");
  if (resumo) {
    resumo.replaceChildren(); // limpa mais direto
    resumo.style.display = "none";
  }

  ultimoAgrupado = null;

  for (const key of ["histAgr", "poligono", "ogiva"]) {
    if (charts[key]) {
      charts[key].destroy();
      charts[key] = null;
    }
  }
});

// preencher exemplo (agrupados)
const btnExemploAgr = $("#btnExemploAgr");
if (btnExemploAgr) {
  btnExemploAgr.addEventListener("click", () => {
    $("#classesBody").innerHTML = "";
    // exemplo simples: três classes
    addClasseRow(1, 2, 10);
    addClasseRow(3, 4, 20);
    addClasseRow(5, 6, 30);
  });
}

// cria uma linha inicial vazia
addClasseRow();

// gráficos (agrupados)
$("#gHistAgr").addEventListener("click", () => {
  if (!ultimoAgrupado) return alert("Calcule os agrupados primeiro.");
  resetChart(
    "histAgr",
    $("#histAgrCanvas"),
    cfgBarras(
      ultimoAgrupado.labelsClasse,
      ultimoAgrupado.fi,
      "Histograma (classes)"
    )
  );
});
$("#gPoligono").addEventListener("click", () => {
  if (!ultimoAgrupado) return alert("Calcule os agrupados primeiro.");
  resetChart(
    "poligono",
    $("#poligonoCanvas"),
    cfgLinha(
      ultimoAgrupado.labelsXi,
      ultimoAgrupado.fi,
      "Polígono de frequências (xi vs fi)"
    )
  );
});
$("#gOgiva").addEventListener("click", () => {
  if (!ultimoAgrupado) return alert("Calcule os agrupados primeiro.");
  resetChart(
    "ogiva",
    $("#ogivaCanvas"),
    cfgLinha(
      ultimoAgrupado.labelsClasse,
      ultimoAgrupado.Fi,
      "Ogiva (acumulada)"
    )
  );
});
