import time
import requests

url = "http://api.gozisk.com/api/arbitrage/create/bid"

def set_arbitrage():
    global url
    response = requests.get(url)
    # Check the response status code
    if response.status_code == 200:
        print("Request was successful!")
        print("Response content:", response.text)
    else:
        print("Request failed with status code:", response.status_code)

while True:
    try:
        set_arbitrage()
        time.sleep(60)
    
    # To handle exceptions
    except Exception as e:
        print(f"{e}")

