# Storyblok AI Alt Text Generator

A Node.js script to automatically generate **alt text** for images stored in [Storyblok CMS](https://www.storyblok.com/).  
It uses the Storyblok API to fetch all assets, filter those without alt text, and generate descriptions via Storyblok's AI functionality.

---

## 🔹 Features

- Fetch all assets from a Storyblok space.
- Filter images without `alt text` or marked as deleted.
- Generate alt text automatically using Storyblok's AI.
- Update assets with the generated alt text.
- Generate a detailed JSON report of the process.
- Supports **DRY RUN** mode to test without making changes.

---

## ⚙️ Prerequisites

- Node.js >= 18
- npm or yarn
- Storyblok account with a **Personal Access Token**
- A Storyblok space containing image assets

---

## 📦 Installation

1. Clone the repository or download the script:

```bash
git clone <your-repo-url>
cd <project-folder>

2. Install dependencies:

npm install
# or
yarn install


3. Create a .env file in the root folder with the following variables:

STORYBLOK_TOKEN=Your_Personal_Access_Token
SPACE_ID=Your_Space_ID
ASSETS_LIMIT= # optional — if empty, process all assets
BATCH_SIZE=5  # number of assets to process in parallel (recommended: 5)
DRY_RUN=false # true to simulate without updating assets

Run the script:

node index.js

