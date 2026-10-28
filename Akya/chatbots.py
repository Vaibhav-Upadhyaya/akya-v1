import ollama
import pyautogui
import win32gui
from pywinauto import Desktop

def step(task):
    screenshot = pyautogui.screenshot()
    screenshot.save("initiater.png")
    import ollama

    response = ollama.generate(
        model='qwen3.5:397b-cloud',
        prompt=f"""
            You are a vision-grounded UI action selector.

PRIMARY SOURCE OF TRUTH:
- The screenshot image is the ONLY reliable information.
- If something is not clearly visible in the screenshot, it DOES NOT EXIST.

INPUTS:
1) Screenshot of the current screen (authoritative)
2) Task description (secondary guidance only)

CORE RULES (MANDATORY):
- You have NO memory and NO history.
- Do NOT infer, assume, or imagine UI elements.
- Do NOT rely on common app layouts unless they are visibly confirmed.
- Every action MUST be justified by something visible in the screenshot.
- If the correct next step is not visually obvious, choose WAIT.
- to open any application just return : open [application name]
- when told to open an website like youtube , github etc return : open chrome untill a specific browser is told or already open
YOUR JOB:
- Select the SINGLE safest NEXT ACTION that moves toward the task.
- Do NOT plan ahead.
- Do NOT explain reasoning.
- Do NOT describe the image.
- selecting an input field and entering data (and pressing enter if required) should be one step

VISUAL GROUNDING CHECK (SILENT):
Before choosing an action, verify:
- Can I POINT to the exact pixels that justify this action?
If not → WAIT.

OUTPUT FORMAT (STRICT, ONE LINE ONLY):
ACTION: <one action>

ALLOWED ACTIONS:
- CLICK <visually grounded element>
- DOUBLE_CLICK <visually grounded element>
- TYPE <text> INTO <visually grounded element>
- PRESS <key or key combo>
- SCROLL <direction>
- WAIT

ELEMENT DESCRIPTION RULES:
- Must reference visible text, icon, color, or precise location
- Examples:
- "Search field with magnifying glass icon at top center"
- "Blue button labeled 'Submit' bottom right"
- "Three-dot menu icon next to video title"

FAILURE CONDITIONS:
- If the task is already complete → ACTION: DONE
- If no safe action is visually verifiable → ACTION: WAIT

task = {task}
 """,
        images=['initiater.png']   # path to image
    )

    return response['response']


def uiDecisionMaker(task,step):
    pyautogui.screenshot("descision.png")
    response = ollama.generate(
        model='qwen3.5:397b-cloud',
        prompt=f"""
You are a UI automation router. Analyze the screenshot and step to choose the BEST automation method.

overall task: {task}
STEP TO EXECUTE: {step}

DECISION LOGIC (follow in order):

1. CHECK: Does step say "open [app name]"?
   → Return: open app

2. CHECK: Can this be done with keyboard shortcuts?
   Examples:
   - Navigate to website → YES (Ctrl+L, type, Enter)
   - Search on YouTube/GitHub → YES (/ key)
   - Switch tabs/windows → YES (Ctrl+Tab, Alt+Tab)
   - Find text on page → YES (Ctrl+F)
   - Type in search bar → YES (Tab to focus, then type)
   - Typing message in whats app
   - searching name on whatsApp
   - sending some message
   → Return: hotkeys

3. CHECK: an application is visible weather system or web and the step is about to click a button , text, title,link:
   - Click button
   - Click link
   - Click title
   → Return: button

4. CHECK: input fields , task say to select any input field and enter data in it:
   - selecting input field
   - any online form
   - search bar (other than horkeys)
   → Return: field

5. If none match → Return: UNCLEAR

PRIORITY RULES:
- ALWAYS prefer "hotkeys" over "field" when possible
- Use "field" only when hotkeys cannot accomplish the task
- Use "clicks" only to click title , button

Return ONLY one of: open app | hotkeys | clicks | field | UNCLEAR
""",
        images=['descision.png']
    )
    return response['response']


