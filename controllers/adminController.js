const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Gazetted = require('../models/EmployeeGaz');
const NonGazetted = require('../models/EmployeeNonGaz');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

// Helper function for handling errors
const handleError = (res, error, message) => {
  console.error(message, error);
  res.status(500).json({ 
    success: false, 
    error: error.message || 'Internal server error' 
  });
};

// Helper function to parse date input
const parseDateInput = (dateInput) => {
  if (!dateInput) return null;
  
  if (dateInput instanceof Date || !isNaN(new Date(dateInput).getTime())) {
    return new Date(dateInput);
  }
  
  if (/^\d{2}-\d{2}-\d{4}$/.test(dateInput)) {
    const [day, month, year] = dateInput.split('-');
    return new Date(`${year}-${month}-${day}`);
  }
  
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    return new Date(dateInput);
  }
  
  return new Date(dateInput);
};

// Helper function to format dates for display
const formatDateForDisplay = (date) => {
  if (!date) return 'N/A';
  const d = new Date(date);
  return `${d.getDate().toString().padStart(2, '0')}-${(d.getMonth()+1).toString().padStart(2, '0')}-${d.getFullYear()}`;
};

// Admin login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({
      success: false,
      error: 'Username and password are required'
    });
  }

  if (username === process.env.ADMIN_USER && password === process.env.ADMIN_PASS) {
    res.json({ 
      success: true,
      message: 'Login successful',
      token: 'admin-auth-token'
    });
  } else {
    res.status(401).json({ 
      success: false, 
      error: 'Invalid credentials' 
    });
  }
});

// Submit Gazetted Application
router.post('/submit-gazetted', async (req, res) => {
  try {
    let { dob, ...rest } = req.body;
    
    const parsedDob = parseDateInput(dob);
    if (!parsedDob || isNaN(parsedDob.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date of birth format. Please use DD-MM-YYYY or any standard date format'
      });
    }

    const newApplication = new Gazetted({
      ...rest,
      dob: parsedDob,
      status: 'Pending'
    });

    await newApplication.validate();
    const savedApplication = await newApplication.save();

    res.status(201).json({
      success: true,
      message: 'Gazetted application submitted successfully',
      data: savedApplication
    });

  } catch (error) {
    if (error.name === 'ValidationError') {
      const errors = {};
      Object.keys(error.errors).forEach(field => {
        errors[field] = error.errors[field].message;
      });
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors
      });
    }
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        error: 'Duplicate value',
        message: `${field === 'ruid' ? 'RUID' : 'Application number'} already exists`
      });
    }

    handleError(res, error, 'Error submitting gazetted application:');
  }
});

// Submit Non-Gazetted Application
router.post('/submit-non-gazetted', async (req, res) => {
  try {
    let { dob, ...rest } = req.body;
    
    const parsedDob = parseDateInput(dob);
    if (!parsedDob || isNaN(parsedDob.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date of birth format. Please use DD-MM-YYYY or any standard date format'
      });
    }

    const newApplication = new NonGazetted({
      ...rest,
      dob: parsedDob,
      status: 'Pending'
    });

    await newApplication.validate();
    const savedApplication = await newApplication.save();

    res.status(201).json({
      success: true,
      message: 'Non-Gazetted application submitted successfully',
      data: savedApplication
    });

  } catch (error) {
    if (error.name === 'ValidationError') {
      const errors = {};
      Object.keys(error.errors).forEach(field => {
        errors[field] = error.errors[field].message;
      });
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors
      });
    }
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        error: 'Duplicate value',
        message: `${field === 'empNo' ? 'Employee number' : 'Application number'} already exists`
      });
    }

    handleError(res, error, 'Error submitting non-gazetted application:');
  }
});

