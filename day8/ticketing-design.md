# TicketHub: System Design Document

## 1. Requirements

TicketHub is an online ticketing platform where users browse concerts and events, view available seats, reserve seats, pay securely and access their purchased tickets.

### 1.1 Functional requirements

- Users can register, log in and manage their accounts.
- Users can browse, search and view event details.
- Users can view a seating map and see which seats are available, held or sold.
- Users can temporarily hold available seats while completing checkout.
- Users can pay for their orders and receive confirmation after successful payment.
- Users can view their purchased tickets and order history.
- The system can release expired seat holds automatically.
- Administrators can create events, configure seats and manage ticket availability.

### 1.2 Non-functional requirements

**Speed:** Event pages and seat availability should load within two seconds under normal conditions. The system should handle sudden increases in traffic without becoming unavailable.

**Correctness:** A seat must never be sold to two customers. Payment confirmation, seat allocation and order status must remain consistent, even if requests are repeated or services fail.

**Fairness:** Customers should be processed through a fair, rate-limited virtual waiting room during popular sales. The system should not allow users to bypass the queue by repeatedly refreshing or sending excessive requests. Seats should be allocated only after a valid hold is acquired.

**Availability:** Browsing, checkout and ticket access should remain available during traffic spikes. If a component fails, the system should recover safely without issuing duplicate tickets.

**Security:** Passwords must be securely hashed, payment information must be handled by a trusted payment provider, and users must only access their own orders and tickets.

**Scalability:** The system should support two million registered users and scale its web and application services horizontally during popular sales.

**Data durability:** Confirmed orders and payment records must be stored reliably and recoverable after a service failure.

## 2. Traffic Estimates

### 2.1 Normal traffic

TicketHub has 2,000,000 registered users. On a normal day, 50,000 people visit and each views 10 pages.

Daily page views:

50,000 visitors × 10 pages = 500,000 page views per day.

Average page-view request rate:

500,000 ÷ 86,400 seconds = approximately 5.8 page views per second.

Normal ticket sales:

5,000 tickets per day ÷ 86,400 seconds = approximately 0.058 tickets per second, or one ticket every 17 seconds on average.

These are daily averages, not maximum traffic rates. Actual traffic will vary throughout the day. Each page view may also generate several API requests for event details, images and seat availability.

### 2.2 Big-sale traffic

For a popular concert, 200,000 people attempt to buy 20,000 seats in the first 10 minutes.

Average purchase attempts per second:

200,000 ÷ 600 seconds = approximately 333 attempts per second.

The sale has ten potential buyers for every available seat:

200,000 ÷ 20,000 = 10 buyers per seat.

If each buyer generates three to five API requests during the purchase journey, the system could receive approximately 1,000–1,667 requests per second from those journeys alone. This is a planning estimate, not a measured peak. Additional browsing traffic and retries may increase the load.

### 2.3 Comparison

| Metric                              |                    Normal day |                                  Big sale |
| ----------------------------------- | ----------------------------: | ----------------------------------------: |
| Visitors or purchase attempts       |           50,000 visitors/day |               200,000 attempts/10 minutes |
| Page views                          |                   500,000/day | Additional browsing and checkout requests |
| Average relevant request rate       |         5.8 page views/second |              333 purchase attempts/second |
| Estimated purchase-journey API load | Varies; much lower on average |               1,000–1,667 requests/second |
| Ticket demand                       |             5,000 tickets/day | 200,000 people competing for 20,000 seats |

The big sale concentrates a large amount of demand into a short period. The system must therefore be designed for peak traffic rather than relying on daily averages.

## 3. API Design

All endpoints use HTTPS and return JSON. Authenticated endpoints require a valid access token. Requests that create orders or initiate payments should support idempotency keys so that retries do not create duplicate purchases.

| Method and endpoint                 | Purpose                                                          |
| ----------------------------------- | ---------------------------------------------------------------- |
| GET /api/events                     | Browse, search and filter events.                                |
| GET /api/events/{eventId}           | View event details, venue and sale information.                  |
| GET /api/events/{eventId}/seats     | View seats, prices and current availability.                     |
| POST /api/events/{eventId}/holds    | Temporarily hold selected seats for the authenticated user.      |
| GET /api/holds/{holdId}             | Check hold status and expiry time.                               |
| DELETE /api/holds/{holdId}          | Release a hold before checkout.                                  |
| POST /api/orders                    | Create a pending order from a valid seat hold.                   |
| POST /api/orders/{orderId}/payments | Initiate payment through the payment provider.                   |
| POST /api/payments/webhook          | Receive verified payment-status notifications from the provider. |
| GET /api/me/tickets                 | View tickets belonging to the authenticated user.                |
| GET /api/me/orders                  | View the user's order history.                                   |

