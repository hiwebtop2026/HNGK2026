import pandas as pd

df = pd.read_excel(r'C:\Users\lhp\Desktop\printPage (1).xlsx', header=None)
volunteers = []

for i in range(0, len(df), 3):
    if i + 2 >= len(df):
        break
    row1 = df.iloc[i].tolist()
    volunteers.append({'seq': row1[0], 'info': row1[2]})

for v in volunteers:
    print(f'{int(v["seq"])}: {v["info"]}')