def webAutomationCodeGenerator(current_step,uiDescision):
    pyautogui.screenshot("web_automation_input.png")
    image_path = "web_automation_input.png"
    response = ollama.generate(
        model='qwen3.5:397b-cloud',
        prompt="""You are a code generator specializing in creating Python scripts for web automation using Selenium. Your task is to generate a Python script that performs the following web automation task: [WEB_AUTOMATION_TASK]
        

        WEB AUTOMATION PROMPT START
You are a Chrome Browser Automation Specialist. Your expertise is automating web interactions by analyzing screenshots and writing Python code that uses computer vision to identify UI elements and pyautogui to perform actions.

Technical Stack:

OpenCV (cv2): Image processing and analysis
pytesseract: OCR for text recognition in web pages
pyautogui: Mouse and keyboard automation
time: Delays and synchronization
Primary Use Case: Automating Chrome browser interactions when you can only work with screenshots (no DOM access).

Typical Automation Tasks:

Clicking buttons, links, form elements
Filling out forms
Navigating menus
Handling popups/dialogs
Searching and filtering
CODING APPROACH:

1. Image Preprocessing Template:

import cv2
import pytesseract
import pyautogui
import time

# Set tesseract path if needed (Windows)
# pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

def preprocess_image(image_path):
    img = cv2.imread(image_path)
    if img is None:
        raise RuntimeError(f"Screenshot not found: {image_path}")
    
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    gray = cv2.GaussianBlur(gray, (5, 5), 0)
    gray = cv2.adaptiveThreshold(
        gray, 255,
        cv2.ADAPTIVE_THRESH_MEAN_C,
        cv2.THRESH_BINARY_INV,
        11, 2
    )
    return gray
2. Smart Element Detection:

def find_and_click_element(image_path, target_text, y_offset=40, confidence_threshold=0.7):
    "
    Find text in screenshot and click relative to its position
    
    Args:
        target_text: Text pattern to search for (case-insensitive)
        y_offset: Pixels below text to click (for buttons/links)
        confidence_threshold: Minimum text match confidence
    "
    gray = preprocess_image(image_path)
    
    data = pytesseract.image_to_data(
        gray, 
        output_type=pytesseract.Output.DICT,
        config="--psm 6"
    )
    
    for i, text in enumerate(data["text"]):
        text_clean = text.strip().upper()
        target_clean = target_text.strip().upper()
        
        # Flexible text matching for web content
        if target_clean in text_clean:
            confidence = int(data["conf"][i])
            if confidence > confidence_threshold * 100:  # Convert to percentage
                x = data["left"][i]
                y = data["top"][i]
                w = data["width"][i]
                h = data["height"][i]
                
                # Calculate click position (center of text with offset)
                cx = x + w // 2
                cy = y + h // 2 + y_offset
                
                print(f"Found '{text_clean}' at ({cx}, {cy}) with confidence {confidence}%")
                
                pyautogui.moveTo(cx, cy, duration=0.3)
                pyautogui.click()
                return True
    
    return False
3. Common Web Automation Patterns:

For Buttons:

# Click a button (usually need to click below the text)
find_and_click_element("screenshot.png", "Submit", y_offset=30)
For Form Fields:

# First click the field, then type
if find_and_click_element("screenshot.png", "Username", y_offset=0):
    pyautogui.write("my_username")
For Links:

# Links can usually be clicked directly on the text
find_and_click_element("screenshot.png", "Forgot Password", y_offset=10)
For Search/Input Fields:

if find_and_click_element("screenshot.png", "Search", y_offset=0):
    pyautogui.write("query")
    pyautogui.press("enter")
RESPONSE STRUCTURE:

Analysis: "The screenshot shows [describe page]. I need to locate [specific elements]."
Strategy: Step-by-step automation plan with text patterns to search for.
Complete Code: Ready-to-run script with error handling.
Customization Notes: What the user might need to adjust.
Example Response Pattern:

User Task: "Click the 'Add to Cart' button on this e-commerce page."

Your Response:

import cv2
import pytesseract
import pyautogui
import time

# Configure OCR path if needed
# pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

def preprocess_image(image_path):
    img = cv2.imread(image_path)
    if img is None:
        raise RuntimeError(f"Screenshot not found: {image_path}")
    
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    gray = cv2.GaussianBlur(gray, (5, 5), 0)
    gray = cv2.adaptiveThreshold(
        gray, 255,
        cv2.ADAPTIVE_THRESH_MEAN_C,
        cv2.THRESH_BINARY_INV,
        11, 2
    )
    return gray

def automate_add_to_cart(screenshot_path):
    "Automate clicking Add to Cart button"
    time.sleep(2)  # Wait for page stability
    
    gray = preprocess_image(screenshot_path)
    
    data = pytesseract.image_to_data(
        gray,
        output_type=pytesseract.Output.DICT,
        config="--psm 6"
    )
    
    # Search for various button text patterns
    button_patterns = ["ADD TO CART", "ADD TO BAG", "ADD TO BASKET"]
    
    for pattern in button_patterns:
        for i, text in enumerate(data["text"]):
            text_clean = text.strip().upper()
            
            if pattern in text_clean and int(data["conf"][i]) > 60:
                x = data["left"][i]
                y = data["top"][i]
                w = data["width"][i]
                h = data["height"][i]
                
                # Click slightly below the text (typical button layout)
                cx = x + w // 2
                cy = y + h // 2 + 35
                
                print(f"Found '{text_clean}' at ({cx}, {cy})")
                pyautogui.moveTo(cx, cy, duration=0.3)
                pyautogui.click()
                return True
                
    print("Add to Cart button not found. Try adjusting search patterns.")
    return False

# USAGE - User will replace the path
IMAGE_PATH = "screenshot.png"  # Replace with actual path
automate_add_to_cart(IMAGE_PATH)
Notes for Better Accuracy:

Use multiple text patterns for the same action (e.g., "Login", "Sign In", "Log In")
Adjust y_offset based on typical web UI layouts (0 for text fields, 30-40 for buttons)
Consider adding retry logic with different OCR configurations
Now ready for the user's specific web automation task.

above code is a template, you have to fill in the logic to identify the element based on the current step and then perform the action accordingly. Do not take them as it is, you have to modify the code according to the current step and the element you want to interact with. Also, make sure to set the correct path for tesseract OCR in the code

default location of tesseract is C:\Program Files\Tesseract-OCR\tesseract.exe . Please make sure to set the path in the code.

write the code for this task: """ + current_step + """ the screen shot is saved with name web_automation_input.png

also have the descision of library to use with below
"""+uiDescision,
        images=[image_path]
    )
    return response['response']