### Example: Holding seats

A customer sends a POST request containing the selected seat IDs. The server checks that the seats belong to the event, are available and have not already been held or sold.

If the transaction succeeds, the API returns a hold ID and expiry time, for example, five minutes from creation. If another customer has already acquired the seats, the request fails with HTTP 409 Conflict.

Seat availability displayed in the browser is only a snapshot. The server must always recheck availability when creating the hold.

### Example: Payment

The order is initially marked as pending. TicketHub requests payment through an external payment provider and verifies the result using a signed webhook or a trusted provider API.

Only after successful payment verification and confirmation of the seat allocation does the system mark the order as confirmed and issue the tickets. Repeated payment notifications must be handled idempotently.

## 4. Data Model

The main relational database tables are described below.

### 4.1 Users

| Column        | Description                         |
| ------------- | ----------------------------------- |
| user_id (PK)  | Unique user identifier.             |
| name          | Customer's name.                    |
| email         | Email address; unique and required. |
| password_hash | Securely hashed password.           |
| created_at    | Account creation timestamp.         |

### 4.2 Events

| Column         | Description                            |
| -------------- | -------------------------------------- |
| event_id (PK)  | Unique event identifier.               |
| title          | Event or concert name.                 |
| venue          | Event venue.                           |
| starts_at      | Event start date and time.             |
| sale_starts_at | Time tickets go on sale.               |
| status         | Draft, on sale, sold out or cancelled. |

### 4.3 Seats

Each seat belongs to an event. A seat may be available, held or sold.

| Column                         | Description                                       |
| ------------------------------ | ------------------------------------------------- |
| seat_id (PK)                   | Unique seat identifier.                           |
| event_id (FK)                  | References Events(event_id).                      |
| seat_label                     | Seat location, such as A-12.                      |
| price                          | Ticket price.                                     |
| status                         | Available, held or sold.                          |
| hold_expires_at                | Expiry time of the current hold, if any.          |
| held_by_user_id (FK, nullable) | References Users(user_id) for the current holder. |

A unique constraint on (event_id, seat_label) prevents duplicate seat definitions for the same event.

### 4.4 Orders

| Column          | Description                                                             |
| --------------- | ----------------------------------------------------------------------- |
| order_id (PK)   | Unique order identifier.                                                |
| user_id (FK)    | References Users(user_id).                                              |
| status          | Pending, confirmed, failed or cancelled.                                |
| total_amount    | Total order amount.                                                     |
| idempotency_key | Unique key used to prevent duplicate order creation for a user request. |
| created_at      | Order creation timestamp.                                               |

A unique constraint on (user_id, idempotency_key) prevents a retried request from creating another order for the same user.

### 4.5 Order_Items

This table connects orders to individual seats.

| Column             | Description                       |
| ------------------ | --------------------------------- |
| order_item_id (PK) | Unique order-item identifier.     |
| order_id (FK)      | References Orders(order_id).      |
| seat_id (FK)       | References Seats(seat_id).        |
| ticket_price       | Price recorded at purchase time.  |
| ticket_code        | Unique ticket identifier or code. |

A unique constraint on seat_id ensures that a seat cannot be allocated to multiple order items. If the system later supports multiple events sharing a physical seat definition, this constraint should be applied to the event-specific seat inventory record.

### 4.6 Payments

| Column             | Description                                    |
| ------------------ | ---------------------------------------------- |
| payment_id (PK)    | Unique payment identifier.                     |
| order_id (FK)      | References Orders(order_id).                   |
| provider_reference | Unique payment-provider transaction reference. |
| amount             | Amount charged.                                |
| status             | Pending, successful, failed or refunded.       |
| created_at         | Payment creation timestamp.                    |

### 4.7 Relationships

- One user can create many orders: Users 1-to-many Orders.
- One event has many seats: Events 1-to-many Seats.
- One user can temporarily hold multiple seats, while each seat has at most one active holder.
- One order can contain multiple order items: Orders 1-to-many Order_Items.
- Each order item references one seat. The unique seat constraint prevents a seat from appearing in multiple order items.
- One order can have payment attempts recorded in Payments, with provider references used to identify individual transactions.

