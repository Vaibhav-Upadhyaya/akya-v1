import cv2
from chatBot import webcamAutomation

def Capture(query):
    photo = cv2.VideoCapture(0)
    ret, frame = photo.read()
    cv2.imwrite("photo.jpg", frame)
    photo.release()
    return webcamAutomation(query)
    