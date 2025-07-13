import json
import os
import requests
from bs4 import BeautifulSoup
from gradio_client import Client
import time
import concurrent.futures
from datetime import datetime

# --- Configuration ---
# Path for the output file where predictions will be saved.
OUTPUT_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'upcoming_predictions.json')

# The endpoint for your Gradio service
GRADIO_API_ENDPOINT = "AlvaroMros/ufc-predictor"

# The number of parallel requests to make to the API.
MAX_WORKERS = 8

# List of models to get predictions from. These must match the filenames in your HF Space.
MODELS_TO_RUN = [
    "XGBoostModel.joblib",
    "LGBMModel.joblib",
    "RandomForestModel.joblib",
    "SVCModel.joblib",
    "LogisticRegressionModel.joblib",
    "BernoulliNBModel.joblib",
    "EloBaselineModel.joblib"
]

# Base URL for scraping upcoming events
SCRAPE_BASE_URL = "http://ufcstats.com/statistics/events/upcoming?page=all"
# --- End Configuration ---


# --- Scraping Functions ---
def get_soup(url):
    """
    Fetches and parses a URL into a BeautifulSoup object.
    """
    try:
        response = requests.get(url)
        response.raise_for_status()
        return BeautifulSoup(response.text, 'html.parser')
    except requests.exceptions.RequestException as e:
        print(f"Could not fetch URL: {url}. Error: {e}")
        return None

def scrape_event_fight_card(event_url):
    """
    Scrapes the fight card from a given upcoming event page.
    """
    print(f"    Scraping fight card for: {event_url}")
    time.sleep(0.1)
    soup = get_soup(event_url)
    if not soup:
        return []

    fight_card = []
    fight_table = soup.find('table', class_='b-fight-details__table')
    if not fight_table:
        print("      -> No fight table found for event.")
        return []
    
    fight_rows = fight_table.find('tbody').find_all('tr', class_='b-fight-details__table-row')
    for row in fight_rows:
        cols = row.find_all('td')
        if len(cols) > 6:
            fighter_p_tags = cols[1].find_all('p')
            weight_class_td = cols[6]
            if len(fighter_p_tags) == 2 and weight_class_td:
                fight_card.append({
                    'fighter_1': fighter_p_tags[0].text.strip(),
                    'fighter_2': fighter_p_tags[1].text.strip(),
                    'weight_class': weight_class_td.text.strip()
                })
    print(f"      -> Found {len(fight_card)} fights.")
    return fight_card

def scrape_next_event():
    """
    Scrapes the very next upcoming UFC event and its fight card.
    """
    print(f"Scraping for the next upcoming event from: {SCRAPE_BASE_URL}")
    soup = get_soup(SCRAPE_BASE_URL)
    if not soup:
        return None

    table = soup.find('table', class_='b-statistics__table-events')
    if not table:
        print("Could not find the upcoming events table.")
        return None

    for row in table.find('tbody').find_all('tr', class_='b-statistics__table-row'):
        event_link_tag = row.find('a', class_='b-link b-link_style_black')
        if not event_link_tag or not event_link_tag.has_attr('href'):
            continue
        
        event_name = event_link_tag.text.strip()
        event_url = event_link_tag['href']
        
        fight_card = scrape_event_fight_card(event_url)
        
        # We only want the first event with a valid fight card
        if fight_card:
            print(f"  Found next event: {event_name}")
            return {
                'name': event_name,
                'date': row.find('span', class_='b-statistics__date').text.strip(),
                'location': row.find('td', class_='b-statistics__table-col_style_big-top-padding').text.strip(),
                'url': event_url,
                'fights': fight_card
            }
    return None

# --- Prediction Functions ---
def predict_single_fight(client, model_name, fighter1, fighter2):
    """
    Worker function to predict a single fight.
    """
    try:
        print(f"  Predicting: {fighter1} vs. {fighter2} with {model_name}")
        result = client.predict(
            model_name=model_name,
            fighter1_name=fighter1,
            fighter2_name=fighter2,
            api_name="/predict_fight"
        )
        winner, probability = result
        return {'winner': winner, 'probability': probability}
    except Exception as e:
        print(f"    -> Failed for {fighter1} vs {fighter2}: {e}")
        return {'error': str(e)}

def main():
    """
    Scrapes the next upcoming event, gets predictions for its fights,
    and saves the combined results to a single JSON file.
    """
    # 1. Scrape the next event data
    event_data = scrape_next_event()

    if not event_data:
        print("Could not find any upcoming events to predict. Exiting.")
        return

    # 2. Connect to the Gradio Prediction API
    print(f"\nConnecting to Gradio API at: {GRADIO_API_ENDPOINT}")
    try:
        client = Client(GRADIO_API_ENDPOINT)
    except Exception as e:
        print(f"Failed to connect to Gradio client: {e}")
        return
        
    # 3. Prepare the structure for the output JSON
    event_predictions = {
        'event_name': event_data['name'],
        'event_date': event_data['date'],
        'last_updated': datetime.now().isoformat(),
        'fights': []
    }
    
    total_fights = len(event_data.get('fights', []))
    print(f"\nFound {total_fights} fights to predict for {event_data['name']}.")

    for fight in event_data.get('fights', []):
        event_predictions['fights'].append({
            'fight': f"{fight['fighter_1']} vs. {fight['fighter_2']}",
            'weight_class': fight['weight_class'],
            'predictions': {}
        })

    # 4. Run predictions for all fights in parallel for each model
    for model_name in MODELS_TO_RUN:
        print(f"\n--- Processing Model: {model_name} ---")
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
            future_to_fight = {}
            for fight_data in event_predictions['fights']:
                fighter1, fighter2 = fight_data['fight'].split(' vs. ')
                future = executor.submit(predict_single_fight, client, model_name, fighter1, fighter2)
                future_to_fight[future] = fight_data

            for future in concurrent.futures.as_completed(future_to_fight):
                fight_data = future_to_fight[future]
                try:
                    prediction_result = future.result()
                    fight_data['predictions'][model_name] = prediction_result
                except Exception as exc:
                    print(f"  A prediction task for '{fight_data['fight']}' generated an exception: {exc}")
                    fight_data['predictions'][model_name] = {'error': str(exc)}
    
    # The final JSON will be a list containing a single event object,
    # maintaining the structure the frontend expects.
    final_output = [event_predictions]

    # 5. Save the final results to the output file
    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(final_output, f, indent=4)
        
    print(f"\n\nProcess complete. Predictions saved to {OUTPUT_PATH}")

if __name__ == "__main__":
    main()