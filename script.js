const us10yInput = document.getElementById("us10yInput");
const us2yInput = document.getElementById("us2yInput");
const inflationInput = document.getElementById("inflationInput");
const de10yInput = document.getElementById("de10yInput");
const uk10yInput = document.getElementById("uk10yInput");
const jp10yInput = document.getElementById("jp10yInput");
const liquidityStressInput = document.getElementById("liquidityStressInput");
const creditStressInput = document.getElementById("creditStressInput");
const safeHavenInput = document.getElementById("safeHavenInput");
const labelInput = document.getElementById("labelInput");

const updateBtn = document.getElementById("updateBtn");
const resetBtn = document.getElementById("resetBtn");

const warningLevelEl = document.getElementById("warningLevel");
const warningTextEl = document.getElementById("warningText");
const warningScoreValueEl = document.getElementById("warningScoreValue");
const us10yValueEl = document.getElementById("us10yValue");
const spreadValueEl = document.getElementById("spreadValue");
const realYieldValueEl = document.getElementById("realYieldValue");

const curveScoreValueEl = document.getElementById("curveScoreValue");
const realYieldScoreValueEl = document.getElementById("realYieldScoreValue");
const crossMarketScoreValueEl = document.getElementById("crossMarketScoreValue");
const liquidityScoreValueEl = document.getElementById("liquidityScoreValue");
const creditScoreValueEl = document.getElementById("creditScoreValue");
const safeHavenScoreValueEl = document.getElementById("safeHavenScoreValue");
const interpretationTextEl = document.getElementById("interpretationText");
const scenarioTableBodyEl = document.getElementById("scenarioTableBody");

let warningCompositionChart = null;
let sovereignYieldChart = null;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function formatPercent(value) {
  return `${value.toFixed(2)}%`;
}

function formatSpread(value) {
  return `${value.toFixed(2)} pp`;
}

function getInputs() {
  return {
    us10y: Number(us10yInput.value) || 0,
    us2y: Number(us2yInput.value) || 0,
    inflation: Number(inflationInput.value) || 0,
    de10y: Number(de10yInput.value) || 0,
    uk10y: Number(uk10yInput.value) || 0,
    jp10y: Number(jp10yInput.value) || 0,
    liquidityStress: clamp(Number(liquidityStressInput.value) || 0, 0, 100),
    creditStress: clamp(Number(creditStressInput.value) || 0, 0, 100),
    safeHaven: clamp(Number(safeHavenInput.value) || 0, 0, 100),
    label: labelInput.value.trim()
  };
}

function calculateSignals(data) {
  const spread10y2y = data.us10y - data.us2y;
  const realYield = data.us10y - data.inflation;

  const crossMarketDispersion =
    (Math.abs(data.us10y - data.de10y) +
      Math.abs(data.us10y - data.uk10y) +
      Math.abs(data.us10y - data.jp10y)) / 3;

  const curveScore = clamp(
    spread10y2y >= 1.0 ? 5 :
    spread10y2y >= 0.5 ? 18 :
    spread10y2y >= 0.0 ? 32 :
    spread10y2y >= -0.5 ? 52 : 70,
    0, 100
  );

  const realYieldScore = clamp(
    realYield < 0 ? 8 :
    realYield < 1 ? 18 :
    realYield < 2 ? 32 :
    realYield < 3 ? 48 : 62,
    0, 100
  );

  const crossMarketScore = clamp(crossMarketDispersion * 10, 0, 100);
  const liquidityScore = data.liquidityStress;
  const creditScore = data.creditStress;
  const safeHavenScore = clamp(data.safeHaven * 0.6, 0, 100);

  // Safe-haven demand partially offsets stress, because strong demand can cushion the market.
  const totalScore = clamp(
    (curveScore * 0.22) +
    (realYieldScore * 0.22) +
    (crossMarketScore * 0.16) +
    (liquidityScore * 0.18) +
    (creditScore * 0.16) -
    (safeHavenScore * 0.10),
    0, 100
  );

  return {
    spread10y2y,
    realYield,
    curveScore,
    realYieldScore,
    crossMarketScore,
    liquidityScore,
    creditScore,
    safeHavenScore,
    totalScore
  };
}

