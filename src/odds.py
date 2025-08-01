import json
import os
from odds_api import get_odds

UPCOMING_PREDICTIONS_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'upcoming_predictions.json')

def enrich_with_odds():
    print("Fetching odds from the-odds-api.com...")
    odds_data = get_odds()

    if not odds_data:
        print("Could not fetch odds. Skipping enrichment.")
        return

    with open(UPCOMING_PREDICTIONS_PATH, 'r+') as f:
        data = json.load(f)

        for event in data:
            for fight in event['fights']:
                for game in odds_data:
                    fighter1_name, fighter2_name = fight['fight'].split(' vs. ')
                    if (fighter1_name == game['home_team'] and fighter2_name == game['away_team']) or \
                       (fighter1_name == game['away_team'] and fighter2_name == game['home_team']):
                        
                        bookmaker_odds = game['bookmakers'][0]['markets'][0]['outcomes']
                        
                        fighter1_odds = None
                        fighter2_odds = None

                        if fighter1_name == bookmaker_odds[0]['name']:
                            fighter1_odds = bookmaker_odds[0]['price']
                            fighter2_odds = bookmaker_odds[1]['price']
                        else:
                            fighter1_odds = bookmaker_odds[1]['price']
                            fighter2_odds = bookmaker_odds[0]['price']

                        fight['odds'] = {
                            'fighter1': {
                                'name': fighter1_name,
                                'odds': fighter1_odds
                            },
                            'fighter2': {
                                'name': fighter2_name,
                                'odds': fighter2_odds
                            }
                        }
                        break

        f.seek(0)
        json.dump(data, f, indent=4)
        f.truncate()

    print("Successfully enriched predictions with odds.")

if __name__ == '__main__':
    enrich_with_odds()