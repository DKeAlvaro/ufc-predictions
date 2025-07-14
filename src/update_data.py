# This script orchestrates the updating of all data sources.
# It first checks for the results of the last completed event and merges any predictions.
# Then, it scrapes the next upcoming event and generates new predictions for it.

import check_past_predictions
import predict_upcoming_fights
import time
import json
import os

def has_new_past_events():
    """Check if there are new completed events to process."""
    try:
        PAST_RESULTS_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'past_event_results.json')
        
        # Load existing results
        existing_results = []
        if os.path.exists(PAST_RESULTS_PATH):
            with open(PAST_RESULTS_PATH, 'r', encoding='utf-8') as f:
                content = f.read()
                if content:
                    existing_results = json.loads(content)
        
        # Get the last completed event
        last_event_data = check_past_predictions.scrape_last_completed_event()
        if not last_event_data:
            return False
            
        # Check if event already exists
        return not any(event.get('url') == last_event_data['url'] for event in existing_results)
    except:
        return True  # If there's an error, assume we need to update

def has_new_upcoming_events():
    """Check if there are new upcoming events to process."""
    try:
        OUTPUT_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'upcoming_predictions.json')
        
        # Get current upcoming event
        event_data = predict_upcoming_fights.scrape_next_event()
        if not event_data:
            return False
            
        # Check existing predictions
        if os.path.exists(OUTPUT_PATH):
            with open(OUTPUT_PATH, 'r', encoding='utf-8') as f:
                predictions = json.load(f)
                if predictions and predictions[0].get('event_name') == event_data['name']:
                    return False
        
        return True
    except:
        return True  # If there's an error, assume we need to update

def main():
    """
    Runs the two main data update processes in sequence, but only if there are new events to process.
    """
    print("="*50)
    print("STARTING DATA UPDATE PROCESS")
    print("="*50)
    
    # Check for new events
    print("\n>>> CHECKING FOR NEW EVENTS...")
    new_past = has_new_past_events()
    new_upcoming = has_new_upcoming_events()
    
    if not new_past and not new_upcoming:
        print(">>> NO NEW EVENTS FOUND. Skipping update process.")
        print("="*50)
        print("DATA UPDATE PROCESS FINISHED (NO UPDATES NEEDED)")
        print("="*50)
        return
    
    print(f">>> NEW EVENTS DETECTED - Past: {'Yes' if new_past else 'No'}, Upcoming: {'Yes' if new_upcoming else 'No'}")
    
    # Step 1: Update past events if needed
    if new_past:
        print("\n>>> STEP 1: Checking for and recording results from the last completed event...")
        try:
            check_past_predictions.main()
            print(">>> STEP 1 COMPLETED SUCCESSFULLY.")
        except Exception as e:
            print(f"!!! ERROR in Step 1: {e}")
    else:
        print("\n>>> STEP 1: SKIPPED (No new past events)")

    time.sleep(2)

    # Step 2: Update upcoming events if needed  
    if new_upcoming:
        print("\n>>> STEP 2: Scraping the next upcoming event and generating predictions...")
        try:
            predict_upcoming_fights.main()
            print(">>> STEP 2 COMPLETED SUCCESSFULLY.")
        except Exception as e:
            print(f"!!! ERROR in Step 2: {e}")
    else:
        print("\n>>> STEP 2: SKIPPED (No new upcoming events)")

    print("\n" + "="*50)
    print("DATA UPDATE PROCESS FINISHED")
    print("="*50)


if __name__ == "__main__":
    main() 