require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const morgan = require('morgan');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(morgan('dev'));

// Database connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/icard_db', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000
})
.then(() => console.log("✅ MongoDB connected successfully"))
.catch(err => {
  console.error("❌ MongoDB connection failed:", err.message);
  setTimeout(() => {
    console.log("Retrying MongoDB connection...");
    mongoose.connect(process.env.MONGO_URI);
  }, 5000);
});

// Routes
app.use('/api/admin', require('./controllers/adminController'));
app.use('/api/status', require('./controllers/statusController'));
app.use('/api/user', require('./controllers/userController'));
app.use('/api/forms', require('./controllers/formController'));

// Serve static files
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1d',
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));

// Route handlers
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/status', (req, res) => res.sendFile(path.join(__dirname, 'public', 'status.html')));
app.get('/apply-gazetted', (req, res) => res.sendFile(path.join(__dirname, 'public', 'apply-gazetted.html')));
app.get('/apply-non-gazetted', (req, res) => res.sendFile(path.join(__dirname, 'public', 'apply-non-gazetted.html')));
app.get('/user-dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public', 'user-dashboard.html')));

// ID Card Generation Endpoint
app.get('/api/admin/generate-id-card/:id', async (req, res) => {
  try {
    const Gazetted = require('./models/EmployeeGaz');
    const NonGazetted = require('./models/EmployeeNonGaz');
    
    let application = await Gazetted.findById(req.params.id);
    let type = 'gazetted';
    
    if (!application) {
      application = await NonGazetted.findById(req.params.id);
      type = 'non-gazetted';
    }
    
    if (!application) {
      return res.status(404).json({ 
        success: false, 
        error: 'Application not found' 
      });
    }

    // Generate PDF
    const pdfBuffer = await generateIdCard(application, type);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=ECoR_ID_${application.applicationNo}.pdf`);
    res.send(pdfBuffer);
    
  } catch (error) {
    console.error('Error generating ID card:', error);
    res.status(500).json({ success: false, error: 'Failed to generate ID card' });
  }
});

// PDF Generation Function
async function generateIdCard(application, type) {
  return new Promise(async (resolve, reject) => {
    const doc = new PDFDocument({
      layout: 'landscape',
      size: [242.65, 153], // 85.6mm x 53.98mm in points (1mm = 2.83465 points)
      margins: 0
    });

    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => resolve(Buffer.concat(buffers)));

    // FRONT SIDE
    // Background
    doc.rect(0, 0, doc.page.width, doc.page.height)
       .fill('#f5f5f5');

    // Header
    doc.fillColor('#000080') // Dark blue
       .font('Helvetica-Bold')
       .fontSize(14)
       .text('East Coast Railway', 0, 15, { align: 'center' });

    doc.fillColor('#000000')
       .font('Helvetica-Bold')
       .fontSize(10)
       .text('DEPARTMENT', 0, 35, { align: 'center' });

    doc.fillColor('#ff0000') // Red
       .font('Helvetica-Bold')
       .fontSize(10)
       .text('COMMERCIAL', 0, 50, { align: 'center' });

    // Horizontal line
    doc.moveTo(20, 70)
       .lineTo(doc.page.width - 20, 70)
       .strokeColor('#000000')
       .strokeWidth(1)
       .stroke();

    // ID Card title
    doc.fillColor('#000000')
       .font('Helvetica-Bold')
       .fontSize(12)
       .text('IDENTITY CARD', 0, 75, { align: 'center' });

    // Employee details
    const detailsX = 30;
    let detailsY = 100;
    const lineHeight = 15;

    doc.fillColor('#000000')
       .font('Helvetica')
       .fontSize(10);

    // Name
    doc.text('Name', detailsX, detailsY)
       .text(': ' + (application.name || 'N/A'), detailsX + 50, detailsY);
    detailsY += lineHeight;

    // Designation
    doc.text('Desig', detailsX, detailsY)
       .text(': ' + (application.designation || 'N/A'), detailsX + 50, detailsY);
    detailsY += lineHeight;

    // PF No
    const empNo = type === 'gazetted' ? application.ruid : application.empNo;
    doc.text('P.F.No.', detailsX, detailsY)
       .text(': ' + (empNo || 'N/A'), detailsX + 50, detailsY);
    detailsY += lineHeight;

    // Station
    doc.text('Station', detailsX, detailsY)
       .text(': ' + (application.station || 'N/A'), detailsX + 50, detailsY);
    detailsY += lineHeight;

    // DOB
    doc.text('D.O.B', detailsX, detailsY)
       .text(': ' + formatDate(application.dob), detailsX + 50, detailsY);

    // Photo (right-aligned)
    if (application.photo && fs.existsSync(path.join(__dirname, 'public', 'uploads', application.photo))) {
      doc.image(path.join(__dirname, 'public', 'uploads', application.photo), doc.page.width - 60, 100, {
        width: 40,
        height: 40,
        align: 'right'
      });
    }

    // Signature section
    doc.moveTo(20, doc.page.height - 40)
       .lineTo(doc.page.width - 20, doc.page.height - 40)
       .stroke();

    doc.fontSize(8)
       .text('Signature of the Card Holder', 30, doc.page.height - 35);

    // Add signature image if available
    if (application.sign && fs.existsSync(path.join(__dirname, 'public', 'uploads', application.sign))) {
      doc.image(path.join(__dirname, 'public', 'uploads', application.sign), 
               doc.page.width - 100, doc.page.height - 40, {
                 width: 60,
                 height: 20
               });
    }

    doc.fontSize(6)
       .text('Signature of Issuing Authority', doc.page.width - 100, doc.page.height - 20);

    // BACK SIDE
    doc.addPage({
      layout: 'landscape',
      size: [242.65, 153],
      margins: 0
    });

    // Background
    doc.rect(0, 0, doc.page.width, doc.page.height)
       .fill('#f5f5f5');

    // Family details header
    doc.fillColor('#000000')
       .font('Helvetica-Bold')
       .fontSize(10)
       .text('Details of the family', 0, 15, { align: 'center' });

    // Employee name
    doc.font('Helvetica')
       .fontSize(10)
       .text(application.name || 'N/A', 30, 40);

    // Self details
    doc.fontSize(8);
    doc.text('Self', 30, 60);
    doc.text(formatDate(application.dob), 30, 75);
    doc.text(application.bloodGroup || 'N/A', 30, 90);

    // Emergency contact
    doc.text(`Emergency Contact No. : ${application.emergencyContactNumber || 'N/A'}`, 30, 110);

    // Address
    doc.text('Res.Address:', 30, 125);
    doc.text(application.address || 'N/A', 30, 140, {
      width: doc.page.width - 120 // Reduced width for QR code space
    });

    // Generate QR Code
    try {
      const qrData = JSON.stringify({
        empId: type === 'gazetted' ? application.ruid : application.empNo || 'N/A',
        name: application.name || 'N/A',
        designation: application.designation || 'N/A',
        department: application.department || 'N/A',
        bloodGroup: application.bloodGroup || 'N/A'
      });

      // Generate QR code as data URL
      const qrCodeDataURL = await QRCode.toDataURL(qrData, {
        width: 80,
        margin: 0,
        color: {
          dark: '#000000', // Black dots
          light: '#ffffff00' // Transparent background
        }
      });

      // Add QR code to PDF (right side)
      doc.image(qrCodeDataURL, doc.page.width - 90, 40, {
        width: 80,
        height: 80
      });

      // QR code label
      doc.fontSize(6)
         .text('Scan for verification', doc.page.width - 90, 125, {
           width: 80,
           align: 'center'
         });
    } catch (err) {
      console.error('QR Code generation error:', err);
    }

    // Lost card instructions
    doc.fontSize(6)
       .text(';fn ;g dkMZ feys rks —i;k fudVre iksLV c‚Dl esa Mky nsaA', 0, doc.page.height - 30, {
         align: 'center'
       })
       .text('If found please drop it in the nearest Post Box', 0, doc.page.height - 20, {
         align: 'center'
       });

    doc.end();
  });
}

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return `${date.getDate().toString().padStart(2, '0')}-${(date.getMonth()+1).toString().padStart(2, '0')}-${date.getFullYear()}`;
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ 
    success: false, 
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// Start server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

// Server error handling
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use`);
    process.exit(1);
  }
  console.error('Server error:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});