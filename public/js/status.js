function openTab(tabId) {
  // Hide all tab contents
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.style.display = 'none';
  });
  
  // Remove active class from all tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // Show selected tab content
  document.getElementById(tabId).style.display = 'block';
  
  // Add active class to clicked button
  event.currentTarget.classList.add('active');
}

// Gazetted status form submission
document.getElementById('gazStatusForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const form = e.target;
  const resultDiv = document.getElementById('gazStatusResult');
  resultDiv.innerHTML = '<p>Loading...</p>';
  
  try {
    const response = await fetch('/api/status/gazetted', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        applicationId: form.applicationId.value,
        dob: form.dob.value
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      const app = result.data;
      let html = `
        <div class="status-details">
          <h4>Application Details</h4>
          <table>
            <tr><th>Application ID:</th><td>${app._id}</td></tr>
            <tr><th>Name:</th><td>${app.name}</td></tr>
            <tr><th>RUID:</th><td>${app.ruid}</td></tr>
            <tr><th>Designation:</th><td>${app.designation}</td></tr>
            <tr><th>Department:</th><td>${app.department}</td></tr>
            <tr><th>Status:</th><td>${app.status || 'Pending'}</td></tr>
            <tr><th>Submitted On:</th><td>${new Date(app.createdAt).toLocaleString()}</td></tr>
          </table>
      `;
      
      if (app.photo) {
        html += `
          <div class="photo-preview">
            <h5>Photo:</h5>
            <img src="/uploads/${app.photo}" alt="Applicant Photo">
          </div>
        `;
      }
      
      html += `</div>`;
      resultDiv.innerHTML = html;
    } else {
      resultDiv.innerHTML = `<p class="error">${result.error || 'Application not found'}</p>`;
    }
  } catch (error) {
    console.error('Error checking status:', error);
    resultDiv.innerHTML = `<p class="error">Failed to check status. Please try again.</p>`;
  }
});

// Non-Gazetted status form submission
document.getElementById('nonGazStatusForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const form = e.target;
  const resultDiv = document.getElementById('nonGazStatusResult');
  resultDiv.innerHTML = '<p>Loading...</p>';
  
  try {
    const response = await fetch('/api/status/non-gazetted', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        applicationId: form.applicationId.value,
        dob: form.dob.value
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      const app = result.data;
      let html = `
        <div class="status-details">
          <h4>Application Details</h4>
          <table>
            <tr><th>Application ID:</th><td>${app._id}</td></tr>
            <tr><th>Name:</th><td>${app.name}</td></tr>
            <tr><th>Employee No:</th><td>${app.empNo}</td></tr>
            <tr><th>Designation:</th><td>${app.designation}</td></tr>
            <tr><th>Department:</th><td>${app.department}</td></tr>
            <tr><th>Status:</th><td>${app.status || 'Pending'}</td></tr>
            <tr><th>Submitted On:</th><td>${new Date(app.createdAt).toLocaleString()}</td></tr>
          </table>
      `;
      
      if (app.photo) {
        html += `
          <div class="photo-preview">
            <h5>Photo:</h5>
            <img src="/uploads/${app.photo}" alt="Applicant Photo">
          </div>
        `;
      }
      
      html += `</div>`;
      resultDiv.innerHTML = html;
    } else {
      resultDiv.innerHTML = `<p class="error">${result.error || 'Application not found'}</p>`;
    }
  } catch (error) {
    console.error('Error checking status:', error);
    resultDiv.innerHTML = `<p class="error">Failed to check status. Please try again.</p>`;
  }
});