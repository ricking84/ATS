import tkinter as tk
import requests
# from PIL import Image, ImageTk
# blah

HEIGHT = 500
WIDTH = 600

app = tk.Tk()
canvas = tk.Canvas(app, height = HEIGHT, width = WIDTH)
canvas.pack()

frame = tk.Frame(app, bg='#80c1ff')
frame.place(relx= 0.1, rely= 0.1, relwidth =0.8, relheight=0.8)

frameButton = tk.Button(frame, text='FrameButton', bg='red', fg='black')
frameButton.pack(side='left')

button = tk.Button(app, text="Test Button", bg='gray', fg='red')
button.pack()

label = tk.Label(frame, text='Hello World', bg='white')
label.pack()

entry = tk.Entry(frame, bg='yellow')
entry.pack()

app.mainloop()
WIDTH = 600

app = tk.Tk()
canvas = tk.Canvas(app, height = HEIGHT, width = WIDTH)
canvas.pack()

frame = tk.Frame(app, bg='#80c1ff')
frame.place(relx= 0.1, rely= 0.1, relwidth =0.8, relheight=0.8)

frameButton = tk.Button(frame, text='FrameButton', bg='red', fg='black')
frameButton.pack(side='left')

button = tk.Button(app, text="Test Button", bg='gray', fg='red')
button.pack()

label = tk.Label(frame, text='Hello World', bg='white')
label.pack()

entry = tk.Entry(frame, bg='yellow')
entry.pack()

app.mainloop()