# Day 8 Reflection

The most difficult concept in this course was understanding how to design a system that remains reliable when many users access it at the same time. I initially found it challenging to understand how databases, transactions, caching and application servers work together. I overcame this by breaking the system into smaller components and thinking through what happens when two users attempt the same action. Designing TicketHub helped me understand why database transactions, row-level locking and unique constraints are important for preventing two customers from purchasing the same seat.

Based on the feedback received on my capstone, I would improve the clarity and completeness of my system design, especially the explanation of how components communicate and how failures are handled. I would also strengthen my testing process by simulating concurrent requests, checking what happens when payment notifications are repeated, and measuring how the application performs under heavy traffic. This would help me identify problems before the system is used by real customers.

Next, I want to learn more about load testing, database optimization and deploying applications to the cloud. I would like to practise using tools that simulate thousands of users and help identify performance bottlenecks. I also want to improve my understanding of message queues, monitoring and automated deployment pipelines. These skills will help me build systems that are not only functional but also scalable, secure and dependable in real-world situations.

This assignment has taught me that good system design involves balancing speed, fairness, correctness and cost rather than focusing only on making an application work.
