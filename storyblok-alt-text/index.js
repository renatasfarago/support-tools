import axios from "axios";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

// ----------------------
// Environment variables
// ----------------------
const TOKEN = process.env.STORYBLOK_TOKEN;
const SPACE_ID = process.env.SPACE_ID;
const ASSETS_LIMIT = process.env.ASSETS_LIMIT ? Number(process.env.ASSETS_LIMIT) : null;
const DRY_RUN = process.env.DRY_RUN === "true";

// ----------------------
// App API (Australia region)
// ----------------------
const APP_API = "https://api-ap.storyblok.com/v1";

// ----------------------
// Axios client
// ----------------------
const client = axios.create({
  baseURL: APP_API,
  headers: {
    Authorization: TOKEN,
    "Content-Type": "application/json",
  },
});

// ----------------------
// Fetch all assets (paginated)
// ----------------------
async function fetchAllAssets() {
  let assets = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const res = await client.get(`/spaces/${SPACE_ID}/assets`, {
      params: { page, per_page: perPage },
    });

    assets.push(...res.data.assets);

    if (res.data.assets.length < perPage) break;
    page++;
  }

  return assets;
}

// ----------------------
// Filter assets: no alt & not deleted
// ----------------------
function filterAssetsWithoutAlt(assets) {
  return assets.filter(
    (a) => a.deleted_at === null && (!a.alt || a.alt.trim() === "")
  );
}

// ----------------------
// Fetch single asset
// ----------------------
async function fetchAsset(assetId) {
  const res = await client.get(`/spaces/${SPACE_ID}/assets/${assetId}`);
  return res.data;
}

// ----------------------
// Generate alt text via AI
// ----------------------
async function generateAltText(asset) {
  const res = await client.post(
    `/spaces/${SPACE_ID}/assets/${asset.id}/generate_image_alt_text`,
    asset
  );
  return res.data.response; // AI-generated alt text
}

// ----------------------
// Update asset with new alt
// ----------------------
async function updateAsset(asset, newAlt) {
  const updatedAsset = {
    ...asset,
    alt: newAlt,
    meta_data: {
      ...asset.meta_data,
      alt: newAlt,
    },
  };

  if (!DRY_RUN) {
    await client.put(`/spaces/${SPACE_ID}/assets/${asset.id}`, {
      asset: updatedAsset,
    });
  }
}

// ----------------------
// Process a single asset with retries
// ----------------------
async function processAsset(asset, retries = 3) {
  try {
    if (asset.deleted_at !== null) {
      return { id: asset.id, short_filename: asset.short_filename, status: "skipped_deleted" };
    }

    const fullAsset = await fetchAsset(asset.id);

    const newAlt = await generateAltText(fullAsset);

    if (!newAlt || newAlt.trim() === "") {
      return { id: asset.id, short_filename: asset.short_filename, status: "no_alt_generated" };
    }

    await updateAsset(fullAsset, newAlt);

    return { id: asset.id, short_filename: asset.short_filename, status: "success", alt: newAlt };
  } catch (err) {
    if (retries > 0) {
      await new Promise((r) => setTimeout(r, 1000));
      return processAsset(asset, retries - 1);
    } else {
      return { id: asset.id, short_filename: asset.short_filename, status: "error", error: err.message };
    }
  }
}

// ----------------------
// Main runner
// ----------------------
async function run() {
  try {
    console.log("🔍 Fetching all assets...");
    const allAssets = await fetchAllAssets();
    const assetsWithoutAlt = filterAssetsWithoutAlt(allAssets);

    const assetsToProcess = ASSETS_LIMIT
      ? assetsWithoutAlt.slice(0, ASSETS_LIMIT)
      : assetsWithoutAlt;

    console.log(
      `🖼️ Processing ${assetsToProcess.length} of ${assetsWithoutAlt.length} assets without alt`
    );

    const results = [];

    for (let i = 0; i < assetsToProcess.length; i++) {
      const asset = assetsToProcess[i];
      console.log(`✨ Processing ${i + 1}/${assetsToProcess.length} - ID: ${asset.id}, File: ${asset.short_filename}`);
      const result = await processAsset(asset);
      results.push(result);

      // Small delay to avoid hitting rate limits
      await new Promise((r) => setTimeout(r, 800));
    }

    // Save report
    const reportPath = `assets_report_${Date.now()}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));

    console.log(`📄 Report saved: ${reportPath}`);
    console.log("🎉 All done!");
  } catch (err) {
    console.error("❌ Fatal error:", err.response?.data || err.message);
  }
}

run();
