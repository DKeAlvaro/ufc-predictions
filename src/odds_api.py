import json
import requests
from dotenv import load_dotenv
import os
load_dotenv()

API_KEY = os.getenv('ODDS_API_KEY')

# URL for the-odds-api
URL = f"https://api.the-odds-api.com/v4/sports/mma_mixed_martial_arts/odds/?regions=us&markets=h2h&oddsFormat=american&apiKey={API_KEY}"

def get_odds():
    try:
        response = requests.get(URL)
        response.raise_for_status()  # Raise an exception for bad status codes
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"An error occurred: {e}")
        return None

if __name__ == '__main__':
    odds_data = get_odds()
    if odds_data:
        with open('odds_data.json', 'w') as f:
            json.dump(odds_data, f, indent=4)
        print("Odds data fetched successfully!")
    else:
        print("Failed to fetch odds data.")