function classifyWarning(score) {
  if (score < 30) {
    return {
      label: "STABLE",
      className: "warning-stable",
      text: "Current bond market conditions appear stable with no immediate systemic warning signal."
    };
  }
  if (score < 50) {
    return {
      label: "WATCH",
      className: "warning-watch",
      text: "Conditions are stable but elevated real yields and cross-market pressure require monitoring."
    };
  }
  if (score < 70) {
    return {
      label: "ELEVATED",
      className: "warning-elevated",
      text: "Multiple bond market stress channels are flashing caution. Conditions should be monitored closely."
    };
  }
  if (score < 85) {
    return {
      label: "HIGH RISK",
      className: "warning-highrisk",
      text: "The signal mix points to meaningful deterioration in bond market conditions and rising macro fragility."
    };
  }
  return {
    label: "CRITICAL",
    className: "warning-critical",
    text: "The system indicates a critical warning regime with broad-based stress across bond market channels."
  };
}

function getSignalClass(value) {
  if (value < 20) return "signal-positive";
  if (value < 40) return "signal-neutral";
  if (value < 60) return "signal-caution";
  return "signal-danger";
}

function buildInterpretation(data, signals, warning) {
  const labelPart = data.label ? ` for ${data.label}` : "";

  if (warning.label === "CRITICAL") {
    return `The Early Warning System${labelPart} is flashing a critical regime. Curve pressure, liquidity stress and broader fixed-income fragility are simultaneously elevated, suggesting the bond market is no longer just restrictive but potentially unstable.`;
  }

  if (warning.label === "HIGH RISK") {
    return `The Early Warning System${labelPart} indicates high risk. Stress is no longer isolated to one area of the bond market and is spreading across curve structure, liquidity and macro-sensitive pricing channels.`;
  }

  if (warning.label === "ELEVATED") {
    return `The Early Warning System${labelPart} has moved into an elevated warning regime. Real yields remain restrictive and other stress-sensitive indicators are adding pressure, even though conditions are not yet disorderly.`;
  }

  if (warning.label === "WATCH") {
    return `The Early Warning System${labelPart} remains in watch mode. The curve is still positive, but elevated real yields and moderate stress inputs suggest the bond market should be monitored closely for deterioration.`;
  }

  return `The Early Warning System${labelPart} indicates a stable bond market environment. Stress-sensitive indicators remain relatively contained and the current signal mix does not point to acute fixed-income deterioration.`;
}

function updateUi(data, signals, warning) {
  warningLevelEl.textContent = warning.label;
  warningLevelEl.className = `warning-value ${warning.className}`;
  warningTextEl.textContent = warning.text;

  warningScoreValueEl.textContent = Math.round(signals.totalScore);
  us10yValueEl.textContent = formatPercent(data.us10y);
  spreadValueEl.textContent = formatSpread(signals.spread10y2y);
  realYieldValueEl.textContent = formatPercent(signals.realYield);

  curveScoreValueEl.textContent = Math.round(signals.curveScore);
  curveScoreValueEl.className = `signal-value ${getSignalClass(signals.curveScore)}`;

  realYieldScoreValueEl.textContent = Math.round(signals.realYieldScore);
  realYieldScoreValueEl.className = `signal-value ${getSignalClass(signals.realYieldScore)}`;

  crossMarketScoreValueEl.textContent = Math.round(signals.crossMarketScore);
  crossMarketScoreValueEl.className = `signal-value ${getSignalClass(signals.crossMarketScore)}`;

  liquidityScoreValueEl.textContent = Math.round(signals.liquidityScore);
  liquidityScoreValueEl.className = `signal-value ${getSignalClass(signals.liquidityScore)}`;

  creditScoreValueEl.textContent = Math.round(signals.creditScore);
  creditScoreValueEl.className = `signal-value ${getSignalClass(signals.creditScore)}`;

  safeHavenScoreValueEl.textContent = Math.round(signals.safeHavenScore);
  safeHavenScoreValueEl.className = `signal-value ${getSignalClass(100 - signals.safeHavenScore)}`;

  interpretationTextEl.textContent = buildInterpretation(data, signals, warning);
}

