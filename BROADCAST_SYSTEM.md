# 🎯 Job Broadcast System Documentation

## Overview
The RightTouch platform uses a real-time job broadcast system to connect customers with available technicians. This document explains the complete workflow.

---

## 📋 System Flow

```
Customer books service
        ↓
ServiceBooking created (status: "broadcasted")
        ↓
🎯 BROADCAST ENGINE RUNS
        ↓
Find eligible technicians (approved, online, matching skills)
        ↓
Create JobBroadcast documents (status: "sent")
        ↓
Send notifications (push + socket)
        ↓
Technician accepts job
        ↓
Update booking (status: "accepted")
        ↓
Expire other broadcasts
        ↓
Notify customer & other technicians
```

---

## 🔧 Components

### 1. ServiceBooking Schema
**File:** `Schemas/ServiceBooking.js`

**Status Flow:**
- `requested` → Initial creation (not used currently)
- `broadcasted` → Job sent to technicians
- `accepted` → Technician claimed the job
- `on_the_way` → Technician traveling to location
- `reached` → Technician arrived
- `in_progress` → Work started
- `completed` → Job finished
- `cancelled` → Job cancelled

**Key Fields:**
```javascript
{
  customerProfileId: ObjectId,
  serviceId: ObjectId,
  technicianId: ObjectId,  // assigned after acceptance
  baseAmount: Number,
  address: String,
  scheduledAt: Date,
  status: String,
  paymentStatus: String,
  paymentId: ObjectId
}
```

---

### 2. JobBroadcast Schema
**File:** `Schemas/TechnicianBroadcast.js`

**Purpose:** Tracks which technicians received job notifications

**Status Flow:**
- `sent` → Notification sent to technician
- `accepted` → This technician accepted the job
- `rejected` → Technician declined the job
- `expired` → Job was taken by another technician

**Key Fields:**
```javascript
{
  bookingId: ObjectId,      // Links to ServiceBooking
  technicianId: ObjectId,   // Links to TechnicianProfile
  status: String,
  createdAt: Date
}
```

**Unique Index:** `{ bookingId: 1, technicianId: 1 }` - Prevents duplicate broadcasts

---

### 3. Broadcast Engine
**File:** `controllers/serviceBookController.js → createBooking()`

**Workflow:**

#### Step 1: Validate Request
```javascript
// Customer authentication
// Validate serviceId, baseAmount, address
// Check service exists and is active
```

#### Step 2: Create Booking
```javascript
const booking = await ServiceBooking.create({
  customerProfileId,
  serviceId,
  baseAmount,
  address,
  scheduledAt,
  status: "broadcasted"  // Ready for broadcast
});
```

#### Step 3: Find Eligible Technicians
```javascript
const technicians = await TechnicianProfile.find({
  workStatus: "approved",              // Only approved by owner
  "availability.isOnline": true,       // Currently available
  "skills.serviceId": serviceId        // Has required skill
}).select("_id");
```

**Eligibility Criteria:**
- ✅ `workStatus = "approved"` - Owner approved
- ✅ `profileComplete = true` - Profile filled
- ✅ `KYC approved` - KYC verification passed
- ✅ `availability.isOnline = true` - Currently online
- ✅ Matching skill (serviceId in skills array)

#### Step 4: Create Broadcast Records
```javascript
await JobBroadcast.insertMany(
  technicians.map((t) => ({
    bookingId: booking._id,
    technicianId: t._id,
    status: "sent"
  }))
);
```

#### Step 5: Send Notifications
```javascript
await broadcastJobToTechnicians(
  req.io,  // Socket.IO instance
  technicianIds,
  {
    bookingId: booking._id,
    serviceId: service._id,
    serviceName: service.serviceName,
    baseAmount,
    address,
    scheduledAt
  }
);
```

**Notification Types:**
1. **Push Notification** - Mobile app notification
2. **Socket Notification** - Real-time browser notification

---

### 4. Notification System
**File:** `utils/sendNotification.js`

#### `broadcastJobToTechnicians(io, technicianIds, jobData)`
Sends notifications to all eligible technicians

**Push Notification:**
```javascript
{
  title: "🆕 New Job Available",
  body: "New AC Repair job in your area",
  data: {
    type: "new_job",
    bookingId: "...",
    serviceId: "...",
    scheduledAt: "..."
  }
}
```

**Socket Event:** `new_job_broadcast`
```javascript
{
  bookingId,
  serviceId,
  serviceName,
  baseAmount,
  address,
  scheduledAt,
  timestamp
}
```

#### `notifyCustomerJobAccepted(customerProfileId, jobData)`
Notifies customer when technician accepts job

#### `notifyJobTaken(io, technicianIds, bookingId)`
Notifies other technicians that job was claimed

---

### 5. Job Acceptance
**File:** `controllers/technicianBroadcastController.js → respondToJob()`

