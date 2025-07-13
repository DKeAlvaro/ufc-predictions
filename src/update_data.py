# This script orchestrates the updating of all data sources.
# It first checks for the results of the last completed event and merges any predictions.
# Then, it scrapes the next upcoming event and generates new predictions for it.

import check_past_predictions
import predict_upcoming_fights
import time

def main():
    """
    Runs the two main data update processes in sequence.
    """
    print("="*50)
    print("STARTING DATA UPDATE PROCESS")
    print("="*50)
    
    # --- Step 1: Update Past Event Results ---
    print("\n>>> STEP 1: Checking for and recording results from the last completed event...")
    try:
        check_past_predictions.main()
        print(">>> STEP 1 COMPLETED SUCCESSFULLY.")
    except Exception as e:
        print(f"!!! ERROR in Step 1 (check_past_predictions): {e}")

    # Add a small delay between the scripts
    time.sleep(2)

    # --- Step 2: Generate Predictions for Upcoming Event ---
    print("\n>>> STEP 2: Scraping the next upcoming event and generating predictions...")
    try:
        predict_upcoming_fights.main()
        print(">>> STEP 2 COMPLETED SUCCESSFULLY.")
    except Exception as e:
        print(f"!!! ERROR in Step 2 (predict_upcoming_fights): {e}")

    print("\n" + "="*50)
    print("DATA UPDATE PROCESS FINISHED")
    print("="*50)


if __name__ == "__main__":
    main() 