// Get all applications with filters
router.get('/applications', async (req, res) => {
  try {
    const { sortBy = 'createdAt', sortOrder = 'desc', status, type, search } = req.query;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
    const filters = {};

    if (status) filters.status = status;
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      filters.$or = [
        { name: searchRegex },
        { applicationNo: searchRegex },
        { ruid: searchRegex },
        { empNo: searchRegex }
      ];
    }

    const [gazetted, nonGazetted] = await Promise.all([
      type !== 'non-gazetted' ? Gazetted.find(filters).sort(sort) : Promise.resolve([]),
      type !== 'gazetted' ? NonGazetted.find(filters).sort(sort) : Promise.resolve([])
    ]);

    const data = [
      ...gazetted.map(app => ({ 
        ...app.toObject(), 
        formattedDob: formatDateForDisplay(app.dob),
        type: 'gazetted' 
      })),
      ...nonGazetted.map(app => ({ 
        ...app.toObject(), 
        formattedDob: formatDateForDisplay(app.dob),
        type: 'non-gazetted' 
      }))
    ];

    res.json({ success: true, data });
  } catch (error) {
    handleError(res, error, 'Error fetching applications:');
  }
});

// Get single application by ID
router.get('/applications/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    let application = await Gazetted.findById(id);
    let type = 'gazetted';
    
    if (!application) {
      application = await NonGazetted.findById(id);
      type = 'non-gazetted';
    }
    
    if (!application) {
      return res.status(404).json({ 
        success: false, 
        error: 'Application not found' 
      });
    }
    
    res.json({ 
      success: true, 
      data: { 
        ...application.toObject(), 
        formattedDob: formatDateForDisplay(application.dob),
        type 
      } 
    });
  } catch (error) {
    handleError(res, error, 'Error fetching application:');
  }
});

// Get pending Gazetted applications
router.get('/gazetted', async (req, res) => {
  try {
    const data = await Gazetted.find({ status: 'Pending' }).sort({ createdAt: -1 });
    res.json({ 
      success: true, 
      data: data.map(app => ({
        ...app.toObject(),
        formattedDob: formatDateForDisplay(app.dob)
      }))
    });
  } catch (error) {
    handleError(res, error, 'Error fetching gazetted applications:');
  }
});

// Get pending Non-Gazetted applications
router.get('/non-gazetted', async (req, res) => {
  try {
    const data = await NonGazetted.find({ status: 'Pending' }).sort({ createdAt: -1 });
    res.json({ 
      success: true, 
      data: data.map(app => ({
        ...app.toObject(),
        formattedDob: formatDateForDisplay(app.dob)
      }))
    });
  } catch (error) {
    handleError(res, error, 'Error fetching non-gazetted applications:');
  }
});

// Get approved applications
router.get('/approved', async (req, res) => {
  try {
    const [gazetted, nonGazetted] = await Promise.all([
      Gazetted.find({ status: 'Approved' }).sort({ approvedAt: -1 }),
      NonGazetted.find({ status: 'Approved' }).sort({ approvedAt: -1 })
    ]);

    const data = [
      ...gazetted.map(app => ({ 
        ...app.toObject(), 
        formattedDob: formatDateForDisplay(app.dob),
        type: 'gazetted' 
      })),
      ...nonGazetted.map(app => ({ 
        ...app.toObject(), 
        formattedDob: formatDateForDisplay(app.dob),
        type: 'non-gazetted' 
      }))
    ];

    res.json({ success: true, data });
  } catch (error) {
    handleError(res, error, 'Error fetching approved applications:');
  }
});

// Get rejected applications
router.get('/rejected', async (req, res) => {
  try {
    const [gazetted, nonGazetted] = await Promise.all([
      Gazetted.find({ status: 'Rejected' }).sort({ rejectedAt: -1 }),
      NonGazetted.find({ status: 'Rejected' }).sort({ rejectedAt: -1 })
    ]);

    const data = [
      ...gazetted.map(app => ({ 
        ...app.toObject(), 
        formattedDob: formatDateForDisplay(app.dob),
        type: 'gazetted' 
      })),
      ...nonGazetted.map(app => ({ 
        ...app.toObject(), 
        formattedDob: formatDateForDisplay(app.dob),
        type: 'non-gazetted' 
      }))
    ];

    res.json({ success: true, data });
  } catch (error) {
    handleError(res, error, 'Error fetching rejected applications:');
  }
});

