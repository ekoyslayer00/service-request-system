# Laboratory Exercise 3: Online Service Request Management System

## Problem Statement
Develop a web-based service request management system that allows users to create, view, update, and delete service requests. The system must support authentication, real-time data management, and role-based access control using Supabase as the backend.

## Actors & Use Case Diagram

```mermaid
graph TD
    A[User] -->|Login| B[Authentication System]
    A -->|Create Request| C[Request Management]
    A -->|View Requests| C
    A -->|Edit Request| C
    A -->|Delete Request| C
    A -->|Search/Filter| C
    A -->|View Dashboard| D[Dashboard]
    C -->|Update Status| E[Status Management]
