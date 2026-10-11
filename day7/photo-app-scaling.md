# SnapShare: Photo App Scaling Plan

## 1. Assumptions and Requirements

SnapShare is a photo-sharing application where users upload photos and view a feed of photos shared by people they follow. The design must support high read traffic, reliable photo uploads, fast feed loading and increasing storage requirements.

The following assumptions are used for all estimates:

- SnapShare has 10,000,000 registered users.
- 10% of registered users are active each day.
- Each daily active user uploads one photo per day.
- Each daily active user views 50 feed pages per day.
- Each original photo averages 2 MB.
- Each photo has one thumbnail averaging 50 KB.
- A year contains 365 days.
- All uploaded photos and thumbnails are retained for one year.
- For simplicity, 1 MB = 1,000 KB, 1 GB = 1,000 MB and 1 TB = 1,000 GB.
- Traffic estimates are averages across a full day unless a peak multiplier is specified.
- Storage estimates exclude backups, additional image sizes, database metadata, replication overhead and temporary files.

## 2. Traffic and Storage Estimates

### 2.1 Daily active users

Daily active users (DAU) are the number of unique users who use the application each day.

Formula:

Daily active users = Registered users × Daily activity percentage

Calculation:

10,000,000 × 10% = 1,000,000 daily active users.

Therefore, SnapShare must support approximately **1 million daily active users**.

### 2.2 Photo uploads per second

Each daily active user uploads one photo per day.

Daily uploads:

1,000,000 users × 1 photo = 1,000,000 uploads per day.

Average uploads per second:

1,000,000 ÷ 86,400 seconds = 11.57 uploads per second.

Therefore, SnapShare receives approximately **12 photo uploads per second on average**.

Actual upload traffic will fluctuate during the day, so the application should be tested above this average.

### 2.3 Feed views per second

Each daily active user views 50 feed pages per day.

Daily feed views:

1,000,000 users × 50 pages = 50,000,000 feed views per day.

Average feed views per second:

50,000,000 ÷ 86,400 = 578.7 feed views per second.

Therefore, the average load is approximately **579 feed views per second**.

For peak traffic, assume demand is five times the average:

Peak feed views per second:

578.7 × 5 = 2,893.5 feed views per second.

Therefore, SnapShare should plan for approximately **2,894 feed views per second at peak**.

This is the number of feed-page requests, not the total number of image requests. A feed page can display several photos, and each image may generate additional requests unless it is already cached.

### 2.4 Photo storage per year

Original photos:

1,000,000 uploads per day × 2 MB = 2,000,000 MB per day.

Daily original-photo storage is approximately 2,000 GB, or 2 TB.

Annual original-photo storage:

2,000,000 MB × 365 = 730,000,000 MB.

Using decimal storage units:

730,000,000 MB = 730,000 GB = **730 TB per year**.

Thumbnail storage:

1,000,000 thumbnails per day × 50 KB = 50,000,000 KB per day.

Annual thumbnail storage:

50,000,000 KB × 365 = 18,250,000,000 KB.

This equals 18,250 GB, or **18.25 TB per year**.

Total annual photo and thumbnail storage:

730 TB + 18.25 TB = **748.25 TB per year**.

SnapShare therefore needs approximately 748.25 TB of additional object storage for each year of uploads, before accounting for backups, replication, storage overhead and other image variants.

### 2.5 Summary of estimates

| Metric                          |   Estimate |
| ------------------------------- | ---------: |
| Registered users                | 10,000,000 |
| Daily active users              |  1,000,000 |
| Daily photo uploads             |  1,000,000 |
| Average uploads per second      |      11.57 |
| Daily feed views                | 50,000,000 |
| Average feed views per second   |      578.7 |
| Peak feed views per second (5×) |    2,893.5 |
| Annual original-photo storage   |     730 TB |
| Annual thumbnail storage        |   18.25 TB |
| Total annual image storage      |  748.25 TB |

These estimates provide a baseline for capacity planning. Before production, SnapShare should run load tests and measure actual request rates, image sizes, cache hit rates and storage growth.

## 3. Read-Heavy or Write-Heavy?

