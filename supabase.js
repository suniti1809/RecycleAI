const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Load environment variables if available
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_lFBz0rh1NB4fRsZJT6dNZQ_NUZUzWFZ';

let supabase = null;

if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });
    console.log('[Supabase] Initialized client for:', supabaseUrl);
  } catch (err) {
    console.warn('[Supabase] Initialization error:', err.message);
  }
} else {
  console.log('[Supabase] Supabase URL not provided yet. Local storage fallback will be active.');
}

let bucketsChecked = false;
async function ensureBucketsExist() {
  if (bucketsChecked || !supabase) return;
  try {
    // Attempt to create public buckets if service role key allows
    await supabase.storage.createBucket('ewaste-images', { public: true }).catch(() => {});
    await supabase.storage.createBucket('ewaste-media', { public: true }).catch(() => {});
    bucketsChecked = true;
  } catch (e) {}
}

/**
 * Upload an image or video buffer to Supabase Storage (bucket: 'ewaste-media' / 'ewaste-images')
 * Falls back to local disk storage if Supabase is not configured or fails.
 */
async function uploadMedia(fileBuffer, originalFilename, mimeType = 'image/jpeg') {
  const ext = path.extname(originalFilename) || (mimeType.startsWith('video/') ? '.mp4' : '.jpg');
  const cleanFilename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;

  // If Supabase is connected, attempt cloud upload
  if (supabase && supabaseUrl) {
    try {
      await ensureBucketsExist();
      const bucketName = mimeType.startsWith('video/') ? 'ewaste-media' : 'ewaste-images';
      
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(cleanFilename, fileBuffer, {
          contentType: mimeType,
          upsert: true
        });

      if (!error && data) {
        const { data: publicUrlData } = supabase.storage
          .from(bucketName)
          .getPublicUrl(cleanFilename);

        console.log('[Supabase Storage] ✅ Uploaded media to Supabase Cloud Storage:', publicUrlData?.publicUrl);
        return {
          success: true,
          storageType: 'supabase',
          url: publicUrlData.publicUrl,
          filename: cleanFilename,
          mimeType,
          fileSize: fileBuffer.length
        };
      } else if (error) {
        console.warn(`[Supabase Storage] ⚠️ Cloud upload error: ${error.message} (Bucket: '${bucketName}'). Using local fallback.`);
      }
    } catch (e) {
      console.warn('[Supabase Storage] ⚠️ Cloud upload exception:', e.message, '- Using local fallback.');
    }
  }

  // Local fallback: save to uploads directory
  const uploadsDir = path.join(__dirname, 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const filePath = path.join(uploadsDir, cleanFilename);
  fs.writeFileSync(filePath, fileBuffer);

  const localUrl = `/uploads/${cleanFilename}`;
  return {
    success: true,
    storageType: 'local',
    url: localUrl,
    filename: cleanFilename,
    localPath: filePath,
    mimeType,
    fileSize: fileBuffer.length
  };
}

module.exports = {
  supabase,
  uploadMedia,
  uploadImage: uploadMedia, // Backwards compatible alias
  isSupabaseConfigured: () => !!(supabase && supabaseUrl)
};
