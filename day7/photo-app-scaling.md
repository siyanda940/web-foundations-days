# Day 7 Assignment: SnapShare Photo App Scaling Plan

## 1. Assumptions

SnapShare is a photo-sharing application where users upload photos and view a feed containing photos from people they follow.

The scaling plan uses the following assumptions:

- SnapShare has 10 million registered users.
- 10% of registered users are active each day.
- Each daily active user uploads one photo per day.
- Each daily active user views 50 feed pages per day.
- Each original photo has an average size of 2 MB.
- Each uploaded photo produces one thumbnail of 50 KB.
- A day contains 86,400 seconds, and a year contains 365 days.
- Peak traffic is five times the average traffic.
- Traffic is averaged across the full day for the calculations.
- Storage estimates exclude backups, replication, database records, and storage overhead.
- Each feed page view is counted as one request for a feed page, not as an individual photo request.

### Daily active users

Daily active users = Registered users × Daily active percentage

10,000,000 × 0.10 = **1,000,000 daily active users**

Therefore, SnapShare has 1 million daily active users.

## 2. Traffic and Storage Estimates

### Uploads per second

Daily uploads = 1,000,000 users × 1 photo

Daily uploads = 1,000,000 photos

Average uploads per second = 1,000,000 ÷ 86,400

**Average uploads = 11.57 photos per second**

Peak uploads = 11.57 × 5

**Peak uploads = approximately 57.87 photos per second**

### Feed views per second

Daily feed views = 1,000,000 users × 50 feed pages

Daily feed views = 50,000,000 feed pages

Average feed views per second = 50,000,000 ÷ 86,400

**Average feed views = approximately 578.70 per second**

Peak feed views = 578.70 × 5

**Peak feed views = approximately 2,893.52 per second**

### Photo storage per year

Photos uploaded per year = 1,000,000 × 365

Photos uploaded per year = 365,000,000 photos

Original photo storage:

365,000,000 × 2 MB = 730,000,000 MB = **730 TB per year**

Thumbnail storage:

365,000,000 × 0.05 MB = 18,250,000 MB = **18.25 TB per year**

Total annual photo storage:

730 TB + 18.25 TB = **748.25 TB per year**

This estimate uses decimal storage units and excludes backups, replicas, and other overhead. The system must plan for additional capacity as users and uploads grow.

## 3. Read-Heavy or Write-Heavy?

SnapShare is a **read-heavy system** because users view 50 feed pages per day but upload only one photo per day.

Across all daily active users, this produces 50 million feed page views compared with 1 million photo uploads per day.

The design should prioritise fast feed loading and efficient photo delivery. A CDN can deliver frequently accessed photos closer to users, a cache can store frequently requested feed data, and a database read replica can handle read queries without placing all the load on the primary database.

Uploads still need a reliable write path, and a queue can process thumbnail jobs asynchronously so that image processing does not slow down uploads.

## 4. Why Photos Should Not Be Stored Inside the Database

Original photos and thumbnails should be stored in **object storage**, while the database stores their metadata and object-storage keys or URLs.

Storing large photo files directly inside a database would increase database size, backup times, and storage costs. It would also make it harder to serve image files efficiently to millions of users.

Object storage is designed to store large files reliably and scale as the number of photos increases. A CDN can then cache and deliver these files efficiently.

The database should store information such as the photo ID, user ID, caption, upload time, object key, thumbnail key, and visibility settings.

## 5. Architecture Diagram

```text
                    +------------------+
                    |      Users       |
                    +------------------+
                             |
                             v
                    +------------------+
                    |       CDN        |
                    | Cached images    |
                    +------------------+
                             |
                             v
                    +------------------+
                    |  Load Balancer   |
                    +------------------+
                             |
               +-------------+-------------+
               |             |             |
               v             v             v
          +----------+  +----------+  +----------+
          | App      |  | App      |  | App      |
          | Server 1 |  | Server 2 |  | Server N |
          +----------+  +----------+  +----------+
               |             |             |
               +-------------+-------------+
                             |
                  +----------+----------+
                  |                     |
                  v                     v
           +-------------+      +----------------+
           | Cache       |      | Primary        |
           | Feed data   |      | Database       |
           +-------------+      +----------------+
                                       |
                                       v
                                +----------------+
                                | Read Replica   |
                                +----------------+

Photo upload and thumbnail processing:

          App Servers
               |
               v
       +------------------+
       | Object Storage   |
       | Original Photos  |
       | and Thumbnails   |
       +------------------+
               ^
               |
       +------------------+
       | Thumbnail Worker |
       +------------------+
               ^
               |
       +------------------+
       | Job Queue        |
       +------------------+
               ^
               |
       +------------------+
       | App Servers      |
       | Enqueue Job      |
       +------------------+
```