def extract_code_LLM(query):
    response = ollama.chat(
        model="deepseek-v3.1:671b-cloud",
        messages=[
            {
                "role": "system", 
                "content": """Extract only the Python code from the following text. Return just the code without any additional text, explanations, or formatting markers:
                rules
                - Do NOT add new code
                - Do NOT modify logic
                - Do NOT explain
                - Do NOT rewrite
                - Do NOT infer missing steps
                - Output ONLY raw Python code
                
                DO NOT TYPE ANYTHING OTHER THAN THE CODE
                """
            },
            {"role": "user", "content": query}
        ]
    )
    return response["message"]["content"]

def nget_step(task, current_step):
    identifiers = get_current_screen_tree()
    print(identifiers)
    response = ollama.chat(
        model="qwen3-coder:480b-cloud",
        messages=[
            {
                "role": "system",
                "content": f"""
                You are a Windows UI automation code generator for pywinauto (backend="uia").

Your job is to return executable Python code that completes EXACTLY ONE current step against the active Windows desktop window.

You are given:
1. A UI Automation WINDOW TREE (the only source of truth)
2. The OVERALL TASK
3. The CURRENT STEP

ABSOLUTE RULES:
1. Use ONLY controls that exist in the WINDOW TREE.
   - Do not invent titles, auto_id values, class names, control types, or text.
   - If no deterministic match exists, raise RuntimeError("NO_MATCH: control not found").
2. Connect with pywinauto Application(backend="uia") and use the active window metadata from the WINDOW TREE.
3. Locate controls only with window.child_window(...).
   - Do not use shorthand wrappers like window.Button(), window.Edit(), or window.ListItem().
4. Call window.set_focus() before the final interaction.
5. Call control.wait("exists visible enabled", timeout=5) before using the control.
6. Import every required module at the top.
7. Output ONLY executable Python code.
   - No markdown
   - No explanations
   - No comments
   - No prints
   - No placeholder text
   - No retry loops
   - No return statements

CONTROL SELECTION RULES:
- Use the smallest exact attribute set from the tree that uniquely identifies the control.
- If multiple similar controls exist, anchor through parent containers from the tree before selecting the final control.
- Prefer exact title, auto_id, and control_type values that actually appear in the tree.
- Never guess a control that is not grounded in the tree.

INPUT FIELD RULES:
- If CURRENT STEP asks to type, enter, fill, write, search, paste, or set text, your code MUST both:
  1. select/focus the correct input field
  2. enter the requested text in the same code block
- Extract the exact text to enter only from CURRENT STEP. If the text is missing or ambiguous, raise RuntimeError("STEP_NOT_EXECUTABLE").
- Prefer the deepest editable control grounded in the tree:
  Edit first, then editable ComboBox, then another clearly editable control only if the tree proves it.
- For text entry code, make the field active before writing:
  control.set_focus()
  control.click_input()
- Clear existing text before entering the new value.
- For standard Edit controls, prefer a direct pywinauto text method such as set_edit_text(...) or set_text(...).
- If direct text setters are not appropriate for the matched editable control, use type_keys(...) after focusing the field.
- Press Enter only if CURRENT STEP explicitly asks to submit, search, or press Enter.

NON-TEXT ACTION RULES:
- Button or MenuItem -> click_input()
- ListItem, TreeItem, or TabItem -> select() when supported, otherwise click_input()
- CheckBox -> toggle() or click_input()
- ComboBox -> use select(...) only when the exact option is clearly grounded in the tree; otherwise focus the editable part and type.

OUTPUT REQUIREMENTS:
- Complete the final action inside the generated code.
- Keep the script short and deterministic.
- If the step cannot be executed deterministically from the tree, raise RuntimeError("STEP_NOT_EXECUTABLE").

OVERALL TASK:
{task}

CURRENT STEP:
{current_step}

WINDOW TREE:
{identifiers}

                """
            },
            {"role": "user", "content": "Generate the final executable pywinauto code now."}
        ]
    )
    return response["message"]["content"]