function buildWarningCompositionChart(signals) {
  const ctx = document.getElementById("warningCompositionChart").getContext("2d");

  if (warningCompositionChart) {
    warningCompositionChart.destroy();
  }

  warningCompositionChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: [
        "Curve Pressure",
        "Real Yield Pressure",
        "Cross-Market Stress",
        "Liquidity Stress",
        "Credit Stress",
        "Safe-Haven Offset"
      ],
      datasets: [
        {
          data: [
            signals.curveScore,
            signals.realYieldScore,
            signals.crossMarketScore,
            signals.liquidityScore,
            signals.creditScore,
            signals.safeHavenScore
          ],
          borderWidth: 0
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "68%",
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: "#9db0c8"
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `${context.label}: ${context.parsed.toFixed(0)}`;
            }
          }
        }
      }
    }
  });
}

function buildSovereignYieldChart(data) {
  const ctx = document.getElementById("sovereignYieldChart").getContext("2d");

  if (sovereignYieldChart) {
    sovereignYieldChart.destroy();
  }

  sovereignYieldChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["US", "Germany", "UK", "Japan"],
      datasets: [
        {
          label: "10Y Sovereign Yield",
          data: [data.us10y, data.de10y, data.uk10y, data.jp10y],
          borderWidth: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `Yield: ${context.parsed.y.toFixed(2)}%`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: "#9db0c8" }
        },
        y: {
          ticks: {
            color: "#9db0c8",
            callback: function(value) {
              return `${value.toFixed(1)}%`;
            }
          },
          grid: {
            color: "rgba(157,176,200,0.15)"
          }
        }
      }
    }
  });
}

function buildScenarioTable(data) {
  const scenarios = [
    {
      name: "Base Case",
      us10y: data.us10y,
      us2y: data.us2y,
      inflation: data.inflation,
      liquidity: data.liquidityStress
    },
    {
      name: "Higher Real Yield",
      us10y: data.us10y + 0.50,
      us2y: data.us2y + 0.20,
      inflation: data.inflation,
      liquidity: data.liquidityStress + 5
    },
    {
      name: "Curve Deterioration",
      us10y: data.us10y,
      us2y: data.us2y + 0.60,
      inflation: data.inflation,
      liquidity: data.liquidityStress + 8
    },
    {
      name: "Liquidity Shock",
      us10y: data.us10y - 0.20,
      us2y: data.us2y + 0.25,
      inflation: data.inflation,
      liquidity: data.liquidityStress + 25
    },
    {
      name: "Soft Landing",
      us10y: data.us10y - 0.40,
      us2y: data.us2y - 0.65,
      inflation: Math.max(data.inflation - 0.40, 0),
      liquidity: Math.max(data.liquidityStress - 15, 0)
    }
  ];

  scenarioTableBodyEl.innerHTML = "";

  scenarios.forEach((scenario) => {
    const localSignals = calculateSignals({
      ...data,
      us10y: scenario.us10y,
      us2y: scenario.us2y,
      inflation: scenario.inflation,
      liquidityStress: clamp(scenario.liquidity, 0, 100)
    });
    const warning = classifyWarning(localSignals.totalScore);

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${scenario.name}</td>
      <td>${localSignals.realYield.toFixed(2)}%</td>
      <td>${localSignals.spread10y2y.toFixed(2)} pp</td>
      <td>${Math.round(clamp(scenario.liquidity, 0, 100))}</td>
      <td>${warning.label}</td>
    `;
    scenarioTableBodyEl.appendChild(row);
  });
}

function updateSystem() {
  const data = getInputs();
  const signals = calculateSignals(data);
  const warning = classifyWarning(signals.totalScore);

  updateUi(data, signals, warning);
  buildWarningCompositionChart(signals);
  buildSovereignYieldChart(data);
  buildScenarioTable(data);
}

function resetSystem() {
  us10yInput.value = "4.20";
  us2yInput.value = "3.70";
  inflationInput.value = "2.40";
  de10yInput.value = "2.94";
  uk10yInput.value = "4.68";
  jp10yInput.value = "2.22";
  liquidityStressInput.value = "42";
  creditStressInput.value = "36";
  safeHavenInput.value = "48";
  labelInput.value = "";

  updateSystem();
}

[
  us10yInput,
  us2yInput,
  inflationInput,
  de10yInput,
  uk10yInput,
  jp10yInput,
  liquidityStressInput,
  creditStressInput,
  safeHavenInput,
  labelInput
].forEach((input) => {
  input.addEventListener("input", updateSystem);
});

updateBtn.addEventListener("click", updateSystem);
resetBtn.addEventListener("click", resetSystem);

document.addEventListener("DOMContentLoaded", updateSystem);
