# 🔌 Job Broadcast API Reference

## Quick Reference for Frontend Developers

---

## 📡 REST API Endpoints

### 1. Create Booking (Customer)
**Endpoint:** `POST /api/bookings`  
**Auth:** Customer token required  
**Body:**
```json
{
  "serviceId": "65abc123...",
  "baseAmount": 500,
  "address": "123 Main Street, City",
  "scheduledAt": "2026-01-15T10:00:00Z"
}
```
**Response:**
```json
{
  "success": true,
  "message": "Booking created & broadcasted",
  "result": {
    "booking": {
      "_id": "65xyz...",
      "customerProfileId": "65customer...",
      "serviceId": "65service...",
      "technicianId": null,
      "baseAmount": 500,
      "address": "123 Main Street",
      "status": "broadcasted",
      "createdAt": "2026-01-14T..."
    },
    "broadcastCount": 3,
    "status": "broadcasted"
  }
}
```

---

### 2. View Available Jobs (Technician)
**Endpoint:** `GET /api/technician/jobs`  
**Auth:** Technician token required  
**Response:**
```json
{
  "success": true,
  "message": "Jobs fetched successfully",
  "result": [
    {
      "_id": "65broadcast...",
      "bookingId": {
        "_id": "65booking...",
        "serviceId": {
          "serviceName": "AC Repair"
        },
        "baseAmount": 500,
        "address": "123 Main Street",
        "scheduledAt": "2026-01-15T10:00:00Z",
        "status": "broadcasted"
      },
      "technicianId": "65tech...",
      "status": "sent",
      "createdAt": "2026-01-14T..."
    }
  ]
}
```

---

### 3. Accept/Reject Job (Technician)
**Endpoint:** `POST /api/technician/jobs/:id/respond`  
**Auth:** Technician token required  
**Params:** `:id` = JobBroadcast ID (not bookingId)  
**Body:**
```json
{
  "status": "accepted"  // or "rejected"
}
```
**Success Response (accepted):**
```json
{
  "success": true,
  "message": "Job accepted successfully",
  "result": {
    "_id": "65booking...",
    "customerProfileId": "65customer...",
    "serviceId": "65service...",
    "technicianId": "65tech...",
    "status": "accepted",
    "baseAmount": 500,
    "address": "123 Main Street"
  }
}
```
**Error Response (already taken):**
```json
{
  "success": false,
  "message": "Booking already taken",
  "result": {}
}
```

---

### 4. View My Bookings (Customer)
**Endpoint:** `GET /api/bookings/my`  
**Auth:** Customer token required  
**Response:**
```json
{
  "success": true,
  "message": "Bookings fetched",
  "result": [
    {
      "_id": "65booking...",
      "serviceId": {
        "serviceName": "AC Repair",
        "serviceCost": 500
      },
      "technicianId": {
        "firstName": "John",
        "lastName": "Doe",
        "mobileNumber": "9876543210"
      },
      "status": "accepted",
      "baseAmount": 500,
      "createdAt": "2026-01-14T..."
    }
  ]
}
```

---

## 🔌 Socket.IO Events

### Client → Server Events

#### 1. Join Technician Room
```javascript
socket.emit('join_technician', technicianProfileId);
```
**Purpose:** Subscribe to job broadcasts for this technician

---

#### 2. Join Customer Room
```javascript
socket.emit('join_customer', customerProfileId);
```
**Purpose:** Subscribe to job status updates for this customer

---

### Server → Client Events

#### 1. New Job Broadcast (Technician)
**Event:** `new_job_broadcast`  
**When:** New job matching technician's skills is created  
**Payload:**
```javascript
{
  bookingId: "65xyz...",
  serviceId: "65service...",
  serviceName: "AC Repair",
  baseAmount: 500,
  address: "123 Main Street",
  scheduledAt: "2026-01-15T10:00:00Z",
  timestamp: "2026-01-14T..."
}
```
**Usage:**
```javascript
socket.on('new_job_broadcast', (data) => {
  showNotification("New Job Available", data.serviceName);
  addJobToList(data);
});
```

---

#### 2. Job Taken (Technician)
**Event:** `job_taken`  
**When:** Another technician accepted the job  
**Payload:**
```javascript
{
  bookingId: "65xyz...",
  message: "This job has been accepted by another technician",
  timestamp: "2026-01-14T..."
}
```
**Usage:**
```javascript
socket.on('job_taken', (data) => {
  removeJobFromList(data.bookingId);
  showToast("Job no longer available");
});
```

---

#### 3. Job Accepted (Customer)
**Event:** `job_accepted`  
**When:** Technician accepts customer's booking  
**Payload:**
```javascript
{
  bookingId: "65xyz...",
  technicianId: "65tech...",
  status: "accepted"
}
```
**Usage:**
```javascript
socket.on('job_accepted', async (data) => {
  const booking = await fetchBookingDetails(data.bookingId);
  showTechnicianDetails(booking.technicianId);
  updateBookingStatus(data.bookingId, 'accepted');
});
```

---

## 📱 Frontend Implementation Examples

