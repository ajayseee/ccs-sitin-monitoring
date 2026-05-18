// Client-side JavaScript for reservation page

document.addEventListener('DOMContentLoaded', function() {
  // Check if user is logged in
  const userData = localStorage.getItem('userData');
  const authToken = localStorage.getItem('authToken');
  
  if (!userData && !authToken) {
    window.location.href = 'Login.html';
    return;
  }

  // Load user info
  loadUserInfo();

  // Load reservations
  loadReservations();

  // Setup form submission
  setupReservationForm();

  // Load dropdown options
  loadDropdowns();

  // Set minimum date to today
  const dateInput = document.getElementById('reservationDate');
  if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.setAttribute('min', today);
  }
});

// Load user info and display
function loadUserInfo() {
  const userData = localStorage.getItem('userData');
  if (userData) {
    const user = JSON.parse(userData);
    // You could display user info here if needed
  }
}

// Load reservations from server
async function loadReservations() {
  try {
    const token = localStorage.getItem('authToken');
    const response = await fetch('/api/reservations', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      displayReservations(data.reservations || []);
    } else {
      displayReservations([]);
    }
  } catch (error) {
    console.error('Error loading reservations:', error);
    displayReservations([]);
  }
}

// Display reservations in the list
function displayReservations(reservations) {
  const container = document.getElementById('reservationsList');
  
  if (!container) return;
  
  if (reservations.length === 0) {
    container.innerHTML = '<div class="announcement-item"><div class="announcement-line">No reservations yet</div></div>';
    return;
  }
  
  let html = '';
  reservations.forEach(res => {
    const date = new Date(res.reservation_date);
    const formattedDate = date.toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    const createdDate = new Date(res.created_at);
    const createdFormatted = createdDate.toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    
    // Status badge color
    let statusClass = 'status-pending';
    if (res.status === 'approved') statusClass = 'status-approved';
    if (res.status === 'rejected') statusClass = 'status-rejected';
    if (res.status === 'cancelled') statusClass = 'status-cancelled';
    
    const statusText = res.status.charAt(0).toUpperCase() + res.status.slice(1);
    
    const cancelButton = (res.status === 'pending') 
      ? `<button class="cancel-btn" onclick="cancelReservation(${res.id})">Cancel</button>`
      : '';
    
    html += `
      <div class="announcement-item">
        <div class="announcement-line">
          <span class="reservation-date">${formattedDate}</span>
          <span class="status-badge ${statusClass}">${statusText}</span>
        </div>
        <div class="announcement-message">
          <strong>Lab ${res.lab}</strong> - ${res.purpose || 'No purpose specified'}
        </div>
        <div class="reservation-meta">
          Created: ${createdFormatted} ${cancelButton}
        </div>
      </div>
    `;
  });
  
  container.innerHTML = html;
}

// Setup reservation form
function setupReservationForm() {
  const form = document.getElementById('reservationForm');
  
  if (!form) return;
  
  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    await submitReservation();
  });
}

// Submit reservation
async function submitReservation() {
  const lab = document.getElementById('reservationLab').value;
  const reservationDate = document.getElementById('reservationDate').value;
  const purpose = document.getElementById('reservationPurpose').value;
  
  if (!lab || !reservationDate) {
    alert('Please select a lab and date');
    return;
  }
  
  try {
    const token = localStorage.getItem('authToken');
    const response = await fetch('/api/reservations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        lab: lab,
        seatNumber: '',
        purpose: purpose,
        reservationDate: reservationDate
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      showToast('Reservation submitted successfully!', 'success');
      // Reset form
      document.getElementById('reservationForm').reset();
      document.getElementById('reservationSoftware').textContent = 'Select a lab to see available software';
      // Reload reservations
      loadReservations();
    } else {
      showToast(data.message || 'Failed to submit reservation', 'error');
    }
  } catch (error) {
    console.error('Error submitting reservation:', error);
    showToast('Unable to submit reservation. Please try again.', 'error');
  }
}

// Show custom toast notification
function showToast(message, type = 'success') {
  // Check if toast container exists, if not create it
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type} animate__animated animate__fadeInRight`;
  
  const icon = type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation';
  
  toast.innerHTML = `
    <i class="fa-solid ${icon}"></i>
    <div class="toast-content">${message}</div>
    <div class="toast-progress"></div>
  `;

  container.appendChild(toast);

  // Auto remove
  setTimeout(() => {
    toast.classList.replace('animate__fadeInRight', 'animate__fadeOutRight');
    setTimeout(() => {
      toast.remove();
    }, 500);
  }, 3000);
}

// Cancel reservation
async function cancelReservation(reservationId) {
  if (!confirm('Are you sure you want to cancel this reservation?')) {
    return;
  }
  
  try {
    const token = localStorage.getItem('authToken');
    const response = await fetch(`/api/reservations/${reservationId}/cancel`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert('Reservation cancelled successfully!');
      loadReservations();
    } else {
      alert(data.message || 'Failed to cancel reservation');
    }
  } catch (error) {
    console.error('Error cancelling reservation:', error);
    alert('Unable to cancel reservation. Please try again.');
  }
}



let availableLabs = [];

// Load dynamic dropdowns from server
async function loadDropdowns() {
  try {
    // Fetch active labs
    const labRes = await fetch('/api/dropdowns/lab');
    const labData = await labRes.json();
    if (labData.success) {
      availableLabs = labData.options;
      updateSelectElement('reservationLab', labData.options, 'Select Lab');
    }
    
    // Fetch active purposes
    const purposeRes = await fetch('/api/dropdowns/purpose');
    const purposeData = await purposeRes.json();
    if (purposeData.success) {
      updateSelectElement('reservationPurpose', purposeData.options, 'Select Purpose');
    }
  } catch (error) {
    console.error('Error loading dropdowns:', error);
  }
}

// Event listener for lab selection to show software
const resLabSelect = document.getElementById('reservationLab');
if (resLabSelect) {
  resLabSelect.addEventListener('change', function() {
    const selectedLabValue = this.value;
    const softwareDisplay = document.getElementById('reservationSoftware');
    if (!softwareDisplay) return;
    
    if (!selectedLabValue) {
      softwareDisplay.innerHTML = 'Select a lab to see available software';
      return;
    }
    
    const lab = availableLabs.find(l => l.value === selectedLabValue);
    if (lab && lab.metadata) {
      try {
        const software = JSON.parse(lab.metadata);
        if (Array.isArray(software) && software.length > 0) {
          softwareDisplay.innerHTML = software.map(s => `<span class="software-item-tag">${escapeHtml(s)}</span>`).join('');
        } else {
          softwareDisplay.innerHTML = '<span style="color: #666; font-style: italic;">No specific software listed for this lab</span>';
        }
      } catch (e) {
        softwareDisplay.innerHTML = '<span style="color: #666; font-style: italic;">Information not available</span>';
      }
    } else {
      softwareDisplay.innerHTML = '<span style="color: #666; font-style: italic;">No specific software listed for this lab</span>';
    }
  });
}

function updateSelectElement(elementId, options, defaultText) {
  const select = document.getElementById(elementId);
  if (!select) return;
  
  const currentValue = select.value;
  let html = `<option value="">${defaultText}</option>`;
  
  options.forEach(opt => {
    const selected = opt.value === currentValue ? 'selected' : '';
    html += `<option value="${escapeHtml(opt.value)}" ${selected}>${escapeHtml(opt.value)}</option>`;
  });
  
  select.innerHTML = html;
}