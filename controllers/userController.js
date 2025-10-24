const express = require('express');
const router = express.Router();
const Gazetted = require('../models/EmployeeGaz');
const NonGazetted = require('../models/EmployeeNonGaz');

// Get user applications
router.get('/applications/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Check both gazetted and non-gazetted collections
    const gazettedApps = await Gazetted.find({ userId });
    const nonGazettedApps = await NonGazetted.find({ userId });
    
    res.json({
      success: true,
      data: {
        gazetted: gazettedApps,
        nonGazetted: nonGazettedApps
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

module.exports = router;