### React - Technician Dashboard

```jsx
import { useEffect, useState } from 'react';
import io from 'socket.io-client';

function TechnicianDashboard() {
  const [jobs, setJobs] = useState([]);
  const [socket, setSocket] = useState(null);
  const technicianId = getUserProfileId(); // from auth context

  useEffect(() => {
    // Connect to Socket.IO
    const newSocket = io('http://localhost:7372');
    setSocket(newSocket);

    // Join technician room
    newSocket.emit('join_technician', technicianId);

    // Listen for new jobs
    newSocket.on('new_job_broadcast', (data) => {
      setJobs(prev => [data, ...prev]);
      
      // Show browser notification
      if (Notification.permission === 'granted') {
        new Notification('New Job Available', {
          body: `${data.serviceName} - ₹${data.baseAmount}`,
          icon: '/job-icon.png'
        });
      }
    });

    // Listen for job taken
    newSocket.on('job_taken', (data) => {
      setJobs(prev => prev.filter(job => job.bookingId !== data.bookingId));
    });

    // Fetch initial jobs
    fetchJobs();

    return () => newSocket.disconnect();
  }, [technicianId]);

  const fetchJobs = async () => {
    const response = await fetch('/api/technician/jobs', {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    const data = await response.json();
    setJobs(data.result);
  };

  const handleAccept = async (jobBroadcastId) => {
    try {
      const response = await fetch(
        `/api/technician/jobs/${jobBroadcastId}/respond`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${getToken()}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status: 'accepted' })
        }
      );

      const data = await response.json();
      
      if (data.success) {
        alert('Job accepted! Customer details will be shown.');
        // Navigate to active jobs
      } else {
        alert(data.message); // "Booking already taken"
      }
    } catch (error) {
      alert('Failed to accept job');
    }
  };

  return (
    <div>
      <h1>Available Jobs ({jobs.length})</h1>
      {jobs.map(job => (
        <div key={job._id} className="job-card">
          <h3>{job.bookingId.serviceId.serviceName}</h3>
          <p>Amount: ₹{job.bookingId.baseAmount}</p>
          <p>Address: {job.bookingId.address}</p>
          <p>Scheduled: {new Date(job.bookingId.scheduledAt).toLocaleString()}</p>
          <button onClick={() => handleAccept(job._id)}>
            Accept Job
          </button>
        </div>
      ))}
    </div>
  );
}
```

---

### React - Customer Booking

```jsx
import { useEffect, useState } from 'react';
import io from 'socket.io-client';

function CustomerBooking() {
  const [booking, setBooking] = useState(null);
  const [socket, setSocket] = useState(null);
  const customerProfileId = getUserProfileId();

  useEffect(() => {
    const newSocket = io('http://localhost:7372');
    setSocket(newSocket);

    newSocket.emit('join_customer', customerProfileId);

    newSocket.on('job_accepted', async (data) => {
      // Fetch updated booking details
      const response = await fetch(`/api/bookings/${data.bookingId}`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      const bookingData = await response.json();
      setBooking(bookingData.result);
      
      // Show notification
      alert('Great news! A technician accepted your request!');
    });

    return () => newSocket.disconnect();
  }, [customerProfileId]);

  const handleCreateBooking = async (formData) => {
    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      
      if (data.success) {
        setBooking(data.result.booking);
        
        if (data.result.broadcastCount === 0) {
          alert('No technicians available right now. We\'ll notify you when someone comes online.');
        } else {
          alert(`Your request has been sent to ${data.result.broadcastCount} technicians!`);
        }
      }
    } catch (error) {
      alert('Failed to create booking');
    }
  };

  return (
    <div>
      {booking ? (
        <div className="booking-status">
          <h2>Booking Status: {booking.status}</h2>
          {booking.technicianId && (
            <div className="technician-info">
              <h3>Technician Details</h3>
              <p>Name: {booking.technicianId.firstName} {booking.technicianId.lastName}</p>
              <p>Phone: {booking.technicianId.mobileNumber}</p>
            </div>
          )}
        </div>
      ) : (
        <BookingForm onSubmit={handleCreateBooking} />
      )}
    </div>
  );
}
```

---

### Vue.js - Technician Jobs

