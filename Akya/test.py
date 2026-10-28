import pytesseract
import cv2
import pyautogui
import time

# 1. Setup: You might need to specify the tesseract path if on Windows
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

def click_right_button():
    # Take a screenshot of the current screen
    # If you have the image saved as a file, use: img = cv2.imread('your_image.png')
    screenshot = pyautogui.screenshot()
    
    # Convert screenshot to OpenCV format (numpy array)
    import numpy as np
    img = cv2.cvtColor(np.array(screenshot), cv2.COLOR_RGB2BGR)

    # 2. Perform OCR
    # output_type=pytesseract.Output.DICT gives us a dictionary with 'text', 'left', 'top', etc.
    data = pytesseract.image_to_data(img, output_type=pytesseract.Output.DICT)

    n_boxes = len(data['text'])
    matches = []

    # 3. Find all matches for "BUTTON"
    for i in range(n_boxes):
        # Optional: Filter out low confidence results (noise)
        if int(data['conf'][i]) > 50: 
            text = data['text'][i].strip()
            
            # Check if text contains "BUTTON" (case insensitive)
            if "BUTTON" in text.upper():
                x = data['left'][i]
                y = data['top'][i]
                w = data['width'][i]
                h = data['height'][i]
                
                # Save the box details
                matches.append({'x': x, 'y': y, 'w': w, 'h': h})
                print(f"Found 'BUTTON' at x={x}, y={y}")

    # 4. Logic to pick the RIGHT button
    if matches:
        # Sort matches by 'x' coordinate. 
        # The item with the highest 'x' value is the furthest to the right.
        rightmost_box = max(matches, key=lambda k: k['x'])
        
        x = rightmost_box['x']
        y = rightmost_box['y']
        w = rightmost_box['w']
        h = rightmost_box['h']

        center_x = x + w // 2
        center_y = y + h // 2

        print(f"Clicking Right Button at: {center_x}, {center_y}")
        
        # Move and Click
        pyautogui.moveTo(center_x, center_y, duration=0.5)
        pyautogui.click()
        return True
    else:
        print("Text 'BUTTON' not found")
        return False

# Wait a moment to let you switch windows if necessary
time.sleep(2) 
click_right_button()
