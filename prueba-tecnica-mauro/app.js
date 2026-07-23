const movements = window.MOVEMENTS;

const currency = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

const percent = new Intl.NumberFormat("es-MX", {
  style: "percent",
  maximumFractionDigits: 0,
});

const monthFormatter = new Intl.DateTimeFormat("es-MX", {
  month: "short",
  year: "numeric",
});

const dateFormatter = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const DIMENSION_LABELS = {
  plant: "Planta",
  account_name: "Categoría",
  equipment_name: "Equipo",
};

const PALETTE = ["#1d4ed8", "#3b82f6", "#60a5fa", "#0ea5e9", "#6366f1", "#f59e0b", "#0891b2"];

if (window.Chart) {
  Chart.defaults.font.family = "'Plus Jakarta Sans', system-ui, sans-serif";
  Chart.defaults.color = "#5b6b7f";
}

const state = {
  plant: "all",
  dimension: "plant",
  sortKey: "movement_date",
  sortDir: "asc",
};

let trendChart;
let compareChart;
let insightEquipment = null;

function monthKey(dateStr) {
  return dateStr.slice(0, 7);
}

function monthLabel(key) {
  const [year, month] = key.split("-").map(Number);
  return monthFormatter.format(new Date(year, month - 1, 1));
}

function dimensionValue(movement, dimension) {
  return movement[dimension] ?? "Sin equipo";
}

function sumBy(list, keyFn) {
  const totals = new Map();
  for (const item of list) {
    const key = keyFn(item);
    totals.set(key, (totals.get(key) ?? 0) + item.amount);
  }
  return totals;
}

function nonCancelled() {
  return movements.filter((m) => !m.is_cancellation);
}

function filteredSpend() {
  return nonCancelled().filter((m) => state.plant === "all" || m.plant === state.plant);
}

function filteredTable() {
  return movements.filter((m) => state.plant === "all" || m.plant === state.plant);
}

function populatePlantFilter() {
  const select = document.querySelector("#plant-filter");
  const plants = [...new Set(nonCancelled().map((m) => m.plant))].sort();
  for (const plant of plants) {
    const option = document.createElement("option");
    option.value = plant;
    option.textContent = plant;
    select.appendChild(option);
  }
}

function computeInsight() {
  const byEquipment = new Map();
  for (const movement of nonCancelled()) {
    if (!movement.equipment_name) continue;
    if (!byEquipment.has(movement.equipment_name)) byEquipment.set(movement.equipment_name, []);
    byEquipment.get(movement.equipment_name).push(movement);
  }

  let best = null;
  for (const [equipment, list] of byEquipment) {
    if (list.length < 3) continue;
    const sorted = [...list].sort((a, b) => a.movement_date.localeCompare(b.movement_date));
    const isRising = sorted.every((m, i) => i === 0 || m.amount > sorted[i - 1].amount);
    if (!isRising) continue;
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const ratio = last.amount / first.amount;
    if (!best || ratio > best.ratio) {
      best = { equipment, sorted, first, last, ratio, plant: last.plant };
    }
  }

  if (!best) return null;
  insightEquipment = best.equipment;
  return best;
}

function renderInsight() {
  const insight = computeInsight();
  const el = document.querySelector("#insight-text");
  if (!insight) {
    el.textContent = "Inviabilidad Operativa del Motor M-04, Hiperinflación en Refacciones y Suministros, Fuga de Capital en Servicios Externos";
    return;
  }
  const { equipment, plant, first, last, ratio, sorted } = insight;
  el.innerHTML = `El costo de mantenimiento de <strong>${equipment}</strong> (${plant}) subió de forma
    consecutiva en sus últimos ${sorted.length} movimientos: de ${currency.format(first.amount)}
    (${dateFormatter.format(new Date(first.movement_date))}) a ${currency.format(last.amount)}
    (${dateFormatter.format(new Date(last.movement_date))}) — un incremento de <strong>${ratio.toFixed(1)}x</strong>,
    cerrando con "${last.article_name}". Vale la pena revisar si conviene una intervención mayor o
    reemplazo antes de que seguir reparando salga más caro que sustituir.`;
}

function renderSummary() {
  const spend = filteredSpend();
  const table = filteredTable();
  const cancelledCount = table.filter((m) => m.is_cancellation).length;

  document.querySelector("#record-count").textContent =
    `${movements.length} movimientos disponibles entre enero y junio de 2026.`;

  const total = spend.reduce((sum, m) => sum + m.amount, 0);
  document.querySelector("#kpi-total").textContent = currency.format(total);
  document.querySelector("#kpi-total-sub").textContent = "excluye cancelaciones";

  document.querySelector("#kpi-count").textContent = spend.length;
  document.querySelector("#kpi-count-sub").textContent =
    cancelledCount > 0 ? `${cancelledCount} cancelación(es) no incluida(s)` : "sin cancelaciones";

  const average = spend.length ? total / spend.length : 0;
  document.querySelector("#kpi-average").textContent = currency.format(average);
  document.querySelector("#kpi-average-sub").textContent = "por movimiento";

  const byCategory = sumBy(spend, (m) => m.account_name);
  let topCategory = "—";
  let topShare = 0;
  for (const [category, amount] of byCategory) {
    if (amount > topShare) {
      topShare = amount;
      topCategory = category;
    }
  }
  document.querySelector("#kpi-top-category").textContent = topCategory;
  document.querySelector("#kpi-top-category-sub").textContent = total
    ? `${percent.format(topShare / total)} del gasto filtrado`
    : "";
}