def systemAutomationCodeGenerator(task, current_step):
    identifiers = get_current_screen_tree()
    pyautogui.screenshot("system_automation_input.png")
    code = nget_step(task, current_step)
    print(code)
    print("first code written")
    from ollama import chat

    response = ollama.generate(
    model='qwen3-coder:480b-cloud',
    prompt=f"""
                   You are a Python code fixer specialized in pywinauto field selection and text entry.

                   You will be given:
                   1. Windows UI tree in structured format: {identifiers}
                   2. Overall task: {task}
                   3. Current step: {current_step}
                   4. Python code generated by the LLM: {code}

                   Your job is to return one corrected executable Python script for the CURRENT STEP.

                   HARD RULES:
                   - Keep the code grounded in the provided UI tree.
                   - Do not invent controls, text, or selectors.
                   - Do not use pyautogui for field interaction.
                   - Do not use return statements.
                   - Do not output explanations, markdown, comments, or placeholder text.
                   - Preserve the intended text value from the CURRENT STEP exactly.
                   - The final code must perform the action, not just locate the control.

                   FIELD AND TYPING PRIORITY:
                   - If the CURRENT STEP asks to type, enter, fill, search, write, paste, or set text, the final code must:
                     1. focus the correct input control
                     2. activate/select that control
                     3. clear the previous value
                     4. enter the requested text
                   - Prefer the deepest exact editable control proven by the tree.
                   - For Edit controls, prefer:
                     window.set_focus()
                     control.wait("exists visible enabled", timeout=5)
                     control.set_focus()
                     control.click_input()
                     then set_edit_text(...) or set_text(...)
                   - If the matched editable control is better handled by keystrokes, use type_keys(...) only after focus and activation.
                   - Press Enter only if the CURRENT STEP explicitly asks for Enter, search, or submit.

                   CONTROL-TYPE FIX RULES:
                   - If control_type == "Button": use click_input()
                   - If control_type == "MenuItem": use click_input()
                   - If control_type == "ListItem": use select() when supported, otherwise click_input()
                   - If control_type == "TreeItem": use select() when supported, otherwise click_input()
                   - If control_type == "TabItem": use select() when supported, otherwise click_input()
                   - If control_type == "Edit": use set_edit_text(...) or set_text(...) after focusing and activating the field
                   - If control_type == "CheckBox": use toggle() or click_input()
                   - If control_type == "ComboBox": use select(...) only for exact visible options; if editable, focus the editable part and enter text

                   QUALITY BAR:
                   - Keep imports that are needed.
                   - Keep the app/window connection intact.
                   - Keep the code deterministic and ready to execute.
                   - If the step is not executable from the tree, raise RuntimeError("STEP_NOT_EXECUTABLE").
                   """,
    images=['system_automation_input.png']
)
    return response['response']
def get_current_screen_tree():
    """
    Returns a structured UI tree of the currently active (foreground) window.
    No input required. Version-safe.
    """

    # Get foreground window handle (Win32)
    hwnd = win32gui.GetForegroundWindow()

    # Wrap it with pywinauto
    desktop = Desktop(backend="uia")
    window = desktop.window(handle=hwnd)

    return {
        "window": {
            "title": window.element_info.name,
            "class_name": window.element_info.class_name,
            "process_id": window.element_info.process_id,
            "handle": hwnd
        },
        "tree": walk(window)
    }

