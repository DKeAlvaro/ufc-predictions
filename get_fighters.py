import pandas as pd

ufc_data = pd.read_csv('ufc_fighters.csv')
ufc_data['full_name'] = ufc_data['first_name'] + ' ' + ufc_data['last_name']
fighters_list = ufc_data['full_name'].dropna().unique().tolist()

with open('fighters.txt', 'w') as f:
    for fighter in sorted(fighters_list):
        f.write(f"{fighter}\n")