### 4.8 Explicit SQL Schema and Constraints

The following PostgreSQL-style schema makes the primary keys, foreign keys, data types and uniqueness constraints explicit.

```sql
CREATE TABLE users (
    user_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE events (
    event_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title TEXT NOT NULL,
    venue TEXT NOT NULL,
    starts_at TIMESTAMPTZ NOT NULL,
    sale_starts_at TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL CHECK (
        status IN ('draft', 'on_sale', 'sold_out', 'cancelled')
    )
);

CREATE TABLE seats (
    seat_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    event_id BIGINT NOT NULL REFERENCES events(event_id),
    seat_label TEXT NOT NULL,
    price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
    status TEXT NOT NULL DEFAULT 'available'
        CHECK (status IN ('available', 'held', 'sold')),
    hold_id UUID,
    hold_expires_at TIMESTAMPTZ,
    held_by_user_id BIGINT REFERENCES users(user_id),

    UNIQUE (event_id, seat_label),

    CHECK (
        (status = 'available'
            AND hold_id IS NULL
            AND hold_expires_at IS NULL
            AND held_by_user_id IS NULL)
        OR
        (status = 'held'
            AND hold_id IS NOT NULL
            AND hold_expires_at IS NOT NULL
            AND held_by_user_id IS NOT NULL)
        OR
        (status = 'sold'
            AND hold_id IS NULL
            AND hold_expires_at IS NULL
            AND held_by_user_id IS NULL)
    )
);

CREATE TABLE orders (
    order_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(user_id),
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN (
            'pending', 'confirmed', 'failed', 'cancelled'
        )),
    total_amount NUMERIC(10,2) NOT NULL CHECK (total_amount >= 0),
    idempotency_key TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (user_id, idempotency_key)
);

CREATE TABLE order_items (
    order_item_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES orders(order_id),
    seat_id BIGINT NOT NULL REFERENCES seats(seat_id),
    ticket_price NUMERIC(10,2) NOT NULL CHECK (ticket_price >= 0),
    ticket_code UUID NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'confirmed', 'cancelled'))
);

CREATE UNIQUE INDEX one_active_order_item_per_seat
    ON order_items(seat_id)
    WHERE status IN ('pending', 'confirmed');

CREATE TABLE payments (
    payment_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES orders(order_id),
    provider_reference TEXT UNIQUE,
    idempotency_key TEXT NOT NULL UNIQUE,
    amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
    status TEXT NOT NULL CHECK (
        status IN ('pending', 'successful', 'failed', 'refunded')
    ),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX seats_event_status_idx
    ON seats(event_id, status);

CREATE INDEX seats_hold_expiry_idx
    ON seats(hold_expires_at)
    WHERE status = 'held';

CREATE INDEX orders_user_created_idx
    ON orders(user_id, created_at DESC);

CREATE INDEX order_items_order_idx
    ON order_items(order_id);

CREATE INDEX payments_order_idx
    ON payments(order_id);
```

**Why these constraints matter:**

- Primary keys uniquely identify records.
- Foreign keys prevent orders, seats and payments from referencing nonexistent records.
- `UNIQUE (event_id, seat_label)` prevents duplicate seat definitions within an event.
- The partial unique index permits at most one active or confirmed order item per seat. Cancelled items do not permanently prevent the seat from being sold again.
- Unique idempotency keys prevent duplicate orders and duplicate payment-operation records when clients retry requests.
- Indexes speed up event-seat lookups, hold-expiry processing and order-history queries.

These constraints complement application-level validation. The application must still perform valid state transitions inside transactions; a schema constraint alone cannot safely coordinate the complete payment workflow.

### 4.9 Hold Expiration and Deadlock Prevention

Every seat hold receives a unique `hold_id` and an expiry timestamp, such as five minutes after creation. The database clock, rather than the customer's browser clock, determines whether a hold has expired.

A background worker periodically finds expired holds and releases them. Before releasing a seat, it must lock the row and verify that the current `hold_id` still matches the expired hold and that the expiry time has passed. This prevents an old cleanup job from releasing a seat that has since been held by another customer.

New hold requests must also check for expired holds while locking the relevant seat rows. This ensures that an expired seat can be reclaimed even if the cleanup worker is delayed.

To reduce deadlocks:

1. Lock multiple seat rows in ascending `seat_id` order in every transaction.
2. Keep database transactions short and avoid network calls while holding seat locks.
3. Set sensible transaction and lock timeouts.
4. If a deadlock or serialization failure occurs, roll back the entire transaction and retry a small, bounded number of times using the same idempotency key.

The database must remain the authoritative source for seat ownership. A cache or queue must never independently decide that a seat is available.

## 5. Preventing Double-Booking

Preventing two customers from buying the same seat is a critical correctness requirement.

TicketHub uses database transactions, row-level locking, temporary holds and unique constraints. The browser's displayed availability is not trusted as proof that a seat is still available.

### Step 1: Start a transaction

When a customer requests a hold, the server starts a database transaction and locks the selected seat rows using a mechanism such as SELECT ... FOR UPDATE.

### Step 2: Check availability

While holding the locks, the server verifies that every requested seat is available or has a hold that has expired. It also checks that the seats belong to the correct event.

### Step 3: Create the hold atomically

If all requested seats are available, the server assigns the hold to the customer and sets an expiry time. All selected seats are updated in the same transaction.

If even one seat is unavailable, the transaction is rolled back and the customer must choose different seats.

### Step 4: Commit the transaction

The database commits the changes and releases the locks. If another customer requests the same seat concurrently, that request must wait for the first transaction and then recheck availability. It cannot successfully acquire the same active hold.
When a customer requests multiple seats, the application locks seat rows in ascending seat_id order to reduce deadlocks. If another customer requests the same seat, the database makes the second transaction wait or fail, depending on the locking and timeout behavior. After acquiring the lock, the second request must recheck the current seat status and hold expiry before proceeding. If a deadlock or serialization failure occurs, the transaction is rolled back and retried a limited number of times. A unique constraint remains the final safeguard against duplicate seat allocations.

### Step 5: Complete payment and confirm the order

The customer pays while the hold is valid. After the payment provider confirms successful payment, TicketHub uses a further transaction to verify the hold, create the order items and mark the seats as sold. It commits these changes together.

Payment processing itself occurs outside the database transaction because external payment services may take time to respond. If payment succeeds but the application temporarily fails, the system must reconcile the provider's confirmed payment with the pending order and safely complete or refund the purchase. It must never issue a second ticket.

### Step 6: Release expired holds

A background worker finds expired holds and releases seats that have not been sold. It must check the current hold identifier and expiry time before releasing a seat so that it cannot accidentally cancel a newer hold.

### Database safeguards

- Unique (event_id, seat_label) prevents duplicate seat records.
- Unique Order_Items.seat_id prevents a seat from being sold through two order items.
- Conditional updates and row locks prevent competing transactions from acquiring the same seat.
- Transactions ensure that multi-seat holds and order allocations succeed completely or not at all.
- Idempotency keys prevent retries from creating duplicate orders or payment operations.

Together, these mechanisms prevent double-booking even when thousands of customers compete for seats at the same time.

## 6. Architecture and Big-Sale Strategy

### 6.1 Architecture diagram

```text
             Customers / Browsers
                      |
                      v
          CDN + Static Asset Cache
                      |
                      v
          Load Balancer / API Gateway
                      |
                      v
             Virtual Waiting Room
                      |
                      v
          Application Service Cluster
             /         |          \
            v          v           v
       Event API   Seat/Order API  Ticket API
            |          |           |
            v          v           v
       Event Cache   Relational Database
                         |
                  +------+------+
                  |             |
                  v             v
             Seat Holds    Orders / Seats
                  |
                  v
          Background Job Queue
                  |
                  v
          Hold Expiry Workers

       Application Service Cluster
                  |
                  v
          Payment Provider
                  |
                  v
          Verified Payment Webhook
                  |
                  v
       Order Confirmation / Ticket Issuance
```

### 6.2 Component explanations

**CDN and static asset cache:** Serves images, stylesheets and other static content close to users. This reduces repeated requests to the application servers.

**Load balancer and API gateway:** Distributes requests across multiple application instances and applies authentication, rate limits and request validation.

**Virtual waiting room:** Controls how many customers enter the purchasing flow at a time. It should assign queue positions fairly, use signed queue tokens, and prevent customers from skipping ahead through repeated requests.

**Application service cluster:** Runs event browsing, seat selection, order creation and ticket retrieval. Multiple stateless instances can be added as traffic increases.