```vue
<template>
  <div class="technician-dashboard">
    <h1>Available Jobs ({{ jobs.length }})</h1>
    
    <div v-for="job in jobs" :key="job._id" class="job-card">
      <h3>{{ job.bookingId.serviceId.serviceName }}</h3>
      <p>Amount: ₹{{ job.bookingId.baseAmount }}</p>
      <p>Address: {{ job.bookingId.address }}</p>
      <button @click="acceptJob(job._id)">Accept Job</button>
    </div>
  </div>
</template>

<script>
import io from 'socket.io-client';

export default {
  data() {
    return {
      jobs: [],
      socket: null
    };
  },
  mounted() {
    // Connect Socket.IO
    this.socket = io('http://localhost:7372');
    
    // Join room
    const technicianId = this.$store.state.user.profileId;
    this.socket.emit('join_technician', technicianId);
    
    // Listen for new jobs
    this.socket.on('new_job_broadcast', (data) => {
      this.jobs.unshift(data);
      this.$notify({
        title: 'New Job Available',
        message: data.serviceName,
        type: 'success'
      });
    });
    
    // Listen for job taken
    this.socket.on('job_taken', (data) => {
      this.jobs = this.jobs.filter(j => j.bookingId !== data.bookingId);
    });
    
    // Fetch initial jobs
    this.fetchJobs();
  },
  methods: {
    async fetchJobs() {
      const response = await this.$http.get('/api/technician/jobs');
      this.jobs = response.data.result;
    },
    async acceptJob(jobId) {
      try {
        const response = await this.$http.post(
          `/api/technician/jobs/${jobId}/respond`,
          { status: 'accepted' }
        );
        
        if (response.data.success) {
          this.$router.push('/active-jobs');
        }
      } catch (error) {
        this.$notify.error(error.response.data.message);
      }
    }
  },
  beforeUnmount() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
};
</script>
```

---

## 🔐 Authentication Headers

All API requests require authentication:

```javascript
headers: {
  'Authorization': 'Bearer YOUR_JWT_TOKEN',
  'Content-Type': 'application/json'
}
```

Get token from login response:
```javascript
// Login
const loginResponse = await fetch('/api/user/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ identifier, password })
});

const { token } = await loginResponse.json();
localStorage.setItem('token', token);
```

---

## ⚠️ Error Handling

### Common Error Responses

#### 401 Unauthorized
```json
{
  "success": false,
  "message": "Unauthorized",
  "result": {}
}
```

#### 403 Forbidden (Incomplete Profile)
```json
{
  "success": false,
  "message": "Please complete your profile first",
  "result": {
    "profileComplete": false
  }
}
```

#### 403 Forbidden (KYC Not Approved)
```json
{
  "success": false,
  "message": "Your KYC must be approved before accessing jobs",
  "result": {
    "kycStatus": "pending"
  }
}
```

#### 409 Conflict (Job Already Taken)
```json
{
  "success": false,
  "message": "Booking already taken",
  "result": {}
}
```

### Recommended Error Handling

```javascript
const acceptJob = async (jobId) => {
  try {
    const response = await fetch(`/api/technician/jobs/${jobId}/respond`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: 'accepted' })
    });

    const data = await response.json();

    if (!response.ok) {
      // Handle specific errors
      if (response.status === 403) {
        if (data.result.profileComplete === false) {
          navigate('/complete-profile');
        } else if (data.result.kycStatus !== 'approved') {
          navigate('/kyc-submission');
        }
      } else if (response.status === 409) {
        showToast('This job was already taken by another technician');
        removeJobFromList(jobId);
      } else {
        showToast(data.message || 'An error occurred');
      }
      return;
    }

    // Success
    showToast('Job accepted successfully!');
    navigate('/active-jobs');
  } catch (error) {
    showToast('Network error. Please check your connection.');
  }
};
```

---

## 📊 Status Values

### ServiceBooking.status
- `broadcasted` - Job sent to technicians
- `accepted` - Technician claimed the job
- `on_the_way` - Technician traveling
- `reached` - Technician arrived
- `in_progress` - Work started
- `completed` - Job finished
- `cancelled` - Job cancelled

### JobBroadcast.status
- `sent` - Notification sent
- `accepted` - This technician accepted
- `rejected` - Technician declined
- `expired` - Job taken by another

---

## 🧪 Testing Tips

### Test with Postman/Thunder Client

1. **Create booking:**
   ```
   POST http://localhost:7372/api/bookings
   Authorization: Bearer <customer-token>
   Content-Type: application/json
   
   {
     "serviceId": "...",
     "baseAmount": 500,
     "address": "Test Address"
   }
   ```

2. **View jobs:**
   ```
   GET http://localhost:7372/api/technician/jobs
   Authorization: Bearer <technician-token>
   ```

3. **Accept job:**
   ```
   POST http://localhost:7372/api/technician/jobs/<job-id>/respond
   Authorization: Bearer <technician-token>
   Content-Type: application/json
   
   {
     "status": "accepted"
   }
   ```

### Test Socket.IO with Browser Console

```javascript
// In browser console
const socket = io('http://localhost:7372');

socket.on('connect', () => {
  console.log('Connected:', socket.id);
  socket.emit('join_technician', 'YOUR_TECHNICIAN_ID');
});

socket.on('new_job_broadcast', (data) => {
  console.log('New job:', data);
});

socket.on('job_taken', (data) => {
  console.log('Job taken:', data);
});
```

---

## 📚 Additional Resources

- **Full Documentation:** [BROADCAST_SYSTEM.md](BROADCAST_SYSTEM.md)
- **Setup Guide:** [SETUP.md](SETUP.md)
- **Flow Diagram:** [FLOW_DIAGRAM.md](FLOW_DIAGRAM.md)
- **Socket.IO Docs:** https://socket.io/docs/v4/client-api/

---

**Version:** 1.0.0  
**Last Updated:** January 14, 2026  
**Status:** ✅ Ready for Integration
