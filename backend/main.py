import os
import json
from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
import pypdf
import google.generativeai as genai

# --- Gemini API Configuration ---
# WARNING: Hardcoding API keys is a security risk. Use .env for production.
GEMINI_API_KEY = "AIzaSyAbiFFFtavuyld3MeX6VVEm_uU3Zt7ImrM" # Your new API key is here.

# CORRECTED CHECK: This now correctly checks for an empty key or the original placeholder.
if not GEMINI_API_KEY or GEMINI_API_KEY == "AIzaSyAbiFFFtavuyld3MeX6VVEm_uU3Zt7ImrM":
    raise ValueError("Gemini API key is missing. Please get a new key from Google AI Studio and add it to the code.")

# Configure the generative AI model
genai.configure(api_key=GEMINI_API_KEY)

# --- MODEL NAME UPDATE ---
# The model 'gemini-pro' is outdated. We are updating it to a newer, recommended version.
model = genai.GenerativeModel('gemini-1.5-flash-latest')

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

# --- Main API Endpoint ---
@app.post("/analyze-statement/")
async def analyze_statement(
    file: UploadFile = File(...),
    password: str = Form("")
):
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload a PDF.")

    try:
        # --- 1. Read and Decrypt the PDF ---
        pdf_reader = pypdf.PdfReader(file.file)
        
        if pdf_reader.is_encrypted:
            if not pdf_reader.decrypt(password):
                raise HTTPException(status_code=400, detail="Invalid password for the PDF.")
        
        # --- 2. Extract Text from PDF ---
        raw_text = ""
        for page in pdf_reader.pages:
            raw_text += page.extract_text() or ""

        if not raw_text.strip():
            raise HTTPException(status_code=400, detail="Could not extract text from the PDF.")

        # --- 3. Define the Prompt for the AI ---
        prompt = f"""
        You are an expert financial analyst AI. Your task is to analyze the text from a bank statement and convert it into a structured list of transactions in JSON format.

        Analyze the following bank statement text:
        ---
        {raw_text}
        ---

        Instructions:
        1.  Identify every single transaction.
        2.  For each transaction, extract the following details:
            - "date": The date of the transaction (e.g., "YYYY-MM-DD").
            - "description": A clean, short description of the transaction.
            - "amount": The transaction amount as a number. Represent debits (money spent) as negative numbers and credits (money received) as positive numbers.
            - "category": Categorize the transaction into one of the following: "Income", "Groceries", "Utilities", "Rent/Mortgage", "Dining Out", "Shopping", "Transport", "Entertainment", "Health", "Investment", "Transfer", "Subscription", or "Other".
        3.  Return the output as a single valid JSON array, where each object in the array is a transaction. Do not include any text, explanation, or markdown formatting before or after the JSON array.

        Example of the required JSON output format:
        [
          {{
            "date": "2023-10-15",
            "description": "Salary Deposit",
            "amount": 50000.00,
            "category": "Income"
          }}
        ]
        """

        # --- 4. Call the Gemini API ---
        response = model.generate_content(prompt)
        
        # Clean up the response from the AI
        cleaned_response_text = response.text.strip().replace("```json", "").replace("```", "").strip()

        # --- 5. Parse the AI's response and return it ---
        transactions = json.loads(cleaned_response_text)
        return transactions

    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")

# Health check endpoint
@app.get("/")
def read_root():
    return {"status": "Backend is running"}