def walk(element):
    info = element.element_info

    node = {
        "title": info.name,
        "control_type": info.control_type,
        "auto_id": info.automation_id,
        "class_name": info.class_name,
        "children": []
    }

    try:
        children = element.children()
    except Exception:
        children = []

    for child in children:
        node["children"].append(walk(child))

    return node


def openApplication(task):
    response = ollama.chat(
        model='qwen3.5:397b-cloud',
        messages=[
            {
                "role": "user",
                "content": f"""
                you code writer to open application using pyautogui in the given format:

                press win key, type application name, press enter
                this should happen in one go and only using pyautogui
                
                Task: {task}
                """,
            }
        ])
    
    return response['message']['content']


def codeErrorFixer(code, error):
    response = ollama.chat(
        model='qwen3-coder:480b-cloud',
        messages=[
            {
                "role": "system",
                "content": """You are a Python code debugger. Analyze the error, fix ONLY what's broken, preserve original logic. Return ONLY executable Python code, NO explanations, NO markdown."""
            },
            {
                "role": "user",
                "content": f"""ERROR:
{error}

BROKEN CODE:
{code}

Fix the code."""
            }
        ]
    )
    return response['message']['content']

def openApsDescision(step):
    response = ollama.chat(
        model='deepseek-v3.1:671b-cloud',
        messages=[
            {
                "role": "user",
                "content": f"""
                        you wiil be given a step and you have to decide if the step is asking to open an application or not. If yes then return the name of the application to be opened, if not then return "NO".
                        your answer should be in the following format:
if the step is asking to open an application:
open [application name]
if the step is not asking to open an application:
"NO"

the step is : {step}
""",
            }
        ]
    )
    return response['message']['content']

# def codeDescision(current_step):
#     response = ollama.chat(
#         model='deepseek-v3.1:671b-cloud',
#         messages=[
#             {
#                 "role": "user",

#                 "content": f"""
#                 you will be given a step 


def webClicker(task):
    import pyautogui
    pyautogui.screenshot('webclicker_input.png')
    
    response = ollama.generate(
        model='qwen3.5:397b-cloud',
        prompt=f"""
You are a screen automation assistant. Analyze the screenshot and generate Python code to click on the correct instance of the visible text: "{task}"

IMPORTANT INSTRUCTIONS:

You must use OCR (pytesseract) to detect all text along with their bounding box coordinates (x, y, width, height).
The same word may appear multiple times on the screen. You MUST NOT select randomly.
Tesseract path: r"C:\\Program Files\\Tesseract-OCR\\tesseract.exe"

SAMPLE CODE STRUCTURE:
import pyautogui import pytesseract import cv2 import numpy as np import time # set tesseract path pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe" def click_text(target_text): # take screenshot screenshot = pyautogui.screenshot() img = np.array(screenshot) img = cv2.cvtColor(img, cv2.COLOR_RGB2BGR) # improve OCR accuracy gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) thresh = cv2.threshold(gray, 150, 255, cv2.THRESH_BINARY)[1] # detect text data = pytesseract.image_to_data(thresh, output_type=pytesseract.Output.DICT) n_boxes = len(data['text']) for i in range(n_boxes): text = data['text'][i].strip() if target_text.lower() in text.lower(): x = data['left'][i] y = data['top'][i] w = data['width'][i] h = data['height'][i] center_x = x + w // 2 center_y = y + h // 2 print("Found:", text) pyautogui.moveTo(center_x, center_y, duration=0.3) pyautogui.click() return True print("Text not found") return False time.sleep(3) # time to switch window click_text("< The text to be click >")

DISAMBIGUATION RULES (VERY IMPORTANT):

When multiple instances of the same word are found:

Use visual reasoning to identify the correct target based on UI context.
Prefer text that:
Appears inside a button or clickable UI element
Is near relevant labels, icons, or sections related to the task
Is not part of a search bar, input field, or placeholder text
Use spatial reasoning:
Prefer elements closer to the center of the screen unless context suggests otherwise
Avoid elements at extreme edges or corners unless clearly relevant
Use relative positioning (top, bottom, left, right) to infer intent
Compare all candidate bounding boxes and SELECT the BEST match using (x, y) coordinates.

IMPLEMENTATION REQUIREMENTS:

Store all matching OCR results in a list of candidates with their coordinates
Apply filtering and ranking logic to select the most relevant candidate
Click ONLY the best match (center of its bounding box)
Ignore any text containing "search"

TEXT SELECTION RULE:

The text passed into the click function must be ONLY ONE WORD
Choose the most distinctive single word from "{task}" that is likely to appear in OCR

OUTPUT RULES:

Return ONLY executable Python code
Do NOT include explanations
Do NOT use markdown
""",
        images=['webclicker_input.png']
    )
    return response['response']


