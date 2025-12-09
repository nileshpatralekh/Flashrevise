# FlashRevise ⚡️

A premium, mobile-first Flashcard PWA for revision.
Built with **React**, **Tailwind CSS**, and **Zustand** using a **No-Build Architecture**.

## 🚀 Quick Start (Local)

You can run this project immediately with Python (pre-installed on macOS/Linux):

```bash
python3 -m http.server 8000
```

Open [http://localhost:8000](http://localhost:8000) in your browser.

## 🌐 Deploy to GitHub Pages (Recommended)

Host this app for free so you can access it on your phone without cables or IP addresses.

1.  **Create a Repository** on GitHub.
2.  **Push** this code:
    ```bash
    git init
    git add .
    git commit -m "Initial commit"
    git branch -M main
    git remote add origin <YOUR_GITHUB_REPO_URL>
    git push -u origin main
    ```
3.  **Enable Pages**:
    -   Go to your Repository **Settings** -> **Pages**.
    -   Under **Source**, select `main` branch and `/ (root)` folder.
    -   Click **Save**.
4.  **Done!** Your app will be live at `https://<your-username>.github.io/<repo-name>/`.

## 📱 Install on Android

Once deployed (or running locally):
1.  Open the URL in **Chrome** on Android.
2.  Tap the **Three Dots Menu** (⋮).
3.  Tap **Add to Home Screen** (or "Install App").
4.  Launch it from your home screen like a native app!

## 🛠️ Tech Stack
-   **No-Build**: ES Modules via CDN (esm.sh).
-   **Framework**: React 18.
-   **State**: Zustand (with LocalStorage persistence).
-   **Styling**: Tailwind CSS.
