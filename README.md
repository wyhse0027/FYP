GerainChan is implemented using a full-stack web architecture that integrates web-based augmented reality with a modern e-commerce system. The architecture separates frontend presentation, backend services, AR delivery, and media storage to ensure clarity and scalability.

**Technologies Used**
1. Frontend & AR Layer
Web-based frontend integrated with WebAR technologies (A-Frame / MindAR).
Handles user interaction, product browsing, and AR visualisation of perfume products.
AR experiences are accessed directly through the browser without native application installation.

2. Backend Layer
Developed using Python and Django REST Framework.
Provides RESTful APIs for user management, product management, AR metadata, cart, orders, payments, and reviews.
Manages authentication, authorization, and business logic.

3. Database & Data Management
Relational data models manage users, products, orders, payments, and AR references.
Ensures data consistency and transactional reliability.

4. AR Asset & Media Storage
Cloudflare R2 is used to store AR assets such as 3D models and related media.
Improves performance by decoupling large files from backend processing.

5. Deployment & Environment
Backend services are containerized using Docker.
Supports consistent deployment and future scalability.



Author
WOO YING HUI
Bachelor of Computer Science (Software Engineering)
Final Year Project – Universiti Malaysia Sabah
Supervised by Assoc. Prof. Dr Ng Giap Weng
