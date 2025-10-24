function showSection(sectionId) {
  // Hide all sections
  document.querySelectorAll('.content-section').forEach(section => {
    section.style.display = 'none';
  });
  
  // Show selected section
  document.getElementById(sectionId).style.display = 'block';
  
  // Update active menu item
  document.querySelectorAll('.sidebar a').forEach(link => {
    link.classList.remove('active');
  });
  event.target.classList.add('active');
  
  // Load data if needed
  if (sectionId === 'pending-gaz') {
    loadGazettedApplications();
  } else if (sectionId === 'pending-non-gaz') {
    loadNonGazettedApplications();
  }
}

async function loadGazettedApplications() {
  try {
    const response = await fetch('/api/admin/gazetted');
    const data = await response.json();
    
    const listContainer = document.querySelector('#pending-gaz .application-list');
    listContainer.innerHTML = '';
    
    if (data.length === 0) {
      listContainer.innerHTML = '<p>No pending applications found</p>';
      return;
    }
    
    data.forEach(app => {
      const appItem = document.createElement('div');
      appItem.className = 'application-item';
      appItem.innerHTML = `
        <div class="application-info">
          <h4>${app.name}</h4>
          <p>RUID: ${app.ruid} | Department: ${app.department}</p>
          <small>Submitted: ${new Date(app.createdAt).toLocaleString()}</small>
        </div>
        <div class="application-actions">
          <button class="view-btn" onclick="viewApplication('gazetted', '${app._id}')">View</button>
          <button class="approve-btn" onclick="approveApplication('gazetted', '${app._id}')">Approve</button>
          <button class="reject-btn" onclick="rejectApplication('gazetted', '${app._id}')">Reject</button>
        </div>
      `;
      listContainer.appendChild(appItem);
    });
  } catch (error) {
    console.error('Error loading gazetted applications:', error);
    alert('Failed to load applications. Please try again.');
  }
}

async function loadNonGazettedApplications() {
  try {
    const response = await fetch('/api/admin/non-gazetted');
    const data = await response.json();
    
    const listContainer = document.querySelector('#pending-non-gaz .application-list');
    listContainer.innerHTML = '';
    
    if (data.length === 0) {
      listContainer.innerHTML = '<p>No pending applications found</p>';
      return;
    }
    
    data.forEach(app => {
      const appItem = document.createElement('div');
      appItem.className = 'application-item';
      appItem.innerHTML = `
        <div class="application-info">
          <h4>${app.name}</h4>
          <p>Employee No: ${app.empNo} | Department: ${app.department}</p>
          <small>Submitted: ${new Date(app.createdAt).toLocaleString()}</small>
        </div>
        <div class="application-actions">
          <button class="view-btn" onclick="viewApplication('non-gazetted', '${app._id}')">View</button>
          <button class="approve-btn" onclick="approveApplication('non-gazetted', '${app._id}')">Approve</button>
          <button class="reject-btn" onclick="rejectApplication('non-gazetted', '${app._id}')">Reject</button>
        </div>
      `;
      listContainer.appendChild(appItem);
    });
  } catch (error) {
    console.error('Error loading non-gazetted applications:', error);
    alert('Failed to load applications. Please try again.');
  }
}

async function viewApplication(type, id) {
  try {
    const response = await fetch(`/api/admin/${type}/${id}`);
    const data = await response.json();
    
    // Show application details in a modal or new page
    alert(`Application Details:\nName: ${data.name}\nDepartment: ${data.department}\nStatus: ${data.status || 'Pending'}`);
  } catch (error) {
    console.error('Error viewing application:', error);
    alert('Failed to view application. Please try again.');
  }
}

async function approveApplication(type, id) {
  if (confirm('Are you sure you want to approve this application?')) {
    try {
      const response = await fetch(`/api/admin/${type}/${id}/approve`, {
        method: 'POST'
      });
      const result = await response.json();
      
      if (result.success) {
        alert('Application approved successfully');
        if (type === 'gazetted') {
          loadGazettedApplications();
        } else {
          loadNonGazettedApplications();
        }
      } else {
        alert('Failed to approve application: ' + result.error);
      }
    } catch (error) {
      console.error('Error approving application:', error);
      alert('Failed to approve application. Please try again.');
    }
  }
}

async function rejectApplication(type, id) {
  const reason = prompt('Please enter reason for rejection:');
  if (reason) {
    try {
      const response = await fetch(`/api/admin/${type}/${id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason })
      });
      const result = await response.json();
      
      if (result.success) {
        alert('Application rejected successfully');
        if (type === 'gazetted') {
          loadGazettedApplications();
        } else {
          loadNonGazettedApplications();
        }
      } else {
        alert('Failed to reject application: ' + result.error);
      }
    } catch (error) {
      console.error('Error rejecting application:', error);
      alert('Failed to reject application. Please try again.');
    }
  }
}

// Load gazetted applications by default when page loads
document.addEventListener('DOMContentLoaded', () => {
  loadGazettedApplications();
});