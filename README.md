# 💧 Smart Water Conservation Assistant
### **Subject:** Agentic AI and Automation
**A Simple, Intuitive Project Powered by Google Gemini and Automated Valve Control**

[![Live Demo](https://img.shields.io/badge/Live_Demo-rahulnarwade07.github.io%2FFLEXI-0284c7?style=for-the-badge&logo=githubpages&logoColor=white)](https://rahulnarwade07.github.io/FLEXI/)
[![Repository](https://img.shields.io/badge/GitHub-RAHULNARWADE07%2FFLEXI-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/RAHULNARWADE07/FLEXI)

---

## 🎯 What is this Project? (In 2 Minutes)

Traditional water meters only display how much water you used. They cannot stop leaks.
This project creates a **Smart Water Conservation Assistant** using **Agentic AI**:
1. **Sensors** continuously monitor water flow rate.
2. If an abnormal pipe burst or leak occurs (flow spikes to 85 L/min), the **AI Agent** wakes up.
3. The Agent uses **Google Gemini AI** to inspect the sensor reading, diagnose the severity, and formulate a decision: *"Pipe burst detected. Close valve to stop water loss."*
4. The **Automation Agent** immediately closes the smart water valve automatically, stopping water wastage without needing a human to turn it off manually!

---

## 🤖 The 3-Step Agentic AI Workflow

```
[ 1. SENSOR MONITOR AGENT ] 
       │ (Detects abnormal flow spike: 85 L/min)
       ▼
[ 2. GEMINI DECISION AGENT ] 
       │ (Analyzes situation: "Catastrophic pipe leak. Action: Close Valve.")
       ▼
[ 3. AUTOMATION AGENT ] 
       │ (Autonomously closes Smart Valve, stopping water waste!)
       ▼
[ WATER SAVED! (~500 Liters Conserved) ]
```

---

## 🚀 How to Run the Project

### Step 1: Open Terminal in the folder
```bash
cd "c:\Users\Devan\OneDrive\Desktop\FLEXI RAHUL"
```

### Step 2: Start the application
```bash
node server.js
```

### Step 3: Open in your Browser
👉 Go to: **[http://localhost:3000](http://localhost:3000)**

---

## 🎮 How to Demonstrate (Viva / Demo Walkthrough)

On the dashboard screen, follow these 3 simple clicks:

1. **Click "1. Simulate Pipe Leak"**:
   - The flow rate instantly spikes to **85 L/min** (Red Alert).
   - The tank water starts depleting rapidly.
2. **Click "2. Auto-Fix with AI Agent"**:
   - The Gemini Agent reads the sensor reading.
   - It outputs its reasoning: *"Severe pipe rupture identified. ACTION: CLOSE VALVE."*
   - The **smart valve automatically closes** to `CLOSED` and flow drops to 0 L/min!
   - 500 Liters of water is saved!
3. **Click "3. Reset to Normal"**:
   - Restores normal steady flow (20 L/min).
4. **Try the Chatbot (Bottom of page)**:
   - Ask: *"How can I save water at home?"*
   - Gemini answers with friendly, practical water conservation tips!

---

## 🔑 Adding your Gemini API Key (Optional)

- The project works **100% out of the box** even without an API key using built-in smart AI reasoning.
- To connect your real Google Gemini key:
  1. Paste your key in the top header input box and click **"Connect Gemini"**.
  2. Or add it to [.env](file:///c:/Users/Devan/OneDrive/Desktop/FLEXI%20RAHUL/.env):
     ```env
     GEMINI_API_KEY=AIzaSy...
     ```

---

## 📁 Clean Code Structure

- [server.js](file:///c:/Users/Devan/OneDrive/Desktop/FLEXI%20RAHUL/server.js) — ~150 lines: Express server + Gemini Agent logic + Simulation loop
- [public/index.html](file:///c:/Users/Devan/OneDrive/Desktop/FLEXI%20RAHUL/public/index.html) — Single clean, modern webpage
- [public/style.css](file:///c:/Users/Devan/OneDrive/Desktop/FLEXI%20RAHUL/public/style.css) — Clean modern design
- [public/app.js](file:///c:/Users/Devan/OneDrive/Desktop/FLEXI%20RAHUL/public/app.js) — Straightforward frontend logic and polling
- [.env](file:///c:/Users/Devan/OneDrive/Desktop/FLEXI%20RAHUL/.env) — API key configuration