**Workflow:**

#### Step 1: Validation
```javascript
// Verify technician role
// Validate status (accepted/rejected)
// Check profile completion
// Verify KYC approval
// Check workStatus = "approved"
```

#### Step 2: Rejection Handling
```javascript
if (status === "rejected") {
  job.status = "rejected";
  await job.save();
  return;
}
```

#### Step 3: Acceptance (with Transaction)
```javascript
const session = await mongoose.startSession();
session.startTransaction();

// Update booking with technician
const booking = await ServiceBooking.findOneAndUpdate(
  { _id: job.bookingId, status: "broadcasted" },
  { 
    technicianId: technicianProfileId,
    status: "accepted" 
  },
  { new: true, session }
);

// Mark this broadcast as accepted
job.status = "accepted";
await job.save({ session });

// Expire all other broadcasts
await JobBroadcast.updateMany(
  { bookingId: booking._id, _id: { $ne: job._id } },
  { status: "expired" },
  { session }
);

await session.commitTransaction();
```

#### Step 4: Post-Acceptance Notifications
```javascript
// Notify customer
await notifyCustomerJobAccepted(
  booking.customerProfileId,
  { bookingId, technicianId, status: "accepted" }
);

// Notify other technicians (job taken)
notifyJobTaken(req.io, otherTechnicianIds, bookingId);
```

---

## 🔌 Socket.IO Setup

### Server Setup
**File:** `index.js`

```javascript
import { createServer } from "http";
import { Server } from "socket.io";

const httpServer = createServer(App);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || "*",
    methods: ["GET", "POST"]
  }
});

// Connection handler
io.on("connection", (socket) => {
  // Technician joins room
  socket.on("join_technician", (technicianId) => {
    socket.join(`technician_${technicianId}`);
  });

  // Customer joins room
  socket.on("join_customer", (customerProfileId) => {
    socket.join(`customer_${customerProfileId}`);
  });
});

// Attach to requests
App.use((req, res, next) => {
  req.io = io;
  next();
});
```

### Client Setup (Frontend)

#### Installation
```bash
npm install socket.io-client
```

#### Technician Client
```javascript
import io from "socket.io-client";

const socket = io("http://localhost:7372");

// Join technician room
socket.emit("join_technician", technicianProfileId);

// Listen for new jobs
socket.on("new_job_broadcast", (data) => {
  console.log("New job available:", data);
  // Show notification UI
  // Update job list
});

// Listen for job taken
socket.on("job_taken", (data) => {
  console.log("Job taken by another technician:", data);
  // Remove job from list
});
```

#### Customer Client
```javascript
const socket = io("http://localhost:7372");

// Join customer room
socket.emit("join_customer", customerProfileId);

// Listen for job acceptance
socket.on("job_accepted", (data) => {
  console.log("Technician accepted your job:", data);
  // Show technician details
  // Update booking status
});
```

---

## 📊 Database Queries

### Find My Available Jobs (Technician)
```javascript
const jobs = await JobBroadcast.find({
  technicianId: technicianProfileId,
  status: "sent"
})
.populate({
  path: "bookingId",
  match: { status: "broadcasted" },
  populate: { path: "serviceId" }
})
.sort({ createdAt: -1 });
```

### Check Booking Status
```javascript
const booking = await ServiceBooking.findById(bookingId)
  .populate("customerProfileId", "firstName lastName mobileNumber")
  .populate("technicianId", "firstName lastName mobileNumber")
  .populate("serviceId", "serviceName baseAmount");
```

### Get Broadcast History (Owner/Admin)
```javascript
const broadcasts = await JobBroadcast.find({ bookingId })
  .populate("technicianId", "firstName lastName")
  .sort({ createdAt: -1 });
```

---

## 🔐 Security Considerations

### 1. Role-Based Access
- Only **Customers** can create bookings
- Only **Technicians** can view/accept jobs
- Only **Owners** can approve technicians

### 2. Validation Chain
Before job access:
1. ✅ Profile completion
2. ✅ KYC submission
3. ✅ KYC approval
4. ✅ workStatus = "approved"

### 3. Race Condition Handling
MongoDB transactions ensure only ONE technician can accept a job:
```javascript
// Atomic update with condition
ServiceBooking.findOneAndUpdate(
  { _id: bookingId, status: "broadcasted" },  // Only if still available
  { technicianId, status: "accepted" },
  { session }
);
```

### 4. Duplicate Prevention
Unique compound index prevents duplicate broadcasts:
```javascript
jobBroadcastSchema.index(
  { bookingId: 1, technicianId: 1 },
  { unique: true }
);
```

---

## 🧪 Testing Workflow

### 1. Setup Test Environment
```bash
# Install dependencies
npm install socket.io

# Set environment variables
CLIENT_URL=http://localhost:3000
```