SnapShare is a **read-heavy system**.

Each daily active user uploads one photo but views 50 feed pages. This gives a ratio of approximately 50 feed views for every upload. Feed browsing is therefore much more frequent than photo creation.

This affects the design in several ways:

- Feed responses and popular thumbnails should be cached to reduce repeated database and storage requests.
- A read replica should handle suitable read-only database queries, reducing pressure on the primary database.
- A content delivery network (CDN) should serve cached images from locations close to users.
- Application servers should scale horizontally to handle increased feed traffic.
- Photo uploads and thumbnail creation should be processed asynchronously where possible so that image processing does not block the upload request.

The read replica and caches must not become the source of truth for writes. New photo metadata and ownership changes should be committed to the primary database, while stale feed or cache entries should be updated or invalidated as appropriate.

## 4. Why Photos Should Not Be Stored in the Database

SnapShare should store original photos and thumbnails in **object storage**, while storing photo metadata and relationships in a relational database.

Storing large image files directly inside the database would increase database size, backup and restore times, and the amount of storage work required for routine queries. It would also make it harder to deliver images efficiently through a CDN.

Object storage is designed for large files and can scale to hundreds of terabytes or more. It provides durable storage, while a CDN can cache frequently requested images closer to users.

The database should store information such as:

- Photo ID and owner ID.
- Object-storage key or file path.
- Caption and upload timestamp.
- Thumbnail object key.
- Visibility and moderation status.

The database stores the information needed to find and authorize access to an image; object storage stores the actual image bytes. Access to private photos must still be controlled using authorization checks and, where appropriate, short-lived signed URLs.

## 5. Architecture Diagram

```text
                  Users / Browsers
                         |
                         v
              +----------------------+
              |          CDN         |
              | Cached images and    |
              | static assets         |
              +----------------------+
                         |
                         v
              +----------------------+
              |    Load Balancer     |
              +----------------------+
                         |
                         v
              +----------------------+
              |   App Server Pool    |
              | Uploads, feeds, auth |
              +----------------------+
                    |           |
          Feed reads|           |Photo metadata writes
                    v           v
              +-----------+  +------------------+
              |   Cache   |  | Primary Database |
              | Feed data |  | Users, photos,   |
              | and keys  |  | follows, metadata|
              +-----------+  +------------------+
                    |                  |
                    |                  v
                    |         +------------------+
                    |         |   Read Replica   |
                    |         | Read-only queries|
                    |         +------------------+
                    |
                    v
             +------------------+
             | Object Storage   |
             | Original photos  |
             | and thumbnails   |
             +------------------+
                    ^
                    |
           +--------------------+
           | Thumbnail Worker   |
           | Resizes and encodes|
           +--------------------+
                    ^
                    |
           +--------------------+
           |   Job Queue        |
           | Pending thumbnail  |
           | tasks              |
           +--------------------+
                    ^
                    |
           +--------------------+
           | Upload App Server  |
           | Saves photo and    |
           | queues thumbnail   |
           +--------------------+
```

The diagram shows the main components and their roles. The thumbnail worker receives jobs from the queue and stores the generated thumbnail in object storage. The application records the resulting thumbnail key in the primary database. The CDN can then deliver the thumbnail to users.

## 6. Components and the Problems They Solve

1. **CDN:** Delivers cached photos, thumbnails and static assets close to users, reducing image-loading latency and origin traffic.

2. **Load balancer:** Distributes incoming requests across healthy application servers to avoid overloading a single server and to improve availability.

3. **Application servers:** Handle authentication, photo uploads, feed generation, authorization and requests to the database, cache and object storage.

4. **Cache:** Stores frequently requested feed data and metadata temporarily, reducing repeated database queries and improving response times.

5. **Primary database:** Reliably stores user accounts, follow relationships, photo metadata, ownership, visibility and other structured information.

6. **Read replica:** Serves suitable read-only queries so that feed-related database reads do not overwhelm the primary database, while accepting that replication lag can cause briefly stale results.

7. **Object storage:** Stores original photos and generated thumbnails durably and independently of the database, allowing image storage to grow without making database queries excessively large.

