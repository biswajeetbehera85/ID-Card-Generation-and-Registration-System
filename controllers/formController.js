const express = require('express');
const router = express.Router();
const { upload, handleUploadErrors } = require('../middleware/upload');
const Gazetted = require('../models/EmployeeGaz');
const NonGazetted = require('../models/EmployeeNonGaz');

// Gazetted Employee Form Submission
router.post('/gazetted', 
  upload.fields([
    { name: 'photo', maxCount: 1 },
    { name: 'sign', maxCount: 1 },
    { name: 'hindiName', maxCount: 1 },
    { name: 'hindiDesig', maxCount: 1 }
  ]), 
  handleUploadErrors, 
  async (req, res) => {
    try {
      const { userId, name, ruid, designation, department, station, billUnit, dob, mobile, address, reason, emergencyContactName, emergencyContactNumber, family } = req.body;
      
      const entryData = {
        userId,
        name,
        ruid,
        designation,
        department,
        station,
        billUnit,
        dob,
        mobile,
        address,
        reason,
        emergencyContactName,
        emergencyContactNumber,
        family: family ? JSON.parse(family) : [],
        photo: req.files?.photo?.[0]?.filename || null,
        sign: req.files?.sign?.[0]?.filename || null,
        hindiName: req.files?.hindiName?.[0]?.filename || null,
        hindiDesig: req.files?.hindiDesig?.[0]?.filename || null,
        status: 'Pending'
      };

      const entry = new Gazetted(entryData);
      await entry.validate();
      const savedEntry = await entry.save();
      
      res.json({ 
        success: true, 
        message: 'Gazetted employee application submitted successfully',
        id: savedEntry._id
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
});

// Non-Gazetted Employee Form Submission
router.post('/non-gazetted', 
  upload.fields([
    { name: 'photo', maxCount: 1 },
    { name: 'sign', maxCount: 1 }
  ]), 
  handleUploadErrors, 
  async (req, res) => {
    try {
      const { userId, name, empNo, designation, department, station, billUnit, dob, mobile, address, reason, emergencyContactName, emergencyContactNumber, family } = req.body;
      
      const entryData = {
        userId,
        name,
        empNo,
        designation,
        department,
        station,
        billUnit,
        dob,
        mobile,
        address,
        reason,
        emergencyContactName,
        emergencyContactNumber,
        family: family ? JSON.parse(family) : [],
        photo: req.files?.photo?.[0]?.filename || null,
        sign: req.files?.sign?.[0]?.filename || null,
        status: 'Pending'
      };

      const entry = new NonGazetted(entryData);
      await entry.validate();
      const savedEntry = await entry.save();
      
      res.json({ 
        success: true, 
        message: 'Non-gazetted employee application submitted successfully',
        id: savedEntry._id
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
});

// Admin approval routes
router.post('/gazetted/:id/approve', async (req, res) => {
  try {
    const updated = await Gazetted.findByIdAndUpdate(
      req.params.id,
      { status: 'Approved', approvedAt: new Date() },
      { new: true }
    );
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Application not found' });
    }
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/gazetted/:id/reject', async (req, res) => {
  try {
    const updated = await Gazetted.findByIdAndUpdate(
      req.params.id,
      { 
        status: 'Rejected', 
        rejectedAt: new Date(),
        rejectionReason: req.body.reason 
      },
      { new: true }
    );
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Application not found' });
    }
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/non-gazetted/:id/approve', async (req, res) => {
  try {
    const updated = await NonGazetted.findByIdAndUpdate(
      req.params.id,
      { status: 'Approved', approvedAt: new Date() },
      { new: true }
    );
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Application not found' });
    }
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/non-gazetted/:id/reject', async (req, res) => {
  try {
    const updated = await NonGazetted.findByIdAndUpdate(
      req.params.id,
      { 
        status: 'Rejected', 
        rejectedAt: new Date(),
        rejectionReason: req.body.reason 
      },
      { new: true }
    );
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Application not found' });
    }
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
