const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const { spawn } = require('child_process');
const { getPrice } = require('../utils/pricer');
const { uploadImage } = require('../supabase');
const { generateRecyclingAdvice } = require('../services/advisor');
const { Valuation } = require('../models');

const router = express.Router();

// Memory storage for multer so we can directly pass the buffer to Supabase / local uploader
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPG, PNG, WEBP) are supported'));
    }
  }
});

// Resolve model path — looks in backend/models/ then backend/
function resolveModelPath() {
  const candidates = [
    path.join(__dirname, '..', 'models', 'model.pt'),
    path.join(__dirname, '..', 'model.pt'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

router.post('/', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image file provided' });

  const condition = req.body.condition || 'poor';
  const itemName = req.body.item_name || '';
  const notes = req.body.notes || '';
  const modelPath = resolveModelPath();

  if (!modelPath) {
    return res.status(500).json({
      error: 'AI model file (model.pt) not found. Place it in backend/ or backend/models/.',
    });
  }

  // 1. Persist the image to Supabase Storage (with automatic local disk fallback)
  let storedMedia;
  try {
    storedMedia = await uploadImage(req.file.buffer, req.file.originalname, req.file.mimetype);
  } catch (err) {
    console.error('[Classify] Image persistence failed:', err);
    return res.status(500).json({ error: 'Failed to persist uploaded image.' });
  }

  // 2. Temporarily write buffer to disk for python child process if needed
  const tempDiskPath = storedMedia.localPath || path.join(__dirname, '..', 'uploads', `temp-${Date.now()}-${req.file.originalname}`);
  if (!storedMedia.localPath) {
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    fs.writeFileSync(tempDiskPath, req.file.buffer);
  }

  const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
  const scriptPath = path.join(__dirname, '..', 'classifier_bridge.py');

  const proc = spawn(pythonCmd, [scriptPath, '--image', tempDiskPath, '--model', modelPath]);

  let stdout = '';
  let stderr = '';

  proc.stdout.on('data', (d) => { stdout += d.toString(); });
  proc.stderr.on('data', (d) => { stderr += d.toString(); });

  proc.on('close', async (code) => {
    // If we created a temporary file separate from permanent uploads, clean it up
    if (!storedMedia.localPath && fs.existsSync(tempDiskPath)) {
      fs.unlink(tempDiskPath, () => {});
    }

    try {
      const jsonStart = stdout.indexOf('{');
      const jsonEnd   = stdout.lastIndexOf('}');
      if (jsonStart === -1 || jsonEnd === -1) {
        console.error('[Classify] No JSON in stdout:', stdout, '| stderr:', stderr);
        return res.status(500).json({ error: 'AI bridge returned no valid JSON. Check server logs.' });
      }

      const result = JSON.parse(stdout.substring(jsonStart, jsonEnd + 1));

      if (!result.success) {
        return res.status(500).json({ error: result.error || 'AI Classification failed.' });
      }

      const detectedClass = result.class_name;
      const valuation = getPrice(detectedClass, condition);

      // 3. Invoke AI Recycling Advisor
      const advice = await generateRecyclingAdvice({
        detected_class: detectedClass,
        confidence: result.confidence,
        condition,
        item_name: itemName,
        notes
      });

      // 4. Save Valuation in database if user is authenticated or session is present
      let valuationRecord = null;
      try {
        const userId = req.user ? req.user.id : null;
        valuationRecord = await Valuation.create({
          user_id: userId,
          item_name: itemName || detectedClass.replace(/_/g, ' '),
          item_category: detectedClass,
          confidence: result.confidence,
          detected_class: detectedClass,
          image_path: storedMedia.url,
          condition,
          min_value: valuation.min_value,
          max_value: valuation.max_value,
          estimated_value: valuation.estimated_value
        });
      } catch (dbErr) {
        console.warn('[Classify] Could not save valuation record to DB:', dbErr.message);
      }

      return res.json({
        ...result,
        label: detectedClass.replace(/_/g, ' '),
        image_url: storedMedia.url,
        filename: storedMedia.filename,
        storage_type: storedMedia.storageType,
        valuation_id: valuationRecord ? valuationRecord.id : null,
        valuation,
        advice
      });
    } catch (e) {
      console.error('[Classify] Parse error:', e);
      return res.status(500).json({ error: 'Failed to parse AI classification result.' });
    }
  });

  proc.on('error', (err) => {
    if (!storedMedia.localPath && fs.existsSync(tempDiskPath)) {
      fs.unlink(tempDiskPath, () => {});
    }
    console.error('[Classify] spawn error:', err);
    return res.status(500).json({
      error: `Could not start Python process: ${err.message}. Ensure Python is installed.`,
    });
  });
});

module.exports = router;
