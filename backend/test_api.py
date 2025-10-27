import requests
import json
import os
from dotenv import load_dotenv

# This will load the GEMINI_API_KEY from your .env file
load_dotenv()
API_KEY = os.getenv("GEMINI_API_KEY")

# This is the model we are testing
MODEL_NAME = "gemini-pro"

# This is the correct, modern v1 REST API endpoint.
# Notice it does NOT contain "v1beta".
url = f"https://generativelanguage.googleapis.com/v1/models/{MODEL_NAME}:generateContent?key={API_KEY}"

headers = {
    "Content-Type": "application/json"
}

# This is a simple sample prompt
data = {
    "contents": [
        {
            "parts": [
                {
                    "text": "Explain how a car engine works in one simple sentence."
                }
            ]
        }
    ]
}

print("--- Starting Direct API Test ---")
print(f"Attempting to contact: {url}")
print("-" * 30)

try:
    # We will make the API call directly using the 'requests' library
    response = requests.post(url, headers=headers, data=json.dumps(data))

    # This line will cause an error if the status code is 4xx or 5xx
    response.raise_for_status()

    print("✅ SUCCESS! The API call worked correctly.")
    print("Response from Google:")
    print(response.json())

except requests.exceptions.HTTPError as err:
    print(f"❌ FAILURE! An HTTP Error occurred: {err}")
    print("--- Error Response From Server ---")
    # We print the raw text to see the exact error message
    print(err.response.text)
except Exception as e:
    print(f"❌ FAILURE! A different error occurred: {e}")