import React from 'react';

// This component takes the transaction list as a "prop"
function DashboardMetrics({ transactions }) {
  // Use .reduce() to perform calculations
  const totalIncome = transactions
    .filter(tx => tx.amount > 0)
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalExpenses = transactions
    .filter(tx => tx.amount < 0)
    .reduce((sum, tx) => sum + tx.amount, 0);

  const netSavings = totalIncome + totalExpenses;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
      <div className="bg-gray-800 p-4 rounded-lg text-center shadow-lg">
        <h3 className="text-gray-400 text-sm font-medium">Total Income</h3>
        <p className="text-2xl font-bold text-green-400">₹{totalIncome.toFixed(2)}</p>
      </div>
      <div className="bg-gray-800 p-4 rounded-lg text-center shadow-lg">
        <h3 className="text-gray-400 text-sm font-medium">Total Expenses</h3>
        <p className="text-2xl font-bold text-red-400">₹{Math.abs(totalExpenses).toFixed(2)}</p>
      </div>
      <div className="bg-gray-800 p-4 rounded-lg text-center shadow-lg">
        <h3 className="text-gray-400 text-sm font-medium">Net Savings</h3>
        <p className={`text-2xl font-bold ${netSavings >= 0 ? 'text-cyan-400' : 'text-orange-400'}`}>
          ₹{netSavings.toFixed(2)}
        </p>
      </div>
    </div>
  );
}

export default DashboardMetrics;

