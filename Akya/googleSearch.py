from serpapi import GoogleSearch
from chatBot import promt

API_KEY = "730ed750b40bda8b10d7b4b965b594393d6ef054f6a1f2aeee127fe830c48b04"

def google_search(query):
    pr = promt(query)
    search = GoogleSearch({
        "q": pr,
        "hl": "en",
        "gl": "in",  # Google India
        "api_key": API_KEY
    })
    results = search.get_dict()
    # Get top organic result
    try:
        top_result = results['organic_results'][0]['snippet']
        return top_result
    except:
        return "No result found."


