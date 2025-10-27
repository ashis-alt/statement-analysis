import os
import json
import io
import pandas as pd
from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
import pdfplumber
# REMOVE the incorrect import: from pdfplumber.pdf import PasswordError
from dotenv import load_dotenv
import requests

# Load environment variables from your .env file
load_dotenv()

# --- FastAPI App Initialization ---
app = FastAPI()

# Configure CORS (Cross-Origin Resource Sharing)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Main API Endpoint (Final Version with Fixes) ---
@app.post("/analyze-statement/")
async def analyze_statement(
    file: UploadFile = File(...),
    password: str = Form("")
):
    # --- 1. File Type Routing ---
    pdf_bytes = await file.read()
    raw_text = "" # Initialize raw_text before use

    if file.content_type == "application/pdf":
        print("Processing PDF file...")
        try:
            with io.BytesIO(pdf_bytes) as pdf_file_like:
                pw = password if password.strip() else None
                # Use a generic try/except here; pdfplumber raises standard errors for wrong password
                with pdfplumber.open(pdf_file_like, password=pw) as pdf:
                    for page in pdf.pages:
                        tables = page.extract_tables()
                        if not tables: # Skip pages with no tables
                            continue
                        for table in tables:
                            if not table: # Skip empty tables
                                continue
                            for row in table:
                                # Convert row to clean, non-null, tab-separated string
                                clean_row = [str(cell) if cell is not None else '' for cell in row]
                                raw_text += "\t".join(clean_row) + "\n" # Now raw_text is guaranteed to exist
        # Catch generic Exception and check message for password error
        except Exception as e:
            # Check specifically for pdfplumber's known password error type if available (might vary by version)
            # A more general check remains:
            if "password" in str(e).lower(): # Check if the error message mentions password
                 raise HTTPException(status_code=400, detail=f"Invalid password for the PDF. Original error: {str(e)}")
            else:
                 raise HTTPException(status_code=500, detail=f"PDF processing error: {str(e)}")

    elif file.content_type in ["application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]:
        print("Processing Excel file...")
        try:
            with io.BytesIO(pdf_bytes) as excel_file_like:
                xls = pd.ExcelFile(excel_file_like)
                for sheet_name in xls.sheet_names:
                    df = pd.read_excel(xls, sheet_name=sheet_name, header=None)
                    if df.empty: # Skip empty sheets
                        continue
                    for row in df.itertuples(index=False, name=None):
                        clean_row = [str(cell) if pd.notna(cell) else '' for cell in row]
                        raw_text += "\t".join(clean_row) + "\n"
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Excel processing error: {str(e)}")
    
    else:
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload a PDF or Excel file.")

    if not raw_text.strip():
        raise HTTPException(status_code=400, detail="Could not extract any table data from the file. It might be empty or in an unsupported format.")

    # --- 2. Define the Prompt for the AI (Final, Strictest Version + Explicit Ignore) ---
    prompt = f"""
    You are an expert financial analyst AI. Your task is to analyze the text from a bank statement and convert it into a structured list of transactions in JSON format.
    
    Analyze the following bank statement text, which has been extracted *directly from tables*. 
    Columns are separated by TABS.
    ---
    {raw_text}
    ---

    Instructions:
    1.  Analyze the table data line by line.
    2.  **DILIGENTLY FIND ALL TRANSACTIONS.** Do not stop after finding just one.
    3.  **CRITICAL:** Ignore any rows that are headers (e.g., contain "Date", "Description", "Debit", "Credit", "Balance").
    4.  **CRITICAL:** Ignore any rows that contain the exact text "Opening Balance" in the description column. **DO NOT include Opening Balance in the final JSON output.**
    5.  **CRITICAL:** Only process rows that have a clear numerical value in the "Debit" or "Credit" columns.
    6.  Find the columns for "Date", "Description", "Debit", and "Credit". Assume standard table formats.
    7.  For each row that represents a real transaction (NOT header, NOT Opening Balance, HAS Debit/Credit value), extract the following details:
        - "date": The date of the transaction (e.g., "YYYY-MM-DD" or "DD-MM-YYYY"). Convert dates like '15-10-2025' to '2025-10-15'.
        - "description": A clean, short description of the transaction. Keep relevant details like UPI IDs or merchant names.
        - "amount": The transaction amount as a number. 
            - If the amount is in the "Debit" column, it is a negative number (e.g., -30.00). Clean the value (remove commas, symbols like '-').
            - If the amount is in the "Credit" column, it is a positive number (e.g., 2.00). Clean the value.
            - Ensure the final amount is a valid number. If cleaning fails, skip the transaction.
        - "category": Categorize the transaction into one of the following: "Income", "Groceries", "Utilities", "Rent/Mortgage", "Dining Out", "Shopping", "Transport", "Entertainment", "Health", "Investment", "Transfer", "Subscription", or "Other". Use "Transfer" for UPI payments unless the description clearly indicates another category.
    8.  Return the output as a single valid JSON array containing ONLY the extracted transaction objects. Do not include any text, explanation, or markdown formatting before or after the JSON array. If no valid transactions are found, return an empty array `[]`.
    """

    # --- 3. Call the Hugging Face API (Same as before) ---
    hf_api_key = os.getenv("HF_API_KEY")
    if not hf_api_key:
        raise HTTPException(status_code=500, detail="HF_API_KEY not found in .env file")

    api_url = "https://router.huggingface.co/v1/chat/completions"
    model_id = "meta-llama/Llama-3.1-8B-Instruct" 

    try:
        print("Sending prompt to AI...") # Debugging line
        response = requests.post(
            api_url,
            headers={
                "Authorization": f"Bearer {hf_api_key}", 
                "Content-Type": "application/json",
            },
            json={
                "model": model_id,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.1,
                "response_format": {"type": "json_object"}, 
            },
            timeout=90 # Increased timeout slightly
        )
        response.raise_for_status()
        print("Received response from AI.") # Debugging line

        # --- 4. Parse the AI's response and return it ---
        api_result = response.json()
        
        # Add extra check for potentially malformed AI response
        if 'choices' not in api_result or not api_result['choices'] or 'message' not in api_result['choices'][0] or 'content' not in api_result['choices'][0]['message']:
             print("Error: Invalid response structure from AI:", api_result) # Debugging line
             raise HTTPException(status_code=500, detail="Invalid response structure from AI.")

        json_string = api_result['choices'][0]['message']['content']
        print("AI JSON String:", json_string) # Debugging line
        
        try:
            transactions = json.loads(json_string)
            # Ensure transactions is always a list
            if not isinstance(transactions, list):
                 # Sometimes the AI might wrap the list in an outer object, try to extract
                 if isinstance(transactions, dict) and "transactions" in transactions and isinstance(transactions["transactions"], list):
                     transactions = transactions["transactions"]
                 else:
                     raise ValueError("AI did not return a list of transactions.")
                 
        except (json.JSONDecodeError, ValueError) as json_err:
            print(f"Error: AI returned invalid JSON or unexpected format: {json_err}") # Debugging line
            print("Original AI string:", json_string) # Debugging line
            raise HTTPException(status_code=500, detail=f"AI returned invalid JSON: {json_string[:200]}...") # Show beginning of string
            
        print(f"Successfully parsed {len(transactions)} transactions.") # Debugging line
        return transactions

    except requests.exceptions.Timeout:
        raise HTTPException(status_code=504, detail="AI API request timed out (90s).")
    except requests.exceptions.HTTPError as http_err:
        error_detail = f"AI API Error: {http_err.response.status_code} - {http_err.response.text}"
        raise HTTPException(status_code=500, detail=error_detail)
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        # Log the unexpected error for debugging
        print(f"Unexpected error during API call or parsing: {type(e).__name__} - {e}")
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")


# Health check endpoint
@app.get("/")
def read_root():
    return {"status": "Backend is running"}

