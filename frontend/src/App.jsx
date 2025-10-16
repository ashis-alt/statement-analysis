import { useState } from 'react';

// Main application component
function App() {
  // --- STATE MANAGEMENT ---
  // Holds the selected PDF file
  const [file, setFile] = useState(null);
  // Holds the password for the PDF
  const [password, setPassword] = useState('');
  // Stores the transaction data received from the backend
  const [transactions, setTransactions] = useState([]);
  // Stores any error messages to display to the user
  const [error, setError] = useState('');
  // Tracks the loading state to show feedback during API calls
  const [loading, setLoading] = useState(false);

  // --- EVENT HANDLERS ---
  // Triggered when a user selects a file from their computer
  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
    // Reset previous results and errors when a new file is chosen
    setTransactions([]);
    setError('');
  };

  // Triggered when the user submits the form
  const handleSubmit = async (event) => {
    event.preventDefault(); // Prevents the browser from reloading the page
    if (!file) {
      setError('Please select a PDF file first.');
      return;
    }

    // Set loading state and clear previous data
    setLoading(true);
    setError('');
    setTransactions([]);

    // FormData is used to package the file and password for sending to the backend
    const formData = new FormData();
    formData.append('file', file);
    formData.append('password', password);

    try {
      // --- API CALL ---
      // Sending the form data to our Python backend
      const response = await fetch('http://127.0.0.1:8000/analyze-statement/', {
        method: 'POST',
        body: formData,
      });

      // If the server responds with an error, handle it
      if (!response.ok) {
        const errData = await response.json();
        // Use the specific error from the backend (e.g., "Invalid password")
        throw new Error(errData.detail || 'An unknown error occurred during analysis.');
      }

      // If successful, parse the JSON data and update the state
      const data = await response.json();
      setTransactions(data);

    } catch (err) {
      // Catch any network errors or errors thrown from the response check
      setError(err.message);
    } finally {
      // This runs regardless of success or failure, ensuring the loading spinner stops
      setLoading(false);
    }
  };

  // --- HELPER FUNCTIONS ---
  // A small utility to format currency and apply color
  const formatAmount = (amount) => {
    const isNegative = amount < 0;
    const colorClass = isNegative ? 'text-red-500' : 'text-green-600';
    // Using Indian Rupee symbol (₹) and a proper minus sign for negative values
    const formattedAmount = `${isNegative ? '−' : '+'} ₹${Math.abs(amount).toFixed(2)}`;
    return <span className={colorClass}>{formattedAmount}</span>;
  };

  // --- JSX RENDER ---
  // This is the HTML structure of the component that gets displayed on the screen
  return (
    <div className="bg-gray-900 min-h-screen text-white p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        
        {/* Header Section */}
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-cyan-400">Fin-Analyzer AI</h1>
          <p className="text-gray-400 mt-2">Upload your password-protected bank statement for an AI-powered breakdown.</p>
        </header>

        {/* File Upload Form Section */}
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-8">
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              {/* File Input Field */}
              <div className="md:col-span-1">
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf"
                  className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-cyan-500 file:text-white hover:file:bg-cyan-600 cursor-pointer w-full"
                />
              </div>
              
              {/* Password Input Field */}
              <div className="md:col-span-1">
                 <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="PDF Password (if any)"
                  className="bg-gray-700 text-white rounded-full w-full py-2 px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Submit Button */}
              <div className="md:col-span-1">
                <button
                  type="submit"
                  disabled={!file || loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-bold py-2 px-6 rounded-full transition-colors duration-300"
                >
                  {loading ? 'Analyzing...' : 'Analyze Statement'}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Conditional Rendering for UI Feedback (Errors and Loading Spinner) */}
        {error && <div className="bg-red-900 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-center mb-8">{error}</div>}
        {loading && <div className="text-center text-gray-400">Processing your document with AI, please wait...</div>}

        {/* Results Table - This is only shown if there are transactions to display */}
        {transactions.length > 0 && (
          <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
            <h2 className="text-2xl font-semibold p-4 border-b border-gray-700">Transaction Analysis</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="p-3">Date</th>
                    <th className="p-3">Description</th>
                    <th className="p-3">Category</th>
                    <th className="p-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t, index) => (
                    <tr key={index} className="border-b border-gray-700 last:border-b-0 hover:bg-gray-700/50">
                      <td className="p-3 whitespace-nowrap">{t.date}</td>
                      <td className="p-3">{t.description}</td>
                      <td className="p-3">
                        <span className="bg-cyan-800/50 text-cyan-300 text-xs font-medium px-2.5 py-1 rounded-full">{t.category}</span>
                      </td>
                      <td className="p-3 text-right font-mono whitespace-nowrap">{formatAmount(t.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default App;

