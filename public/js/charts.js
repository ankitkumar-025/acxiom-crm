/**
 * Chart.js Visualizations for AcxiomCRM Analytics
 * Enforces PDF Section 17.12 Dashboard Charts
 */

function initDashboardCharts(chartData) {
  if (!chartData || typeof Chart === 'undefined') return;

  // Chart defaults for dark theme
  Chart.defaults.color = '#94a3b8';
  Chart.defaults.font.family = "'Plus Jakarta Sans', system-ui, sans-serif";

  // 1. Lead Status Breakdown (Doughnut Chart)
  const leadCanvas = document.getElementById('leadStatusChart');
  if (leadCanvas && chartData.leadStatus) {
    new Chart(leadCanvas, {
      type: 'doughnut',
      data: {
        labels: chartData.leadStatus.labels,
        datasets: [{
          data: chartData.leadStatus.data,
          backgroundColor: [
            '#3b82f6', // New - blue
            '#f59e0b', // Contacted - amber
            '#10b981', // Qualified - emerald
            '#94a3b8', // Unqualified - slate
            '#8b5cf6', // Converted - violet
            '#ef4444'  // Lost - rose
          ],
          borderWidth: 2,
          borderColor: '#111827'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { boxWidth: 12, padding: 15, font: { size: 11 } }
          }
        },
        cutout: '65%'
      }
    });
  }

  // 2. Opportunity Pipeline Stages (Horizontal Bar Chart)
  const oppCanvas = document.getElementById('pipelineStageChart');
  if (oppCanvas && chartData.pipelineStages) {
    new Chart(oppCanvas, {
      type: 'bar',
      data: {
        labels: chartData.pipelineStages.labels,
        datasets: [{
          label: 'Opportunity Count',
          data: chartData.pipelineStages.counts,
          backgroundColor: '#6366f1',
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' }
          },
          y: {
            grid: { display: false },
            ticks: { stepSize: 1 }
          }
        }
      }
    });
  }

  // 3. Monthly Sales Performance (Line Chart)
  const salesCanvas = document.getElementById('monthlySalesChart');
  if (salesCanvas && chartData.monthlySales) {
    new Chart(salesCanvas, {
      type: 'line',
      data: {
        labels: chartData.monthlySales.labels,
        datasets: [
          {
            label: 'Won Revenue ($)',
            data: chartData.monthlySales.won,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            fill: true,
            tension: 0.3,
            borderWidth: 3,
            pointBackgroundColor: '#10b981'
          },
          {
            label: 'Open Pipeline ($)',
            data: chartData.monthlySales.open,
            borderColor: '#6366f1',
            backgroundColor: 'transparent',
            borderDash: [5, 5],
            tension: 0.3,
            borderWidth: 2,
            pointBackgroundColor: '#6366f1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { boxWidth: 12, padding: 12 }
          }
        },
        scales: {
          x: { grid: { color: 'rgba(255, 255, 255, 0.05)' } },
          y: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: {
              callback: (value) => '$' + (value >= 1000 ? (value / 1000) + 'k' : value)
            }
          }
        }
      }
    });
  }
}