The diagram shows the main services and their relationships. In production, the application servers and cache would be deployed across multiple instances, and object storage would be accessed directly through authorised requests where appropriate.

## 6. What Each Component Does

1. **CDN:** Caches and delivers frequently requested photos from locations closer to users, reducing latency and the load on the origin storage.
2. **Load balancer:** Distributes incoming application requests across healthy app servers to prevent one server from becoming overloaded.
3. **App servers:** Handle application logic, authenticate users, validate uploads, generate feed responses, and coordinate database and storage operations.
4. **Cache:** Stores frequently accessed feed data and other reusable results in memory to reduce repeated database queries.
5. **Primary database:** Stores authoritative records such as users, photo metadata, captions, relationships, and feed-related information.
6. **Read replica:** Copies database changes from the primary database and handles read queries to reduce pressure on the primary.
7. **Object storage:** Stores original photo files and generated thumbnails without placing large binary files inside the database.
8. **Job queue:** Holds thumbnail-generation jobs so uploads do not have to wait for image processing to finish.
9. **Thumbnail worker:** Retrieves queued jobs, creates smaller image versions, uploads thumbnails to object storage, and updates their metadata in the database.

## 7. Step-by-Step Photo Upload Flow

1. A user selects a photo and submits it through the application.
2. The app server authenticates the user and validates the file type, file size, and upload permissions.
3. The original photo is uploaded to object storage, either through the app server or through a secure, time-limited upload URL.
4. The app server creates a database record containing the photo ID, owner, object key, upload time, and processing status.
5. The app server adds a thumbnail-generation job to the queue, including the photo ID and the original object's storage key.
6. The application confirms that the original photo has been accepted and records that thumbnail processing is pending.
7. A thumbnail worker retrieves the job from the queue and reads the original photo from object storage.
8. The worker resizes the photo and generates a thumbnail of approximately 50 KB.
9. The worker uploads the thumbnail to object storage and updates the database record with the thumbnail key and processing status.
10. The application can now use the original photo and thumbnail in feed responses, while the CDN caches and delivers images when requested.

If thumbnail generation fails, the job can be retried. The worker should handle duplicate jobs safely so that retries do not create inconsistent records.

## 8. Trade-Offs

### Trade-off 1: Faster reads versus cache freshness

Caching feed data improves response times and reduces database load. However, cached feeds may temporarily contain outdated information after a user uploads a photo or changes a follow relationship.

The design can use cache expiration and targeted invalidation to balance speed with freshness.

### Trade-off 2: Asynchronous processing versus immediate availability

Using a queue allows the app to accept uploads without waiting for thumbnails to be generated. However, the thumbnail may not be available immediately.

The application should track processing status and show a placeholder until the thumbnail is ready.

### Trade-off 3: Database read replicas versus consistency

Read replicas increase read capacity, but replication delay can mean that a recent upload does not immediately appear in a feed served by a replica.

The application can read recent changes from the primary database when immediate consistency is required.

### Trade-off 4: CDN caching versus storage and privacy control

A CDN reduces latency and origin traffic, but cached content can take time to expire or invalidate. Private photos also require appropriate access controls.

The system should use suitable cache policies, authorised delivery mechanisms, and invalidation rules for private or deleted photos.

## 9. Conclusion

SnapShare should use a scalable, read-optimised architecture built around a CDN, load balancer, multiple app servers, a cache, a primary database with a read replica, and object storage.

A queue and thumbnail worker allow image processing to happen asynchronously. Based on the stated assumptions, the system serves approximately 578.70 feed page views per second on average, with peak demand of approximately 2,893.52 views per second, and needs about 748.25 TB of new photo and thumbnail storage per year.

This architecture separates file storage from application metadata, improves feed performance, and provides a foundation for scaling as SnapShare grows.