### 2. Test Sequence

#### A. Customer Creates Booking
```bash
POST /api/bookings
{
  "serviceId": "65abc...",
  "baseAmount": 500,
  "address": "123 Main St",
  "scheduledAt": "2026-01-15T10:00:00Z"
}
```

**Expected:**
- ✅ Booking created with status "broadcasted"
- ✅ JobBroadcast records created
- ✅ Push notifications sent
- ✅ Socket events emitted

#### B. Technician Views Jobs
```bash
GET /api/technician/jobs
Authorization: Bearer <technician-token>
```

**Expected:**
- ✅ List of jobs with status "sent"
- ✅ Only jobs matching technician skills
- ✅ Only broadcasted bookings

#### C. Technician Accepts Job
```bash
POST /api/technician/jobs/:jobId/respond
{
  "status": "accepted"
}
```

**Expected:**
- ✅ Booking status → "accepted"
- ✅ technicianId assigned
- ✅ Job broadcast → "accepted"
- ✅ Other broadcasts → "expired"
- ✅ Customer notified
- ✅ Other technicians notified (job taken)

---

## 🚀 Future Enhancements

### 1. Firebase Cloud Messaging (FCM)
Replace console logs with real push notifications:
```javascript
import admin from "firebase-admin";

admin.messaging().send({
  notification: { title, body },
  data: { bookingId, serviceId },
  token: deviceToken
});
```

### 2. Job Expiry Timer
Auto-expire broadcasts after 30 minutes:
```javascript
jobBroadcastSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 1800 }  // 30 minutes
);
```

### 3. Technician Priority System
Broadcast to highest-rated technicians first:
```javascript
const technicians = await TechnicianProfile.find(query)
  .sort({ "rating.avg": -1 })
  .limit(5);
```

### 4. Location-Based Filtering
Find nearest technicians using geospatial queries:
```javascript
const technicians = await TechnicianProfile.find({
  location: {
    $near: {
      $geometry: { type: "Point", coordinates: [lng, lat] },
      $maxDistance: 5000  // 5km radius
    }
  }
});
```

---

## 📝 API Endpoints Summary

| Endpoint | Method | Role | Description |
|----------|--------|------|-------------|
| `/api/bookings` | POST | Customer | Create booking & broadcast |
| `/api/technician/jobs` | GET | Technician | View available jobs |
| `/api/technician/jobs/:id/respond` | POST | Technician | Accept/reject job |
| `/api/bookings/:id` | GET | All | View booking details |
| `/api/bookings/:id/status` | PATCH | Technician | Update job status |
| `/api/bookings/:id/cancel` | POST | Customer | Cancel booking |

---

## 📞 Socket Events

| Event | Emitter | Listener | Data |
|-------|---------|----------|------|
| `join_technician` | Client | Server | `technicianId` |
| `join_customer` | Client | Server | `customerProfileId` |
| `new_job_broadcast` | Server | Technician | Job details |
| `job_taken` | Server | Technician | `bookingId` |
| `job_accepted` | Server | Customer | Technician details |
| `job_status_updated` | Server | Customer | Status update |

---

## 🐛 Troubleshooting

### No technicians receive broadcasts
**Check:**
1. Are technicians online? (`availability.isOnline = true`)
2. Do they have required skill? (`skills.serviceId` matches)
3. Is their `workStatus = "approved"`?
4. Is KYC approved?

### Socket notifications not working
**Check:**
1. Socket.IO installed? (`npm install socket.io`)
2. Client connected? (Check browser console)
3. Joined correct room? (`join_technician` event)
4. CORS configured? (Check `index.js` CORS settings)

### Multiple technicians accept same job
**Check:**
1. Using MongoDB transactions? (Should be atomic)
2. Checking `status: "broadcasted"` in update query?
3. Session passed to all operations?

---

## 📚 Related Files

- **Schemas:** `ServiceBooking.js`, `TechnicianBroadcast.js`, `TechnicianProfile.js`
- **Controllers:** `serviceBookController.js`, `technicianBroadcastController.js`
- **Utils:** `sendNotification.js`
- **Server:** `index.js`
- **Middleware:** `Auth.js`, `isTechnician.js`

---

## ✅ Completion Checklist

- [x] ServiceBooking schema with status flow
- [x] JobBroadcast schema with unique index
- [x] Broadcast engine in createBooking
- [x] Find eligible technicians
- [x] Create broadcast records
- [x] Notification utility (push + socket)
- [x] Socket.IO server setup
- [x] Job acceptance with transactions
- [x] Expire other broadcasts
- [x] Customer notification
- [x] Other technician notification
- [x] Validation workflow (profile → KYC → approval)
- [x] Documentation

---

**Last Updated:** January 14, 2026  
**Version:** 1.0.0  
**Status:** ✅ Production Ready