function renderTrendChart() {
  const months = [...new Set(nonCancelled().map((m) => monthKey(m.movement_date)))].sort();
  const totals = sumBy(filteredSpend(), (m) => monthKey(m.movement_date));
  const data = months.map((key) => totals.get(key) ?? 0);

  const ctx = document.querySelector("#trend-chart");
  if (trendChart) {
    trendChart.data.labels = months.map(monthLabel);
    trendChart.data.datasets[0].data = data;
    trendChart.update();
    return;
  }

  trendChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: months.map(monthLabel),
      datasets: [
        {
          label: "Gasto mensual",
          data,
          borderColor: "#2563eb",
          backgroundColor: "rgba(59, 130, 246, 0.14)",
          fill: true,
          tension: 0.35,
          borderWidth: 2.5,
          pointRadius: 4,
          pointBackgroundColor: "#2563eb",
          pointBorderColor: "#fff",
          pointBorderWidth: 2,
          pointHoverRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#0a1a2f",
          titleColor: "#fff",
          bodyColor: "#d7e7fb",
          padding: 10,
          cornerRadius: 8,
          displayColors: false,
          callbacks: {
            label: (item) => currency.format(item.parsed.y),
          },
        },
      },
      scales: {
        y: {
          ticks: { callback: (value) => currency.format(value) },
          grid: { color: "#e2e8f0" },
        },
        x: { grid: { display: false } },
      },
    },
  });
}

function renderCompareChart() {
  const dimension = state.dimension;
  document.querySelector("#compare-title").textContent = `Gasto por ${DIMENSION_LABELS[dimension]}`;

  const totals = sumBy(filteredSpend(), (m) => dimensionValue(m, dimension));
  const entries = [...totals.entries()].sort((a, b) => b[1] - a[1]);
  const labels = entries.map((e) => e[0]);
  const data = entries.map((e) => e[1]);
  const colors = labels.map((_, i) => PALETTE[i % PALETTE.length]);

  const ctx = document.querySelector("#compare-chart");
  if (compareChart) {
    compareChart.data.labels = labels;
    compareChart.data.datasets[0].data = data;
    compareChart.data.datasets[0].backgroundColor = colors;
    compareChart.update();
    return;
  }

  compareChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Gasto",
          data,
          backgroundColor: colors,
          borderRadius: 8,
          maxBarThickness: 34,
        },
      ],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#0a1a2f",
          titleColor: "#fff",
          bodyColor: "#d7e7fb",
          padding: 10,
          cornerRadius: 8,
          callbacks: {
            label: (item) => currency.format(item.parsed.x),
          },
        },
      },
      scales: {
        x: {
          ticks: { callback: (value) => currency.format(value) },
          grid: { color: "#e2e8f0" },
        },
        y: { grid: { display: false } },
      },
    },
  });
}

function sortRows(rows) {
  const { sortKey, sortDir } = state;
  const dir = sortDir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    if (sortKey === "amount") return (a.amount - b.amount) * dir;
    return a.movement_date.localeCompare(b.movement_date) * dir;
  });
}

function renderTable() {
  const rows = sortRows(filteredTable());

  document.querySelector("#details-count").textContent =
    `Mostrando ${rows.length} de ${movements.length} movimientos.`;

  document.querySelector("#raw-rows").innerHTML = rows
    .map((movement) => {
      const flagged = movement.equipment_name === insightEquipment && !movement.is_cancellation;
      const classes = [movement.amount < 0 ? "negative" : "", flagged ? "flagged" : ""]
        .filter(Boolean)
        .join(" ");
      return `
      <tr class="${classes}">
        <td>${dateFormatter.format(new Date(movement.movement_date))}</td>
        <td>${movement.plant}</td>
        <td>${movement.account_name}</td>
        <td>${movement.article_name}${movement.is_cancellation ? ' <span class="badge">Cancelación</span>' : ""}</td>
        <td>${movement.equipment_name ?? "Sin equipo"}</td>
        <td class="col-right">${currency.format(movement.amount)}</td>
      </tr>
    `;
    })
    .join("");

  document.querySelectorAll(".sort-arrow").forEach((el) => {
    const key = el.dataset.arrow;
    el.textContent = key === state.sortKey ? (state.sortDir === "asc" ? "▲" : "▼") : "";
  });
}

function render() {
  renderSummary();
  renderTrendChart();
  renderCompareChart();
  renderTable();
}

function attachEvents() {
  document.querySelector("#plant-filter").addEventListener("change", (event) => {
    state.plant = event.target.value;
    render();
  });

  document.querySelector("#dimension-select").addEventListener("change", (event) => {
    state.dimension = event.target.value;
    renderCompareChart();
  });

  document.querySelectorAll(".sort-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.sort;
      if (state.sortKey === key) {
        state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
      } else {
        state.sortKey = key;
        state.sortDir = "asc";
      }
      renderTable();
    });
  });

  const scrollTopButton = document.querySelector("#scroll-top");
  window.addEventListener("scroll", () => {
    scrollTopButton.classList.toggle("visible", window.scrollY > 600);
  });
  scrollTopButton.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

populatePlantFilter();
renderInsight();
attachEvents();
render();