8. **Job queue:** Holds thumbnail-generation tasks until workers can process them, smoothing out upload bursts and allowing the upload request to finish without waiting for image processing.

9. **Thumbnail worker:** Retrieves queued jobs, generates smaller optimized images and writes the thumbnail files to object storage, retrying temporary failures safely.

## 7. Step-by-Step Photo Upload Flow

1. **User submits a photo:** The user selects a photo, adds a caption and presses Upload. The application authenticates the user and checks the file type, size and upload permissions.

2. **Upload is accepted:** The application creates a unique photo ID and stores the original image in object storage. In a larger deployment, the application can issue a short-lived signed upload URL so the client uploads directly to object storage without sending all image bytes through the application servers.

3. **Photo metadata is saved:** The application writes a metadata record to the primary database, including the photo ID, owner, object-storage key, caption, timestamp and processing status. The system must not show the photo as fully ready if the required original file or metadata write has failed.

4. **Thumbnail job is queued:** After the original image has been stored successfully, the application publishes a thumbnail-generation job containing the photo ID and object-storage key to the job queue. The queue should use durable messages where supported.

5. **Upload response is returned:** The application confirms that the upload has been accepted and can indicate that thumbnail processing is pending. It does not need to wait for the thumbnail worker to finish before returning the response.

6. **Worker processes the job:** A thumbnail worker reads the message, retrieves the original photo from object storage, resizes and compresses it, and generates a thumbnail.

7. **Thumbnail is stored:** The worker saves the thumbnail in object storage and updates the photo metadata in the primary database with the thumbnail key and a ready status.

8. **Feed becomes ready:** Once the photo is ready, it can appear in followers' feeds. The application invalidates or refreshes relevant feed caches as needed, and the CDN can cache the thumbnail when it is requested.

9. **Failures are handled safely:** If a worker fails temporarily, the job can be retried. Jobs should be idempotent so that processing the same message twice does not create incorrect metadata or duplicate logical photos. Repeated failures should be monitored and moved to a dead-letter queue for investigation.

## 8. Trade-offs

### Trade-off 1: Caching versus freshness

Caching feed data and thumbnails improves response times and reduces database load. However, users may briefly see an outdated feed or an old version of a photo after an update.

**Decision:** Use caching for high-volume feed and image reads, with suitable expiry times and invalidation when important content changes. Always enforce authorization independently of cached data.

### Trade-off 2: Asynchronous thumbnails versus immediate availability

Generating thumbnails in the background makes uploads faster and smooths out sudden bursts of work. However, a newly uploaded photo may not be immediately available in its optimized form.

**Decision:** Accept the upload after the original and required metadata are safely stored, show a processing state, and make the thumbnail available when the worker completes the job. Monitor queue delays and retry failed tasks.

### Trade-off 3: Read replicas versus perfectly fresh reads

A read replica reduces the load on the primary database, but replication is not always immediate. A user might briefly see stale feed metadata after uploading a photo.

**Decision:** Use the primary database for writes and for operations requiring the latest committed data. Use the replica for suitable feed and browsing queries, and route freshness-sensitive reads to the primary when necessary.

### Trade-off 4: Storage cost versus image quality

Keeping full-resolution originals and thumbnails improves user experience and preserves image quality, but it increases storage costs substantially as the user base grows.

**Decision:** Store originals and optimized thumbnails in object storage, apply lifecycle policies to temporary files, and evaluate archival or deletion policies for content that no longer needs to be retained. Do not delete originals solely to save space without considering user expectations and retention requirements.

## Conclusion

SnapShare has approximately one million daily active users and is read-heavy because users view 50 feed pages for every photo they upload. The estimates show about 579 average feed views per second, nearly 2,894 at peak, and approximately 748.25 TB of annual storage growth for originals and thumbnails.

A CDN, cache, load balancer, horizontally scalable application servers, read replica, object storage and asynchronous thumbnail queue allow the platform to handle growing traffic. Separating photo files from structured metadata keeps the database manageable, while background workers prevent thumbnail processing from slowing down uploads. The design balances speed, freshness, image quality, reliability and storage cost.
