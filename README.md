# BigQuery Release Radar 📡

A modern Flask-based web application designed to fetch, structure, filter, and share the official Google Cloud BigQuery release notes. It splits combined daily release entries into granular update cards, automatically categorizes them by type, and features a custom Twitter (X) composer to share updates directly.

![Aesthetic](https://img.shields.io/badge/Aesthetics-Premium-blueviolet)
![Tech Stack](https://img.shields.io/badge/Stack-Python%20%7C%20Flask%20%7C%20Vanilla%20JS-blue)
![License](https://img.shields.io/badge/License-MIT-green)

---

## ✨ Features

- **Daily Release Chunking**: Splits composite daily release notes into distinct, manageable update cards.
- **Categorization Badges**: Updates are color-tagged automatically (*Feature*, *Issue*, *Announcement*, *Deprecation*, *General*).
- **Search & Filters**: Instantly search updates by keywords or filter by release category.
- **Twitter / X Integration**:
  - **Single Share**: Draft and customize a formatted tweet under 280 characters for any specific update.
  - **Multi-Select Compiler**: Select multiple updates using checkboxes to generate a bulleted summary tweet.
- **Aesthetic Dark Mode**: Glassmorphic UI components, smooth hover state animations, and a responsive grid layout.
- **In-Memory Caching**: Minimizes upstream traffic to Google Cloud and speeds up page loads.

---

## 📁 Project Structure

```
├── app.py                  # Flask backend server (feed parsing & API routes)
├── templates/
│   └── index.html          # Semantic HTML dashboard template
├── static/
│   ├── style.css           # Styling system & dark theme tokens
│   └── script.js           # Frontend client controller & Twitter API helper
├── requirements.txt        # Python dependencies list
└── .gitignore              # Files excluded from git tracking
```

---

## 🛠️ Installation & Setup

### Prerequisites
- Python 3.8 or higher
- Git

### 1. Clone the repository
```bash
git clone https://github.com/imranbhatt1977/antigravity-event-talks-app.git
cd antigravity-event-talks-app
```

### 2. Create a virtual environment
```bash
# Windows
python -m venv .venv

# macOS / Linux
python3 -m venv .venv
```

### 3. Activate the environment
```bash
# Windows (PowerShell)
.venv\Scripts\Activate.ps1

# Windows (Command Prompt)
.venv\Scripts\activate.bat

# macOS / Linux
source .venv/bin/activate
```

### 4. Install dependencies
```bash
pip install -r requirements.txt
```

---

## 🚀 Running the Application

Start the local Flask development server:
```bash
# With virtual environment active
python app.py
```

Open your browser and navigate to:
👉 **http://127.0.0.1:5000**

---

## 📝 How it Works

1. **Sync Feed**: The refresh button calls the `/api/releases?refresh=true` endpoint, forcing Flask to fetch the latest XML feed from Google, parse it, update the local cache, and animate the spinner.
2. **Text Parsing**: Flask parses the HTML feed content, splitting updates by `<h3>` tags to extract individual headings as categorized metadata.
3. **Draft Tweet**: Clicking **"Tweet This"** strips HTML tags, truncates description text, calculates remaining Twitter character budget (taking into account Twitter's 23-character count for URL parameters), and prepares the Web Intent URL:
   `https://twitter.com/intent/tweet?text=<encoded_text>&url=<encoded_link>`

---

## 🤝 Contributing
Feel free to open issues or submit pull requests for style enhancements or extra feed integrations!