**Event cache:** Stores frequently accessed event details and other relatively stable information. Cache entries must be invalidated or updated when event details change. The cache must not be the authority for final seat allocation.

**Relational database:** Stores users, events, seats, holds, orders and payments. It enforces transactions, row locks and uniqueness constraints. Seat allocation is handled by the authoritative database rather than an eventually consistent cache.

**Background job queue and workers:** Processes expired holds, retries recoverable tasks, and supports reliable ticket issuance. Jobs must be idempotent so retries do not create duplicate tickets.

**Payment provider and webhook handler:** Processes payments externally and reports results to TicketHub. The webhook handler verifies authenticity and deduplicates repeated notifications.

### 6.3 Surviving the big sale

TicketHub should serve cached event pages to the large number of visitors who are only browsing. During the sale, a virtual waiting room limits the rate at which purchase requests reach the database.

Application instances can scale horizontally, while rate limits and bounded queues protect downstream services. The database should be monitored for lock contention, connection saturation and slow queries. Database indexes on event and seat identifiers support efficient lookups.

The waiting room should release customers into checkout at a controlled rate based on measured database capacity. If the system reaches capacity, it should return a clear waiting response rather than accepting unlimited work and failing unpredictably.

The system must also use monitoring, alerts, backups and tested recovery procedures. Traffic control may slow checkout during extreme demand, but it must never weaken seat-allocation safeguards.

### 6.4 Request Paths and Component Coordination

**Browsing:** The browser requests event details through the CDN, load balancer and application servers. The application checks the cache first and uses the read replica for suitable read-only queries when needed. Seat availability shown to customers is informational and may briefly be stale.

**Seat reservation:** The request passes through the virtual waiting room and application servers to the primary database. A transaction locks the requested seat rows, checks availability, creates the hold and commits before returning a successful response.

**Payment and confirmation:** The application creates a pending order and initiates payment without holding database seat locks. A verified payment webhook is authenticated and deduplicated. The application then uses a short transaction against the primary database to confirm the order, update seat status and create the ticket records consistently.

**Hold expiration:** A background worker processes expired holds. It locks candidate seats, verifies the hold ID and expiry using the database clock, and releases only seats that still belong to the expired hold.

**Failure recovery:** The system records payment and order states so that interrupted operations can be reconciled. Queue jobs and webhook handlers are idempotent, so retries do not create duplicate tickets. Monitoring alerts the team to growing queues, database contention, payment failures and delayed confirmations.

The waiting room and cache improve throughput, but neither replaces database transactions or uniqueness constraints. The primary database remains the authority for seat ownership.

## 7. Trade-offs

### Trade-off 1: Strong consistency versus speed

Using database transactions and row-level locks protects customers from double-booking, but concurrent requests for the same seat may wait. An eventually consistent cache could respond faster, but it cannot safely decide who owns a seat.

**Decision:** Use the relational database as the authority for seat allocation and use caching only for browsing and non-authoritative availability displays. Correctness is more important than shaving a few milliseconds off checkout.

### Trade-off 2: Fairness versus checkout throughput

A virtual waiting room reduces the risk of overload and helps customers enter the sale in a controlled order. However, customers may have to wait even when some seats remain available.

**Decision:** Use a transparent, rate-limited queue with clear position or waiting information. Release customers at a rate the purchasing system can handle, and avoid giving advantages to customers who repeatedly refresh.

### Trade-off 3: Short holds versus customer convenience

Short seat holds improve availability by returning abandoned seats quickly. However, a customer may lose a seat while completing a slow payment process.

**Decision:** Start with a five-minute hold, display the countdown clearly, and release expired holds safely. Monitor checkout completion times and adjust the duration based on evidence.

### Trade-off 4: Scaling the application versus database complexity

Adding application instances is relatively straightforward, but the database can become a bottleneck because seat allocation requires coordination. Introducing multiple independent seat databases could increase complexity and make consistency harder to guarantee.

**Decision:** Begin with a well-indexed relational database and horizontally scalable stateless services. Add database partitioning or more advanced scaling only when load tests and monitoring demonstrate the need.

## Conclusion

TicketHub must support normal browsing for two million registered users while protecting the purchasing process during unusually popular sales. Caching, horizontal application scaling and a virtual waiting room help manage traffic. Database transactions, locking, idempotency and uniqueness constraints protect seat ownership and order correctness. The design deliberately prioritizes trustworthy ticket allocation and fair access over accepting unlimited simultaneous checkout requests.
