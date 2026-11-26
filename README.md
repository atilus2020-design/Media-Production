# AI Photo Editor

A browser-based photo editor: upload a photo, describe an edit in plain English ("make the sky a sunset"), and get an AI-edited version back. It also has Photoshop-style manual tools: layers, adjustments, brushes, text, and shapes.

**Stack:** React + Vite + TypeScript · Tailwind CSS · Konva (canvas engine) · Netlify Functions (serverless backend) · OpenAI image edit API (behind a swappable adapter)

---

## Build status

| Phase | What | Status |
|---|---|---|
| 1 | Project setup, landing page, upload, canvas display, zoom/pan, Netlify config | ✅ Done |
| 2 | AI prompt editing via a Netlify Function, before/after slider | ⏳ Next |
| 3 | Layers, undo/redo, crop/rotate, adjustments, filters | |
| 4 | Brush, eraser, text, shapes, selection + masked AI edits | |
| 5 | Export, polish, shortcuts, error handling, rate limiting | |

---

## Why these choices?

- **Konva instead of Fabric.js.** Konva's `Stage → Layer → Group` structure maps directly onto a Photoshop-style layers panel. A brush stroke is a `Line`, and an eraser is the same line drawn with `destination-out`, so erasing works per layer. It has built-in filters (brightness, contrast, HSL, blur, sepia, grayscale, invert), and `react-konva` lets React state drive the canvas, which makes undo/redo simple.
- **OpenAI image edits.** The API accepts an image, a prompt, **and a mask**. The mask is what makes "edit only my selection" possible in Phase 4. Gemini (Nano Banana) and FLUX Kontext edit well but take no mask. The integration sits behind an adapter so you can switch providers later.
- **Netlify Functions.** Your API key lives only on the server. The browser calls `/api/...`, the function adds the key, and the key never appears in frontend code.

---

## Project structure

```
├── netlify.toml               # Netlify build + redirect config
├── netlify/functions/         # Serverless backend (the API key is only used here)
│   └── health.ts              # GET /api/health: "is the backend alive?"
├── src/
│   ├── main.tsx               # App entry point
│   ├── App.tsx                # Routes: / (landing) and /editor
│   ├── index.css              # Tailwind + dark theme color tokens
│   ├── pages/
│   │   ├── Landing.tsx        # Landing page with "Start Editing"
│   │   └── Editor.tsx         # Editor layout, file loading, shortcuts
│   ├── components/editor/
│   │   ├── MenuBar.tsx        # Top menu (File / Edit / View)
│   │   ├── Toolbar.tsx        # Left tool bar
│   │   ├── CanvasStage.tsx    # Konva canvas with zoom & pan
│   │   ├── RightPanel.tsx     # AI / Layers / Properties panels
│   │   └── UploadDropzone.tsx # Empty-state upload target
│   └── lib/
│       ├── image.ts           # Upload validation, decoding, auto-resize
│       └── viewport.ts        # Zoom/pan math
├── .env.example               # Template for your local secrets file
└── .gitignore                 # Includes .env, so secrets are never committed
```

---

## Setup (beginner-friendly)

### 1. Install the tools (one time)

- **Node.js 22 or newer**: download the LTS version from <https://nodejs.org>. Check it worked:

  ```bash
  node -v
  ```

- **Git**: <https://git-scm.com/downloads>
- **Netlify CLI** (optional, needed to run the backend locally from Phase 2 on):

  ```bash
  npm install -g netlify-cli
  ```

### 2. Get the code

```bash
git clone https://github.com/atilus2020-design/Media-Production.git
```

```bash
cd Media-Production
```

### 3. Install dependencies

```bash
npm install
```

### 4. Add your API key (needed from Phase 2)

Copy the template to a real `.env` file:

```bash
cp .env.example .env
```

(On Windows PowerShell: `Copy-Item .env.example .env`)

Open `.env` in your editor and replace `sk-your-key-here` with your key from <https://platform.openai.com/api-keys>.

> 🔒 `.env` is listed in `.gitignore`, so Git will never upload it. Never paste your key into any file under `src/`: everything there is sent to visitors' browsers.

### 5. Run it locally

**Frontend only** (all Phase 1 needs):

```bash
npm run dev
```

Open <http://localhost:5173>.

**Frontend + serverless functions** (use this from Phase 2 on):

```bash
netlify dev
```

Open <http://localhost:8888>. Check the backend at <http://localhost:8888/api/health>.

### 6. Other useful commands

```bash
npm run build     # type-check + production build into dist/
```

```bash
npm run lint      # check code for common mistakes
```

```bash
npm run preview   # serve the production build locally
```

---

## Deploy to Netlify (auto-deploy from GitHub)

You do this once. After that, every `git push` redeploys automatically.

1. Log in at <https://app.netlify.com>.
2. Click **Add new project → Import an existing project**.
3. Choose **GitHub** and authorize Netlify if asked.
4. Pick the **Media-Production** repository.
5. Netlify reads `netlify.toml`, so the settings fill in automatically:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Functions directory: `netlify/functions`
6. **Branch to deploy:** pick the branch that has the code (`main` once the work is merged; see the note below).
7. Click **Deploy**. After a minute or two you get a URL like `https://something.netlify.app`.

### Add your API key to Netlify

1. In your Netlify project go to **Project configuration → Environment variables**.
2. Click **Add a variable**. Key: `OPENAI_API_KEY`, value: your key. Leave **Secret** checked if offered, and make it available to **Functions**.
3. Go to **Deploys → Trigger deploy → Deploy site** so the new variable is picked up.
4. Visit `https://<your-site>.netlify.app/api/health`. It should say `"aiKeyConfigured": true`.

### Branches & deploys

Netlify deploys your **production branch** (usually `main`) to the main URL. To ship work from another branch, merge it into `main` (for example with a pull request on GitHub). Netlify can also build **deploy previews** for pull requests, so you can test before merging.

---

## Troubleshooting

- **"Page not found" when refreshing `/editor` on Netlify:** the `[[redirects]]` rule in `netlify.toml` handles this. Make sure the file is committed.
- **`aiKeyConfigured: false`:** the variable name must be exactly `OPENAI_API_KEY`, and you must redeploy after adding it.
- **Image rejected:** only JPG/PNG/WEBP under 10 MB are accepted. Images larger than 4096px on a side are automatically scaled down.
