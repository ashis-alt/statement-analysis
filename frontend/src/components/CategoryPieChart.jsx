import React from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

function CategoryPieChart({ transactions }) {
  // Process data to sum spending by category
  const spendingByCategory = transactions
    .filter(tx => tx.amount < 0 && tx.description !== 'Opening Balance') // Only expenses, ignore opening balance
    .reduce((acc, tx) => {
      const category = tx.category || 'Other';
      acc[category] = (acc[category] || 0) + Math.abs(tx.amount);
      return acc;
    }, {});

  // Prepare data for Chart.js
  const labels = Object.keys(spendingByCategory);
  const dataValues = Object.values(spendingByCategory);

  const data = {
    labels: labels,
    datasets: [
      {
        data: dataValues,
        backgroundColor: [
            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
            '#FF9F40', '#E7E9ED', '#8BC34A', '#F44336', '#2196F3',
            '#FFEB3B', '#00BCD4' // Add more colors if needed
           ],
        borderColor: '#1F2937', // bg-gray-900
        borderWidth: 2,
      },
    ],
  };

  const options = {
    plugins: {
      legend: {
        position: 'right',
        labels: {
          color: 'white', // Legend text color
          boxWidth: 20,
          padding: 15,
          font: {
             size: 10 // Smaller font for legend
          }
        },
      },
      tooltip: {
        callbacks: {
            label: function(context) {
                let label = context.label || '';
                if (label) {
                    label += ': ';
                }
                if (context.parsed !== null) {
                    // Format as Indian Rupees
                    label += new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(context.parsed);
                }
                return label;
            }
        }
      }
    },
    maintainAspectRatio: false, // Important for controlling size with CSS
  };

  // Only render the chart if there is data to display
  if (labels.length === 0) {
    return (
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg flex items-center justify-center" style={{ height: '400px' }}>
        <p className="text-gray-400">No spending data to display chart.</p>
      </div>
    );
  }

  return (
    // Set a fixed height for the container, chart will adapt
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg relative" style={{ height: '400px' }}>
      <h2 className="text-xl font-bold mb-4 text-cyan-400">Spending by Category</h2>
       {/* Use a wrapper div for the chart itself */}
       <div style={{ position: 'relative', height: 'calc(100% - 40px)', width: '100%' }}> {/* Adjust height to account for title */}
            <Pie data={data} options={options} />
       </div>
    </div>
  );
}

export default CategoryPieChart;

