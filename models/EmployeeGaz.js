// models/EmployeeGaz.js
const mongoose = require('mongoose');

const EmployeeGazSchema = new mongoose.Schema({
  applicationNo: {
    type: String,
    required: [true, 'Application number is required'],
    unique: true,
    default: function() {
      return 'ECR-G-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 5).toUpperCase();
    }
  },
  userId: { 
    type: String, 
    required: [true, 'User ID is required'] 
  },
  name: { 
    type: String, 
    required: [true, 'Full name is required'],
    trim: true
  },
  ruid: { 
    type: String, 
    required: [true, 'RUID is required'],
    unique: true
  },
  designation: { 
    type: String, 
    required: [true, 'Designation is required'],
    trim: true
  },
  department: { 
    type: String, 
    required: [true, 'Department is required'],
    trim: true
  },
  station: { 
    type: String, 
    required: [true, 'Station is required'],
    trim: true
  },
  billUnit: { 
    type: String, 
    required: [true, 'Bill unit is required'],
    trim: true
  },
  dob: { 
    type: Date, 
    required: [true, 'Date of birth is required']
  },
  mobile: { 
    type: String, 
    required: [true, 'Mobile number is required'],
    match: [/^[0-9]{10}$/, 'Please enter a valid 10-digit mobile number']
  },
  address: { 
    type: String, 
    required: [true, 'Address is required'],
    trim: true
  },
  reason: { 
    type: String, 
    required: [true, 'Reason is required'],
    trim: true
  },
  emergencyContactName: {
    type: String,
    trim: true,
    default: ''
  },
  emergencyContactNumber: {
    type: String,
    match: [/^[0-9]{10}$/, 'Please enter a valid 10-digit mobile number'],
    default: ''
  },
  family: { 
    type: Array, 
    default: [] 
  },
  photo: {
    type: String,
    default: ''
  },
  sign: {
    type: String,
    default: ''
  },
  hindiName: {
    type: String,
    trim: true,
    default: ''
  },
  hindiDesig: {
    type: String,
    trim: true,
    default: ''
  },
  status: { 
    type: String, 
    default: 'Pending', 
    enum: {
      values: ['Pending', 'Approved', 'Rejected'],
      message: 'Status must be Pending, Approved, or Rejected'
    } 
  },
  approvedAt: Date,
  rejectedAt: Date,
  rejectionReason: String
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for formatted date of birth
EmployeeGazSchema.virtual('formattedDob').get(function() {
  if (!this.dob) return 'N/A';
  const date = new Date(this.dob);
  return `${date.getDate().toString().padStart(2, '0')}-${(date.getMonth()+1).toString().padStart(2, '0')}-${date.getFullYear()}`;
});

// Indexes
EmployeeGazSchema.index({ applicationNo: 1 });
EmployeeGazSchema.index({ ruid: 1 });
EmployeeGazSchema.index({ status: 1 });

module.exports = mongoose.model('GazettedEmployee', EmployeeGazSchema);