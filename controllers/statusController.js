const express = require('express');
const router = express.Router();
const Gazetted = require('../models/EmployeeGaz');
const NonGazetted = require('../models/EmployeeNonGaz');

// Check Gazetted application status
router.post('/gazetted', async (req, res) => {
  try {
    const { applicationId, dob } = req.body;
    
    if (!applicationId || !dob) {
      return res.status(400).json({
        success: false,
        error: 'Application ID and Date of Birth are required'
      });
    }

    const record = await Gazetted.findOne({ 
      $or: [
        { _id: applicationId, dob },
        { ruid: applicationId, dob } // Also allow searching by RUID
      ]
    });
    
    if (!record) {
      return res.status(404).json({ 
        success: false, 
        error: 'No application found with the provided details' 
      });
    }
    
    res.json({ 
      success: true, 
      data: record 
    });
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Internal server error' 
    });
  }
});

// Check Non-Gazetted application status
router.post('/non-gazetted', async (req, res) => {
  try {
    const { applicationId, dob } = req.body;
    
    if (!applicationId || !dob) {
      return res.status(400).json({
        success: false,
        error: 'Application ID and Date of Birth are required'
      });
    }

    const record = await NonGazetted.findOne({ 
      $or: [
        { _id: applicationId, dob },
        { empNo: applicationId, dob } // Also allow searching by Employee No
      ]
    });
    
    if (!record) {
      return res.status(404).json({ 
        success: false, 
        error: 'No application found with the provided details' 
      });
    }
    
    res.json({ 
      success: true, 
      data: record 
    });
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Internal server error' 
    });
  }
});

// Get application by ID (for direct links)
router.get('/:type/:id', async (req, res) => {
  try {
    const { type, id } = req.params;
    
    let record;
    if (type === 'gazetted') {
      record = await Gazetted.findById(id);
    } else if (type === 'non-gazetted') {
      record = await NonGazetted.findById(id);
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid application type'
      });
    }
    
    if (!record) {
      return res.status(404).json({ 
        success: false, 
        error: 'Application not found' 
      });
    }
    
    res.json({ 
      success: true, 
      data: record 
    });
  } catch (error) {
    console.error('Application fetch error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Internal server error' 
    });
  }
});

module.exports = router;