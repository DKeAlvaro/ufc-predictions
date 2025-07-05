import json
import os
from gradio_client import Client
import time
import concurrent.futures

# --- Configuration ---
# Path to the JSON file containing the upcoming events data.
# It assumes this script is run from the 'web/ufc-predictions' directory.
UPCOMING_EVENTS_PATH = os.path.join(os.path.dirname(__file__), '..', '..', 'output', 'upcoming_events.json')

# Path for the output file where predictions will be saved.
OUTPUT_PATH = os.path.join(os.path.dirname(__file__), 'upcoming_predictions.json')

# The endpoint for your Gradio service
GRADIO_API_ENDPOINT = "AlvaroMros/ufc-predictor"

# The number of parallel requests to make to the API.
# Increase for faster processing, but be mindful of API rate limits.
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
# --- End Configuration ---

def predict_single_fight(client, model_name, fighter1, fighter2):
    """
    Worker function to predict a single fight.
    This will be executed in a separate thread.
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

def get_predictions_for_upcoming_fights():
    """
    Connects to the Gradio API to get predictions for all upcoming fights
    using a list of specified models, processing one model at a time in parallel.
    """
    if not os.path.exists(UPCOMING_EVENTS_PATH):
        print(f"Error: Upcoming events file not found at '{UPCOMING_EVENTS_PATH}'")
        print("Please run the 'scrape_upcoming_events.py' script first.")
        return

    with open(UPCOMING_EVENTS_PATH, 'r', encoding='utf-8') as f:
        upcoming_events = json.load(f)

    print(f"Connecting to Gradio API at: {GRADIO_API_ENDPOINT}")
    try:
        client = Client(GRADIO_API_ENDPOINT)
    except Exception as e:
        print(f"Failed to connect to Gradio client: {e}")
        return

    # First, build the skeleton of the final predictions file.
    all_predictions = []
    total_fights = 0
    for event in upcoming_events:
        event_predictions = {
            'event_name': event['name'],
            'event_date': event['date'],
            'fights': []
        }
        for fight in event.get('fights', []):
            total_fights += 1
            event_predictions['fights'].append({
                'fight': f"{fight['fighter_1']} vs. {fight['fighter_2']}",
                'predictions': {}
            })
        all_predictions.append(event_predictions)
    
    print(f"Found {len(upcoming_events)} events with a total of {total_fights} fights to predict.")

    # Now, iterate through each model and get predictions for all fights in parallel.
    for model_name in MODELS_TO_RUN:
        print(f"\n--- Processing Model: {model_name} ---")
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
            # This dictionary maps each submitted task (future) to the fight data
            # it corresponds to, so we can place the result correctly.
            future_to_fight = {}
            for event_data in all_predictions:
                for fight_data in event_data['fights']:
                    fighter1, fighter2 = fight_data['fight'].split(' vs. ')
                    future = executor.submit(predict_single_fight, client, model_name, fighter1, fighter2)
                    future_to_fight[future] = fight_data

            # Process the results as they complete
            for future in concurrent.futures.as_completed(future_to_fight):
                fight_data = future_to_fight[future]
                try:
                    prediction_result = future.result()
                    fight_data['predictions'][model_name] = prediction_result
                except Exception as exc:
                    print(f"  A prediction task for '{fight_data['fight']}' generated an exception: {exc}")
                    fight_data['predictions'][model_name] = {'error': str(exc)}

    # Save the final results to a JSON file
    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(all_predictions, f, indent=4)
        
    print(f"\n\nPrediction process complete. Results saved to {OUTPUT_PATH}")

if __name__ == "__main__":
    get_predictions_for_upcoming_fights() 