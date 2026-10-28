from __future__ import annotations

import datetime
import os
import random
import subprocess
import sys

try:
    import pyttsx3
except ImportError:
    pyttsx3 = None

try:
    import speech_recognition as sr
except ImportError:
    sr = None

import chatBot
from googleSearch import google_search
from systemAutomation import systemAutomation
from webcam import Capture

_ENGINE = None


def configure_console_output() -> None:
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass


configure_console_output()


def env_flag(name: str, default: bool = False) -> bool:
    value = os.environ.get(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def should_speak() -> bool:
    return env_flag("AKYA_ENABLE_TTS", True)


def should_skip_greeting() -> bool:
    return env_flag("AKYA_SKIP_GREETING", False)


def get_engine():
    global _ENGINE
    if _ENGINE is not None or pyttsx3 is None:
        return _ENGINE

    try:
        engine = pyttsx3.init("sapi5")
        voices = engine.getProperty("voices")
        if voices:
            engine.setProperty("voice", voices[0].id)
            print(voices[0].id)
        _ENGINE = engine
    except Exception as error:
        print(f"TTS unavailable: {error}")
        _ENGINE = None

    return _ENGINE


def speak(audio: str) -> None:
    if not should_speak():
        return

    engine = get_engine()
    if engine is None:
        return

    try:
        engine.say(audio)
        engine.runAndWait()
    except Exception as error:
        print(f"TTS error: {error}")


def write_memory(role: str, text: str) -> None:
    message = text.strip()
    if not message:
        return

    with open("memory.txt", "a", encoding="utf-8") as memory_file:
        memory_file.write(f"{role}: {message}\n")


def take_microphone_command() -> str:
    if sr is None:
        print("Speech recognition is not available in this environment.")
        return ""

    recognizer = sr.Recognizer()

    try:
        with sr.Microphone() as source:
            print("Listening...")
            recognizer.pause_threshold = 1
            audio = recognizer.listen(source)
    except Exception as error:
        print(f"Microphone error: {error}")
        return ""

    try:
        print("Recognizing...")
        query = recognizer.recognize_google(audio, language="en-in")
        print("user said:", query)
        return query.strip()
    except Exception:
        print("Say that again please...")
        return ""


def take_typed_command() -> str:
    try:
        return input("Task : ").strip()
    except EOFError:
        return ""


def normalize_input_mode(input_mode: str | None = None, preset_task: str | None = None) -> str:
    mode = (input_mode or os.environ.get("AKYA_INPUT_MODE", "")).strip().lower()
    if mode in {"mic", "type"}:
        return mode

    provided_task = (preset_task or os.environ.get("AKYA_TASK", "")).strip()
    return "type" if provided_task else "mic"


def resolve_query(input_mode: str | None = None, preset_task: str | None = None) -> str:
    selected_mode = normalize_input_mode(input_mode, preset_task)
    provided_task = (preset_task or os.environ.get("AKYA_TASK", "")).strip()

    if provided_task:
        print(f"Input mode selected: {selected_mode}")
        print(f"Using provided task: {provided_task}")
        return provided_task

    if selected_mode == "type":
        return take_typed_command()

    return take_microphone_command()


def run_command(command: str) -> None:
    try:
        subprocess.Popen(command, shell=True)
        speak(f"Running command: {command}")
    except Exception as error:
        print(f"Error running command: {error}")
        speak("I couldn't run that command.")


def wishMe() -> None:
    hour = int(datetime.datetime.now().hour)
    if 0 <= hour < 12:
        speak("Good Morning sir")
    elif 12 <= hour < 15:
        speak("Good afternoon sir")
    else:
        speak("Good Evening sir")

    greeting_questions = [
        "Hello, how are you?",
        "Hi there! How is it going?",
        "Hey! What is up?",
        "Good morning! How are you today?",
        "Good afternoon! How is everything?",
        "Howdy! How have you been?",
        "Hiya! How is life treating you?",
        "Hey there! How are things?",
        "Greetings! How do you do?",
        "Hi! How are you holding up?"
    ]
    speak(random.choice(greeting_questions))


def process_query(query: str) -> str:
    clean_query = query.strip()
    if not clean_query:
        return ""

    write_memory("user", clean_query)
    decision = str(chatBot.descision(clean_query)).strip()
    print(decision)
    decision_lower = decision.lower()

    if "realtime" in decision_lower:
        realtime_result = google_search(clean_query)
        response = str(chatBot.reframe(realtime_result)).strip()
    elif "fact" in decision_lower:
        response = str(chatBot.responce(clean_query)).strip()
    elif "talking" in decision_lower:
        response = str(chatBot.talk(clean_query)).strip()
    elif "system" in decision_lower:
        response = str(systemAutomation(clean_query)).strip() or "Task completed"
    elif "open webcam" in decision_lower:
        response = str(Capture(clean_query)).strip()
    else:
        response = str(chatBot.assist(clean_query)).strip()

    if response:
        print(response)
        write_memory("bot", response)
        speak(response)

    return response


def run_once(input_mode: str | None = None, preset_task: str | None = None) -> str:
    query = resolve_query(input_mode=input_mode, preset_task=preset_task)
    if not query:
        return ""

    if query.strip().lower() == "exit":
        print("Exiting...")
        return "exit"

    return process_query(query)


def main() -> int:
    if not should_skip_greeting():
        wishMe()

    print("Chatbot ready! Type 'exit' to quit.")
    run_once_mode = env_flag("AKYA_RUN_ONCE", False)
    selected_mode = normalize_input_mode()

    while True:
        result = run_once(input_mode=selected_mode)

        if result == "exit":
            return 0

        if run_once_mode:
            return 0 if result else 1

        if not result:
            continue

        if selected_mode == "type":
            try:
                input("Press enter to continue...")
            except EOFError:
                return 0


if __name__ == "__main__":
    raise SystemExit(main())
