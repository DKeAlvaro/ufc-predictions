import json
import os
import requests
from bs4 import BeautifulSoup
import time
from datetime import datetime

# --- Configuration ---
# Path for the output file where event results will be saved.
PAST_RESULTS_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'past_event_results.json')
# Path for the file containing the predictions for the upcoming event.
UPCOMING_PREDICTIONS_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'upcoming_predictions.json')

# Base URL for scraping completed events
SCRAPE_BASE_URL = "http://ufcstats.com/statistics/events/completed?page=all"
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

def scrape_fight_results(event_url):
    """
    Scrapes the fight results from a given completed event page.
    """
    print(f"    Scraping fight results for: {event_url}")
    time.sleep(0.1)
    soup = get_soup(event_url)
    if not soup:
        return []

    results = []
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
                fighter_1_name = fighter_p_tags[0].find('a').text.strip()
                fighter_2_name = fighter_p_tags[1].find('a').text.strip()

                # --- Simplified and Corrected Winner Determination Logic ---
                winner = "N/A"  # Default value

                # The first column of the row (`W/L`) contains the result indicator.
                status_cell = cols[0]
                
                # A green "win" flag indicates the first fighter listed is the winner.
                if status_cell.find(class_='b-flag_style_green'):
                    winner = fighter_1_name
                # A grey "draw" flag indicates a draw.
                elif status_cell.find(class_='b-flag_style_draw'):
                    winner = "Draw"
                # If there's no green or grey flag, it's either a loss for the first fighter,
                # making the second the winner, or a no-contest.
                else:
                    method_text = cols[7].text.strip().upper()
                    if "NC" in method_text or "DRAW" in method_text:
                        winner = "Draw/No Contest"
                    else:
                        # If fighter1 did not win and it wasn't a draw/nc, fighter2 must be the winner.
                        winner = fighter_2_name
                
                results.append({
                    'fight': f"{fighter_1_name} vs. {fighter_2_name}",
                    'winner': winner,
                    'weight_class': weight_class_td.text.strip()
                })
    print(f"      -> Found {len(results)} fights.")
    return results

def scrape_last_completed_event():
    """
    Scrapes the most recently completed UFC event and its fight results.
    """
    print(f"Scraping for the last completed event from: {SCRAPE_BASE_URL}")
    soup = get_soup(SCRAPE_BASE_URL)
    if not soup:
        return None

    table = soup.find('table', class_='b-statistics__table-events')
    if not table:
        print("Could not find the completed events table.")
        return None

    # Find the first event row that is NOT an upcoming event.
    # Upcoming events have a special 'next.png' image.
    for row in table.find('tbody').find_all('tr', class_='b-statistics__table-row'):
        # Check if the row contains the 'upcoming' image
        if row.find('img', src=lambda s: s and 'next.png' in s):
            continue # Skip upcoming events

        # This should be the first completed event
        event_link_tag = row.find('a', class_='b-link b-link_style_black')
        if not event_link_tag or not event_link_tag.has_attr('href'):
            continue # Move to next row if link is not found
        
        event_name = event_link_tag.text.strip()
        event_url = event_link_tag['href']
    
        fight_results = scrape_fight_results(event_url)
    
        if fight_results:
            print(f"  Found last completed event: {event_name}")
            return {
                'event_name': event_name,
                'event_date': row.find('span', class_='b-statistics__date').text.strip(),
                'location': row.find('td', class_='b-statistics__table-col_style_big-top-padding').text.strip(),
                'url': event_url,
                'results': fight_results
            }
        
    print("Could not find a valid completed event to scrape.")
    return None

def main():
    """
    Scrapes the last completed event, merges it with saved predictions,
    and appends the combined results to a JSON file.
    """
    # 1. Load existing data if the file exists
    existing_results = []
    if os.path.exists(PAST_RESULTS_PATH):
        try:
            with open(PAST_RESULTS_PATH, 'r', encoding='utf-8') as f:
                content = f.read()
                if content:
                    existing_results = json.loads(content)
        except (json.JSONDecodeError, FileNotFoundError):
            print(f"Warning: Could not read or decode {PAST_RESULTS_PATH}. Starting with an empty list.")
            existing_results = []

    # 2. Load the predictions made for the (now completed) event
    upcoming_predictions_data = None
    if os.path.exists(UPCOMING_PREDICTIONS_PATH):
        try:
            with open(UPCOMING_PREDICTIONS_PATH, 'r', encoding='utf-8') as f:
                # The prediction file is a list, we need the first (and only) event
                predictions = json.load(f)
                if predictions:
                    upcoming_predictions_data = predictions[0]
        except (json.JSONDecodeError, FileNotFoundError):
            print(f"Warning: Could not read or decode {UPCOMING_PREDICTIONS_PATH}.")

    # 3. Scrape the last completed event data
    last_event_data = scrape_last_completed_event()

    if not last_event_data:
        print("Could not find any completed events to record. Exiting.")
        return

    # 4. Check if the event is already in our records
    event_already_exists = any(
        event.get('url') == last_event_data['url'] for event in existing_results
    )

    if event_already_exists:
        print(f"Event '{last_event_data['event_name']}' is already in the database. No update needed.")
    else:
        print(f"New event '{last_event_data['event_name']}' found. Processing...")
        
        # 5. Merge predictions with results if available
        if upcoming_predictions_data and upcoming_predictions_data.get('event_name') == last_event_data.get('event_name'):
            print("  -> Found matching predictions. Merging with actual results...")
            
            # Create lookup maps from the prediction data.
            # The key will be a frozenset of the two fighter names, which ignores order.
            predictions_map = {}
            odds_map = {}
            for fight in upcoming_predictions_data.get('fights', []):
                fighters = set(fight['fight'].split(' vs. '))
                # Use a frozenset as the key because it's hashable and order-independent
                predictions_map[frozenset(fighters)] = fight.get('predictions', {})
                if 'odds' in fight:
                    odds_map[frozenset(fighters)] = fight['odds']

            # Iterate through actual results and add the corresponding predictions and odds
            for result in last_event_data.get('results', []):
                # Create a similar key from the results data
                result_fighters = set(result['fight'].split(' vs. '))
                result_key = frozenset(result_fighters)
                
                # Look up the predictions using the order-independent key
                if result_key in predictions_map:
                    result['predictions'] = predictions_map[result_key]
                else:
                    # If no prediction was found for a fight, add an empty dict
                    result['predictions'] = {}
                    
                # Add odds data if available
                if result_key in odds_map:
                    result['odds'] = odds_map[result_key]
        else:
            print("  -> No matching prediction data found. Saving results without predictions.")
            for result in last_event_data.get('results', []):
                result['predictions'] = {}

        # 6. Prepend the new, combined event data to the list
        existing_results.insert(0, last_event_data) 

        # 7. Save the updated results back to the file
        with open(PAST_RESULTS_PATH, 'w', encoding='utf-8') as f:
            json.dump(existing_results, f, indent=4)
        
        print(f"Successfully saved new event results to {PAST_RESULTS_PATH}")

if __name__ == "__main__":
    main()