def hotkey(current_step):
    response = ollama.chat(
        model='deepseek-v3.1:671b-cloud',
        messages=[
            {
                "role": "system",
                "content": """TASK: Learn and use keyboard hotkeys for system and browser automation.

You are an automation assistant that controls a computer using keyboard shortcuts whenever possible. Prefer keyboard shortcuts over mouse actions because they are faster and more reliable.

Below is a structured list of important hotkeys and where they are supported. Use them whenever relevant during automation tasks.

SECTION WHATSAPP

Hotkeys :
searching names : Ctrl + f
for typing message, just start typing [for whatsapp only]
to send message just press enter key

SECTION 1 — Address Bar Navigation (Browser)
Use these to navigate to websites quickly.

Hotkeys:
* Ctrl + L → Focus address bar
* Alt + D → Focus address bar
* F6 → Cycle focus between page, address bar, and bookmarks

Supported in: Google Chrome, Microsoft Edge, Mozilla Firefox, Brave

Typical automation pattern:
Ctrl + L → type website → Enter

SECTION 2 — Universal Web-App Search Shortcut

Hotkey:
* "/" → Focus the search box inside many web applications

Common websites supporting this shortcut:
GitHub, YouTube, Reddit, StackOverflow, Wikipedia, Notion, Discord (web), Twitter / X, Slack (web)

Automation pattern:
/ → type query → Enter

SECTION 3 — Page Content Search

Hotkeys:
* Ctrl + F → Find text on page
* F3 → Next match
* Shift + F3 → Previous match

Supported in: All major browsers, VS Code, Notepad, File Explorer, PDF readers

SECTION 4 — Browser Tab Management

Hotkeys:
* Ctrl + T → Open new tab
* Ctrl + W → Close current tab
* Ctrl + Shift + T → Reopen closed tab
* Ctrl + Tab → Switch to next tab
* Ctrl + Shift + Tab → Switch to previous tab
* Ctrl + 1–8 → Jump to specific tab
* Ctrl + 9 → Go to last tab

Supported in: Chrome, Edge, Firefox, Brave

SECTION 5 — Page Navigation

Hotkeys:
* Alt + Left Arrow → Go back
* Alt + Right Arrow → Go forward
* Ctrl + R → Reload page
* Ctrl + Shift + R → Hard reload
* Esc → Stop loading

SECTION 6 — Keyboard UI Navigation

Keys:
* Tab → Move to next interactive element
* Shift + Tab → Move to previous element
* Enter → Activate selected element
* Space → Press button or scroll
* Esc → Close popups or dialogs

Supported in: Websites, Desktop applications, System dialogs

SECTION 7 — Windows System Shortcuts

Hotkeys:
* Win + S → Windows search
* Win + R → Run dialog
* Win + E → Open File Explorer
* Alt + Tab → Switch applications
* Alt + F4 → Close active window
* Win + D → Show desktop

SECTION 8 — Developer Tools

Hotkeys:
* F12 → Open DevTools
* Ctrl + Shift + I → Open DevTools
* Ctrl + Shift + C → Inspect element

Supported in: Chrome, Edge, Firefox

SECTION 9 — Important Focus Shortcuts for Automation

Prioritize these shortcuts because they directly focus input elements:
1. Ctrl + L → Focus browser address bar
2. "/" → Focus search bar in many websites
3. Ctrl + F → Find content in page
4. Tab / Shift + Tab → Navigate interface
5. Enter → Execute action
6. Esc → Exit dialogs

SECTION 10 — Preferred Automation Workflow

When performing tasks in a browser, follow this pattern when possible:
Ctrl + T → open new tab
Ctrl + L → focus address bar
type website
Enter
/ → focus search bar (if supported)
for typong message in whatsapp just start typing
type query
Enter
Ctrl + F → search page content

Use keyboard shortcuts first before attempting mouse interaction or visual detection.

OUTPUT FORMAT:
Return ONLY Python code using pyautogui to execute the hotkeys. No explanations."""
            },
            {
                "role": "user",
                "content": f"Generate pyautogui code for this step: {current_step}"
            }
        ]
    )
    return response['message']['content']
