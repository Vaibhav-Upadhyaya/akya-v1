import ollama
import os

# General chat function with customizable system prompt
def chat(query,modle):
    response = ollama.chat(
            model="deepseek-v3.1:671b-cloud",
            messages=[
                {
                    "role": "system", 
                    "content": modle
                },
                {"role": "user", "content": query}
            ]
        )
    return response['message']['content']

# Classifies the user query into one of four categories
def descision(query):
    
    response = ollama.chat(
        model="deepseek-v3.1:671b-cloud",
        messages=[
            {
                "role": "system", 
                "content": f"You are a classifier. Your ONLY job is to categorise user queries. Your output must be exactly one word: 'realtime' for things that changes overtime like networth, scores , stock prices;'fact' for thaings that do not change over time like size of planets , mathematical or physics formulae, history ,geography,general knowledge , something learning about any subject like programming language or any subject ;'system' for opening application,doing any thing on this system;'talking' for general talk, 'open webcam' if asked to do so and for the thingss that dosent fall in previoust categories. Do not add explanations, symbols, or anything else. Return only the given 5 categories. Do not give a category from urself"
            },
            {"role": "user", "content": query}
        ]
    )
    return response["message"]["content"]

# Returns a short, factual response in Indian context
def responce(query):
    with open("memory.txt","r",encoding="utf-8") as f:
        memory = f.read()
    response = ollama.chat(
        model="deepseek-v3.1:671b-cloud",
        messages=[
            {"role": "system", 
            "content": f"You are an encyclopedia for Indian context.Your ONLY job is to reply in 1 short.Use Indian units (rupees, kilometers, kilos, liters). Do not add greetings, explanations, or extra text.Reply in 2-3 words or sentence with poilte tone. you wil also get context of the convo between bot and the user context = {memory}"
            },
            {"role": "user", "content": query}
        ]
    )
    
    return response['message']['content']

# Returns a polite, short conversational response
def talk(query):
    with open("memory.txt","r",encoding="utf-8") as f:
        memory = f.read()
    response = ollama.chat(
        model="qwen3-vl:235b-cloud",
        messages=[
            {"role": "system", "content": f"Reply with poilte tone, keep the conversation small.you wil also get context of the convo between bot and the user context = {memory}"},
            {"role": "user", "content": query}
        ]
    )
    
    return response['message']['content']

# Reformats raw data into easy-to-understand English sentences
def reframe(query):
    response = ollama.chat(
        model="deepseek-v3.1:671b-cloud",
        messages=[
            {"role": "system", "content": "you have to make sentences which are easy to understand by humands . taking raw data and and forming an english sentence to understand it. keep it short and simple"},
            {"role": "user", "content": query}
        ]
    )
    
    return response['message']['content']

# Infers which applications the user wants to open, returns names separated by '$'
def system(query):
    response = ollama.chat(
        model="deepseek-v3.1:671b-cloud",
        messages=[
            {
                "role": "system", 
                "content": "You have to infer what all application user wants to open and write them in format:app1$app2$app3 and so on. do not type anything else , no unnecessory symbols , just type name of apps name with '$' sign between them"
            },
            {"role": "user", "content": query}
        ]
    )
    
    return response["message"]["content"]

# Generates a Google-searchable prompt from user query
def promt(query):
    response = ollama.chat(
        model="deepseek-v3.1:671b-cloud",
        messages=[
            {
                "role": "system", 
                "content": "You are a prompt generator whaich can be used to generate searchable prompt. You have to understand the need of user and ganerate a sentence which can be understood by google search engine and give desired output. Generate only the output with out talking or writting anything else. Do not give any data just simple prompt that can be searched on google search engine."
            },
            {"role": "user", "content": query}
        ]
    )
    
    return response["message"]["content"]

# Identifies app names from user query, returns names separated by '$'
def system_des(query):
    response = ollama.chat(
        model="deepseek-v3.1:671b-cloud",
        messages=[
            {
                "role": "system", 
                "content": "You i an identifier. your only job is to return the names of apps user wants to opem or work with. Return answer in form of : app1$app2$app3 and so on.Do not use anything else except the given format"
            },
            {"role": "user", "content": query}
        ]
    )
    
    return response["message"]["content"]

# General assistant for daily tasks and short answers
def assist(query):
    response = ollama.chat(
        model="deepseek-v3.1:671b-cloud",
        messages=[
            {
                "role": "system", 
                "content": "You are an assistant. Your job is to help user in their daily tasks. You can help in setting reminders, making to-do lists, providing weather updates, answering general knowledge questions, and assisting with basic calculations. Always respond in a polite and concise manner. You can also provide suggestion but only when nessary not always. Keep your responces short"
            },
            {"role": "user", "content": query}
        ]
    )
    
    return response["message"]["content"]
    
def webcamAutomation(query):
    response = ollama.generate(
            model="qwen3-vl:235b-cloud",
            prompt=query,
            images=["photo.jpg"]
        )
    os.remove("photo.jpg")
    return response["response"]
    
