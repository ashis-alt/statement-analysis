import { useState } from 'react';
import axios from 'axios';
import DashboardMetrics from './components/DashboardMetrics'; // Ensure this path is correct
import CategoryPieChart from './components/CategoryPieChart'; // Ensure this path is correct

function App() {
  const [file, setFile] = useState(null);
  const [password, setPassword] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    // Reset state when a new file is selected
    setFile(e.target.files[0]);
    setTransactions([]);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevent default form submission behavior
    if (!file) {
      setError('Please select a file first.');
      return; // Stop execution if no file is selected
    }

    // Reset state for the new submission
    setLoading(true);
    setError(null);
    setTransactions([]);

    // Prepare form data for API request
    const formData = new FormData();
    formData.append('file', file);
    formData.append('password', password);

    try {
      // Make the API call to the backend
      const response = await axios.post('http://127.0.0.1:8000/analyze-statement/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data', // Important for file uploads
        },
        timeout: 90000, // 90-second timeout for potentially long analysis
      });

      console.log('API Response:', response.data); // Log the raw response for debugging

      // --- Data Validation and Filtering ---
      // 1. Check if the response data is an array
      // 2. Filter out any invalid items (null, undefined, non-objects)
      // 3. Filter out "Opening Balance"
      // 4. Ensure required fields (date, description, amount, category) exist and amount is a number
      const validTransactions = Array.isArray(response.data)
           ? response.data.filter(tx =>
               tx &&                          // Ensure tx object exists and is not null/undefined
               typeof tx === 'object' &&      // Ensure tx is an object
               tx.description !== 'Opening Balance' && // Explicitly filter out opening balance
               typeof tx.amount === 'number' && // Ensure amount is a number
               !isNaN(tx.amount) &&           // Ensure amount is not NaN
               tx.date &&                     // Ensure date exists and is truthy
               tx.description &&              // Ensure description exists and is truthy
               tx.category                    // Ensure category exists and is truthy
             )
           : []; // If response.data is not an array, default to empty

      // --- Update State Based on Validation ---
      if (validTransactions.length > 0) {
        setTransactions(validTransactions); // Set the filtered transactions to state
        setError(null);                   // Clear any previous error message
      } else {
        // If no valid transactions are found after filtering
        setTransactions([]);               // Ensure transactions state remains empty
        setError('Analysis complete, but no valid transactions were extracted from this file.');
      }
      // --- End Data Validation ---

    } catch (err) {
      // --- Comprehensive Error Handling ---
      let errorMessage = 'An unknown error occurred.';
      if (axios.isCancel(err)) {
        errorMessage = 'Request cancelled.'; // Handle cancellation specifically if needed
      } else if (err.code === 'ECONNABORTED') {
        errorMessage = 'The request timed out (90s). The file might be too large or the AI analysis is taking too long.';
      } else if (err.response) {
        // Error response received from the backend (4xx or 5xx)
        console.error('Backend Error Response:', err.response);
        errorMessage = `Error: ${err.response.data?.detail || `Server responded with status ${err.response.status}`}`;
      } else if (err.request) {
        // Request was made but no response received (e.g., backend down)
        console.error('Network Error:', err.request);
        errorMessage = 'Could not connect to the backend server. Please ensure it is running.';
      } else {
        // Other errors (e.g., setup issues in the request)
        console.error('Request Setup Error:', err.message);
        errorMessage = `An error occurred during the request setup: ${err.message}`;
      }
      setError(errorMessage);
      setTransactions([]); // Clear transactions state on any error
    } finally {
      // This block runs regardless of success or error
      setLoading(false); // Stop the loading indicator
    }
  };

  // --- JSX for rendering the UI ---
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center p-4 sm:p-8 font-sans">
      <div className="w-full max-w-6xl mx-auto px-4"> {/* Added horizontal padding */}
        <header className="text-center mb-10">
          <h1 className="text-4xl sm:text-5xl font-bold text-cyan-400 tracking-tight">Fin-Insight AI</h1>
          <p className="text-gray-400 mt-3 text-lg">
             Upload your bank statement (PDF or Excel) to get an AI-powered analysis.
          </p>
        </header>

        {/* --- Form --- */}
        <div className="w-full max-w-xl mx-auto bg-gray-800 p-6 rounded-lg shadow-lg mb-10">
          <form onSubmit={handleSubmit}>
            <div className="mb-5">
              <label htmlFor="file-upload" className="block text-sm font-medium text-gray-300 mb-2">
                Statement File (PDF or Excel)
              </label>
              <input
                id="file-upload"
                type="file"
                accept=".pdf,.xls,.xlsx" // Accept specific file types
                onChange={handleFileChange}
                required // HTML5 form validation
                className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-cyan-500 file:text-white hover:file:bg-cyan-600 cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-cyan-500" // Added focus styles
              />
            </div>
            <div className="mb-6">
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                PDF Password (if needed)
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password only if PDF is protected"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-cyan-500 placeholder-gray-500" // Added focus styles
              />
            </div>
            <button
              type="submit"
              disabled={loading || !file} // More robust disabled condition
              className="w-full flex justify-center items-center bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-4 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 text-base focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-cyan-500" // Added focus styles and flex for spinner alignment
            >
              {loading ? (
                <> {/* Use fragment for grouping */}
                  <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24" fill="currentColor">
                     <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" opacity=".1"/><path d="M12 4c4.41 0 8 3.59 8 8s-3.59 8-8 8-8-3.59-8-8 3.59-8 8-8m0-2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/><path d="M12 4v4l3.17 1.83C16.99 8.84 18 6.58 18 4h-6z" transform="rotate(0 12 12)"> <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/></path>
                  </svg>
                  <span>Analyzing...</span>
                </>
              ) : 'Analyze Statement'}
            </button>
          </form>
        </div>

        {/* --- Error Display --- */}
        {/* Only show error if an error exists, not loading, and no transactions */}
        {error && !loading && transactions.length === 0 && (
          <div className="w-full max-w-3xl mx-auto bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded-lg relative mb-8 text-center" role="alert">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline ml-2">{error}</span>
          </div>
        )}

        {/* --- Loading Indicator --- */}
        {loading && (
           <div className="text-center text-cyan-400 text-lg mb-8 flex justify-center items-center">
              <svg className="animate-spin h-6 w-6 mr-3" viewBox="0 0 24 24" fill="currentColor"> {/* Larger spinner */}
                 <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" opacity=".1"/><path d="M12 4c4.41 0 8 3.59 8 8s-3.59 8-8 8-8-3.59-8-8 3.59-8 8-8m0-2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/><path d="M12 4v4l3.17 1.83C16.99 8.84 18 6.58 18 4h-6z" transform="rotate(0 12 12)"> <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/></path>
              </svg>
              Processing your document, please wait... (up to 90 seconds)
           </div>
        )}
        
        {/* --- THE DASHBOARD --- */}
        {/* Render dashboard only if NOT loading AND transactions exist */}
        {!loading && transactions.length > 0 && (
          <div className="space-y-8"> {/* Spacing between dashboard sections */}
            
            {/* 1. Metrics */}
            <DashboardMetrics transactions={transactions} />

            {/* 2. Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <CategoryPieChart transactions={transactions} />
              {/* Placeholder for future charts */}
               <div className="bg-gray-800 p-6 rounded-lg shadow-lg flex items-center justify-center min-h-[400px]"> {/* Ensure consistent height */}
                 <p className="text-gray-500 text-center">Future Chart Area<br/>(e.g., Spending Trend Line Chart)</p>
               </div>
            </div>

            {/* 3. Transaction Table */}
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg overflow-hidden">
              <h2 className="text-2xl font-bold mb-6 text-cyan-400">Transaction Details</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-700">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Description</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Category</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="bg-gray-800 divide-y divide-gray-700">
                    {transactions.map((tx, index) => (
                      // Row is only rendered if tx object is valid (checked during state update)
                         <tr key={index} className="hover:bg-gray-700 transition-colors duration-150">
                           <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{tx.date}</td>
                           <td className="px-6 py-4 text-sm text-gray-300 max-w-xs truncate" title={tx.description}>{tx.description}</td> {/* Truncate long descriptions */}
                           <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{tx.category}</td>
                           <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${tx.amount < 0 ? 'text-red-400' : 'text-green-400'}`}>
                             {/* Format as Indian Rupees */}
                             {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(tx.amount)}
                           </td>
                         </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