// Get dashboard counts
router.get('/counts', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalGazetted, 
      totalNonGazetted, 
      pendingGazetted, 
      pendingNonGazetted,
      approvedTodayGazetted,
      approvedTodayNonGazetted
    ] = await Promise.all([
      Gazetted.countDocuments(),
      NonGazetted.countDocuments(),
      Gazetted.countDocuments({ status: 'Pending' }),
      NonGazetted.countDocuments({ status: 'Pending' }),
      Gazetted.countDocuments({ 
        status: 'Approved',
        approvedAt: { $gte: today }
      }),
      NonGazetted.countDocuments({ 
        status: 'Approved',
        approvedAt: { $gte: today }
      })
    ]);

    res.json({
      success: true,
      data: {
        totalGazetted,
        totalNonGazetted,
        pending: pendingGazetted + pendingNonGazetted,
        approvedToday: approvedTodayGazetted + approvedTodayNonGazetted
      }
    });
  } catch (error) {
    handleError(res, error, 'Error fetching counts:');
  }
});

// Generate ID Card PDF (Updated Design)
router.get('/generate-id-card/:id', async (req, res) => {
  try {
    let application = await Gazetted.findById(req.params.id);
    let type = 'gazetted';
    let idNumber = application?.ruid;
    
    if (!application) {
      application = await NonGazetted.findById(req.params.id);
      type = 'non-gazetted';
      idNumber = application?.empNo;
    }
    
    if (!application) {
      return res.status(404).json({ 
        success: false, 
        error: 'Application not found' 
      });
    }

    // Create PDF document with standard ID card size (85.6mm x 53.98mm in points)
    const doc = new PDFDocument({
      layout: 'portrait',
      size: [303.307, 191.811], // 85.6mm x 53.98mm in points (1mm = 3.543307 points)
      margins: 0
    });

    // Set up font paths (adjust these paths according to your project structure)
    const fontDir = path.join(__dirname, '../public/fonts');
    const hindiFontPath = path.join(fontDir, 'NotoSansDevanagari-Regular.ttf');
    const hindiBoldFontPath = path.join(fontDir, 'NotoSansDevanagari-Bold.ttf');

    // Register Hindi fonts if they exist, otherwise use English fallback
    let hasHindiFont = false;
    if (fs.existsSync(hindiFontPath)) {
      doc.registerFont('Hindi', hindiFontPath);
      hasHindiFont = true;
    }
    if (fs.existsSync(hindiBoldFontPath)) {
      doc.registerFont('HindiBold', hindiBoldFontPath);
    }

    // Helper function to render Hindi text with fallback
    const renderHindiText = (text, x, y, options = {}) => {
      if (hasHindiFont) {
        doc.font('Hindi')
           .fontSize(options.fontSize || 8)
           .text(text, x, y, options);
      } else {
        // Fallback - show empty space or placeholder
        doc.font('Helvetica')
           .fontSize(options.fontSize || 8)
           .text('', x, y, options);
      }
    };

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=ECoR_ID_${application.applicationNo}.pdf`);

    // ===== FRONT SIDE =====
    doc.rect(0, 0, doc.page.width, doc.page.height)
       .fill('#ffffff');

    // Top header with Indian Railway logo area (red background)
    doc.rect(0, 0, doc.page.width, 25)
       .fill('#dc2626');

    // Railway wheel logo
    doc.circle(20, 12.5, 10)
       .fill('#ffffff');
    
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4;
      const x1 = 20 + Math.cos(angle) * 3;
      const y1 = 12.5 + Math.sin(angle) * 3;
      const x2 = 20 + Math.cos(angle) * 8;
      const y2 = 12.5 + Math.sin(angle) * 8;
      doc.moveTo(x1, y1).lineTo(x2, y2).strokeColor('#dc2626').lineWidth(1).stroke();
    }

    // Header text
    renderHindiText('पूर्व तट रेलवे', 35, 5, { width: 100 });
    doc.fillColor('#ffffff')
       .font('Helvetica-Bold')
       .fontSize(10)
       .text('East Coast Railway', 35, 15, { width: 100 });

    // Department header (teal background)
    doc.rect(0, 25, doc.page.width, 20)
       .fill('#0891b2');

    doc.fillColor('#ffffff')
       .font('Helvetica-Bold')
       .fontSize(7)
       .text('DEPARTMENT', 10, 28);
    
    renderHindiText('विभाग', 10, 37);

    doc.fillColor('#ffffff')
       .font('Helvetica-Bold')
       .fontSize(9)
       .text('COMMERCIAL', 70, 30);

    renderHindiText('वाणिज्यिक', 70, 40);

    // ID Card title section
    doc.fillColor('#000000')
       .font('Helvetica-Bold')
       .fontSize(10)
       .text('IDENTITY CARD', 10, 55);

    renderHindiText('पहचान पत्र', 10, 67);

    // HQ section (right side)
    doc.fillColor('#000000')
       .font('Helvetica-Bold')
       .fontSize(7)
       .text('H.Q S/No. COMMERCIAL -', doc.page.width - 80, 55);

    // Photo section (right side)
    const photoX = doc.page.width - 60;
    const photoY = 75;
    
    doc.rect(photoX, photoY, 45, 45)
       .strokeColor('#000000')
       .lineWidth(1)
       .stroke();

    if (application.photo) {
      const photoPath = path.join(__dirname, '../public/uploads', application.photo);
      if (fs.existsSync(photoPath)) {
        doc.image(photoPath, photoX + 2, photoY + 2, {
          width: 41,
          height: 41,
          align: 'center',
          valign: 'center'
        });
      } else {
        doc.fillColor('#cccccc')
           .rect(photoX + 2, photoY + 2, 41, 41)
           .fill()
           .fillColor('#666666')
           .fontSize(6)
           .text('No Photo', photoX + 2, photoY + 22, {
             width: 41,
             align: 'center'
           });
      }
    }

    // Employee details section (left side)
    let currentY = 80;
    const leftMargin = 10;
    const labelWidth = 35;

    // Name
    doc.fillColor('#000000')
       .font('Helvetica-Bold')
       .fontSize(8)
       .text('Name', leftMargin, currentY);
    renderHindiText('नाम', leftMargin, currentY + 8);
    doc.fillColor('#000000')
       .font('Helvetica-Bold')
       .fontSize(8)
       .text(`: ${application.name.toUpperCase()}`, leftMargin + labelWidth, currentY);
    currentY += 20;

    // Designation
    doc.fillColor('#000000')
       .font('Helvetica-Bold')
       .fontSize(8)
       .text('Desig', leftMargin, currentY);
    renderHindiText('पद नाम', leftMargin, currentY + 8);
    doc.fillColor('#000000')
       .font('Helvetica-Bold')
       .fontSize(8)
       .text(`: ${application.designation}`, leftMargin + labelWidth, currentY);
    currentY += 20;

    // ID Number
    const idLabel = type === 'gazetted' ? 'P.F No.' : 'Emp No.';
    doc.fillColor('#000000')
       .font('Helvetica-Bold')
       .fontSize(8)
       .text(idLabel, leftMargin, currentY);
    renderHindiText('पी.एफ.नं', leftMargin, currentY + 8);
    doc.fillColor('#000000')
       .font('Helvetica-Bold')
       .fontSize(8)
       .text(`: ${idNumber}`, leftMargin + labelWidth, currentY);
    currentY += 20;

    // Station
    doc.fillColor('#000000')
       .font('Helvetica-Bold')
       .fontSize(8)
       .text('Station', leftMargin, currentY);
    renderHindiText('स्टेशन', leftMargin, currentY + 8);
    doc.fillColor('#000000')
       .font('Helvetica-Bold')
       .fontSize(8)
       .text(`: ${application.station.toUpperCase()}`, leftMargin + labelWidth, currentY);
    currentY += 20;

    // Date of Birth
    doc.fillColor('#000000')
       .font('Helvetica-Bold')
       .fontSize(8)
       .text('D.O.B', leftMargin, currentY);
    renderHindiText('जन्म तारीख', leftMargin, currentY + 8);
    doc.fillColor('#000000')
       .font('Helvetica-Bold')
       .fontSize(8)
       .text(`: ${formatDateForDisplay(application.dob)}`, leftMargin + labelWidth, currentY);

    // Bottom signature section
    const bottomY = doc.page.height - 15;
    
    renderHindiText('कार्डधारक का हस्ताक्षर', 10, bottomY);
    doc.fillColor('#000000')
       .font('Helvetica')
       .fontSize(6)
       .text('Signature of Card Holder', 10, bottomY + 6);

    renderHindiText('जारीकर्ता प्राधिकारी का हस्ताक्षर', doc.page.width - 80, bottomY);
    doc.fillColor('#000000')
       .font('Helvetica')
       .fontSize(6)
       .text('Signature of Issuing Authority', doc.page.width - 80, bottomY + 6);

    if (application.sign) {
      const signPath = path.join(__dirname, '../public/uploads', application.sign);
      if (fs.existsSync(signPath)) {
        doc.image(signPath, doc.page.width - 70, bottomY - 10, {
          width: 60,
          height: 15
        });
      }
    }

    doc.rect(0, 0, doc.page.width, doc.page.height)
       .strokeColor('#000000')
       .lineWidth(2)
       .stroke();

    // ===== BACK SIDE =====
    doc.addPage({
      layout: 'portrait',
      size: [303.307, 191.811],
      margins: 0
    });

    doc.rect(0, 0, doc.page.width, doc.page.height)
       .fill('#ffffff');

    renderHindiText('परिवार का विवरण', 0, 15, { 
      align: 'center',
      width: doc.page.width,
      fontSize: 10
    });
    doc.fillColor('#000000')
       .font('Helvetica-Bold')
       .fontSize(10)
       .text('Details of the family', 0, 25, { 
         align: 'center',
         width: doc.page.width
       });

    doc.fillColor('#000000')
       .font('Helvetica-Bold')
       .fontSize(8)
       .text(application.name.toUpperCase(), 15, 45);

    // Table headers
    doc.fillColor('#000000')
       .font('Helvetica-Bold')
       .fontSize(7)
       .text('Relation', 15, 60);
    doc.text('Date of Birth', 60, 60);
    doc.text('Blood Group', 120, 60);

    // Self details
    doc.fillColor('#000000')
       .font('Helvetica')
       .fontSize(7)
       .text('Self', 15, 75);
    doc.text(formatDateForDisplay(application.dob), 60, 75);
    doc.text(application.bloodGroup || 'N/A', 120, 75);

    // Emergency contact
    doc.fillColor('#000000')
       .font('Helvetica-Bold')
       .fontSize(8)
       .text(`Emergency Contact No. : ${application.emergencyContactNumber || 'N/A'}`, 15, 95);

    // Address
    renderHindiText('घर का पता:', 15, 110);
    doc.fillColor('#000000')
       .font('Helvetica-Bold')
       .fontSize(8)
       .text('Res.Address:', 15, 120);
    
    doc.fillColor('#000000')
       .font('Helvetica')
       .fontSize(7)
       .text(application.address, 15, 130, {
         width: doc.page.width - 30,
         lineGap: 2
       });

    // QR Code
    try {
      const qrData = JSON.stringify({
        name: application.name,
        designation: application.designation,
        idNumber: idNumber,
        department: application.department,
        bloodGroup: application.bloodGroup || 'N/A'
      });

      const qrCodeDataURL = await QRCode.toDataURL(qrData, {
        width: 100,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });

      doc.image(qrCodeDataURL, doc.page.width - 70, 45, {
        width: 50,
        height: 50
      });

      doc.fillColor('#000000')
         .font('Helvetica')
         .fontSize(6)
         .text('Scan for verification', doc.page.width - 70, 100, {
           width: 50,
           align: 'center'
         });
    } catch (err) {
      console.error('Error generating QR code:', err);
    }

    // Footer text
    renderHindiText('यदि मिले तो कृपया निकटतम डाक घर में डाल दें।', 15, doc.page.height - 20);
    doc.fillColor('#000000')
       .font('Helvetica')
       .fontSize(6)
       .text('If found, please drop it in the nearest Post Box', 15, doc.page.height - 12);

    doc.rect(0, 0, doc.page.width, doc.page.height)
       .strokeColor('#000000')
       .lineWidth(2)
       .stroke();

    doc.pipe(res);
    doc.end();

  } catch (error) {
    console.error('Error generating ID card:', error);
    handleError(res, error, 'Error generating ID card:');
  }
});
// Application status change handlers
const createStatusHandler = (Model, type) => {
  return {
    approve: async (req, res) => {
      try {
        const updated = await Model.findByIdAndUpdate(
          req.params.id,
          { 
            status: 'Approved',
            approvedAt: new Date(),
            rejectionReason: undefined
          },
          { new: true }
        );
        
        if (!updated) {
          return res.status(404).json({ 
            success: false, 
            error: 'Application not found' 
          });
        }
        
        res.json({ 
          success: true, 
          message: `${type} application approved`,
          data: updated 
        });
      } catch (error) {
        handleError(res, error, `Error approving ${type} application:`);
      }
    },

    reject: async (req, res) => {
      try {
        const { reason } = req.body;
        
        if (!reason) {
          return res.status(400).json({
            success: false,
            error: 'Rejection reason is required'
          });
        }

        const updated = await Model.findByIdAndUpdate(
          req.params.id,
          { 
            status: 'Rejected',
            rejectedAt: new Date(),
            rejectionReason: reason
          },
          { new: true }
        );
        
        if (!updated) {
          return res.status(404).json({ 
            success: false, 
            error: 'Application not found' 
          });
        }
        
        res.json({ 
          success: true, 
          message: `${type} application rejected`,
          data: updated 
        });
      } catch (error) {
        handleError(res, error, `Error rejecting ${type} application:`);
      }
    },

    pending: async (req, res) => {
      try {
        const updated = await Model.findByIdAndUpdate(
          req.params.id,
          { 
            status: 'Pending',
            approvedAt: undefined,
            rejectedAt: undefined,
            rejectionReason: undefined
          },
          { new: true }
        );
        
        if (!updated) {
          return res.status(404).json({ 
            success: false, 
            error: 'Application not found' 
          });
        }
        
        res.json({ 
          success: true, 
          message: `${type} application set to pending`,
          data: updated 
        });
      } catch (error) {
        handleError(res, error, `Error setting ${type} application to pending:`);
      }
    }
  };
};

const gazettedHandlers = createStatusHandler(Gazetted, 'Gazetted');
const nonGazettedHandlers = createStatusHandler(NonGazetted, 'Non-Gazetted');

// Gazetted application status routes
router.post('/gazetted/:id/approve', gazettedHandlers.approve);
router.post('/gazetted/:id/reject', gazettedHandlers.reject);
router.post('/gazetted/:id/pending', gazettedHandlers.pending);

// Non-Gazetted application status routes
router.post('/non-gazetted/:id/approve', nonGazettedHandlers.approve);
router.post('/non-gazetted/:id/reject', nonGazettedHandlers.reject);
router.post('/non-gazetted/:id/pending', nonGazettedHandlers.pending);

// Get application by application number
router.get('/application-by-no/:appNo', async (req, res) => {
  try {
    const { appNo } = req.params;
    
    let application = await Gazetted.findOne({ applicationNo: appNo });
    let type = 'gazetted';
    
    if (!application) {
      application = await NonGazetted.findOne({ applicationNo: appNo });
      type = 'non-gazetted';
    }
    
    if (!application) {
      return res.status(404).json({ 
        success: false, 
        error: 'Application not found' 
      });
    }
    
    res.json({ 
      success: true, 
      data: { 
        ...application.toObject(), 
        formattedDob: formatDateForDisplay(application.dob),
        type 
      } 
    });
  } catch (error) {
    handleError(res, error, 'Error fetching application:');
  }
});

// Change password
router.post('/change-password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (currentPassword !== process.env.ADMIN_PASS) {
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }
    
    // In a real application, you would update the password here
    res.json({ 
      success: true, 
      message: 'Password changed successfully' 
    });
  } catch (error) {
    handleError(res, error, 'Error changing password:');
  }
});

module.exports = router;