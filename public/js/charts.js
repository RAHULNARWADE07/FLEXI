/**
 * Chart.js Real-time Telemetry Visualizer
 */

let telemetryChartInstance = null;

function initTelemetryChart() {
  const ctx = document.getElementById('telemetryChart');
  if (!ctx) return;

  const chartCtx = ctx.getContext('2d');

  // Gradient fills
  const cyanGradient = chartCtx.createLinearGradient(0, 0, 0, 200);
  cyanGradient.addColorStop(0, 'rgba(0, 245, 212, 0.25)');
  cyanGradient.addColorStop(1, 'rgba(0, 245, 212, 0.0)');

  const blueGradient = chartCtx.createLinearGradient(0, 0, 0, 200);
  blueGradient.addColorStop(0, 'rgba(58, 134, 255, 0.25)');
  blueGradient.addColorStop(1, 'rgba(58, 134, 255, 0.0)');

  telemetryChartInstance = new Chart(chartCtx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Sector 4 Flow (L/min)',
          data: [],
          borderColor: '#00f5d4',
          backgroundColor: cyanGradient,
          borderWidth: 2.2,
          tension: 0.35,
          fill: true,
          pointRadius: 2,
          pointHoverRadius: 5,
          yAxisID: 'yFlow'
        },
        {
          label: 'Grid Pressure (PSI)',
          data: [],
          borderColor: '#3a86ff',
          backgroundColor: blueGradient,
          borderWidth: 2.0,
          borderDash: [4, 4],
          tension: 0.35,
          fill: false,
          pointRadius: 2,
          pointHoverRadius: 5,
          yAxisID: 'yPressure'
        },
        {
          label: 'Reservoir Level (%)',
          data: [],
          borderColor: '#10b981',
          borderWidth: 1.8,
          tension: 0.2,
          fill: false,
          pointRadius: 0,
          yAxisID: 'yPercent'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 300
      },
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: 'rgba(14, 23, 42, 0.9)',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          titleFont: { family: 'Plus Jakarta Sans', size: 12 },
          bodyFont: { family: 'JetBrains Mono', size: 11 },
          padding: 10
        }
      },
      scales: {
        x: {
          grid: {
            color: 'rgba(255, 255, 255, 0.04)'
          },
          ticks: {
            color: '#64748b',
            font: { family: 'JetBrains Mono', size: 10 },
            maxTicksLimit: 8
          }
        },
        yFlow: {
          type: 'linear',
          position: 'left',
          min: 0,
          max: 120,
          grid: {
            color: 'rgba(255, 255, 255, 0.05)'
          },
          ticks: {
            color: '#00f5d4',
            font: { family: 'JetBrains Mono', size: 10 }
          },
          title: {
            display: true,
            text: 'Flow (L/min)',
            color: '#00f5d4',
            font: { size: 10 }
          }
        },
        yPressure: {
          type: 'linear',
          position: 'right',
          min: 0,
          max: 80,
          grid: {
            drawOnChartArea: false
          },
          ticks: {
            color: '#3a86ff',
            font: { family: 'JetBrains Mono', size: 10 }
          },
          title: {
            display: true,
            text: 'PSI',
            color: '#3a86ff',
            font: { size: 10 }
          }
        },
        yPercent: {
          type: 'linear',
          display: false,
          min: 0,
          max: 100
        }
      }
    }
  });
}

function updateTelemetryChart(history) {
  if (!telemetryChartInstance || !Array.isArray(history)) return;

  const labels = history.map(item => item.time);
  const flowData = history.map(item => item.resFlow);
  const pressureData = history.map(item => item.pressure);
  const reservoirData = history.map(item => item.reservoirPct);

  telemetryChartInstance.data.labels = labels;
  telemetryChartInstance.data.datasets[0].data = flowData;
  telemetryChartInstance.data.datasets[1].data = pressureData;
  telemetryChartInstance.data.datasets[2].data = reservoirData;

  telemetryChartInstance.update('none'); // Silent fast update
}

window.initTelemetryChart = initTelemetryChart;
window.updateTelemetryChart = updateTelemetryChart;
