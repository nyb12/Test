# Ironfleet Web and App Proto

## Overview

This is a minimalist web application built with a React frontend and Express backend. The application follows a clean architecture with clear separation between client and server code. It utilizes Drizzle ORM for database interactions, shadcn/ui components for the UI, and a RESTful API structure.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

The frontend is built with React and uses the following key technologies:

- **React**: Core UI library
- **Wouter**: Lightweight router for navigation
- **Tailwind CSS**: Utility-first CSS framework for styling
- **shadcn/ui**: Component library built on Radix UI primitives
- **React Query**: For data fetching and state management

The frontend follows a component-based architecture with clear separation of concerns:
- UI components in `/client/src/components/ui`
- Layout components in `/client/src/components/layout`
- Page-specific components in `/client/src/components/home`
- Application pages in `/client/src/pages`
- Custom hooks in `/client/src/hooks`
- Utility functions in `/client/src/lib`

### Backend Architecture

The backend is built with Express.js and follows a modular structure:

- **Express.js**: Web server framework
- **Drizzle ORM**: Database ORM for PostgreSQL
- **Zod**: Schema validation

The server code is organized into:
- Main entry point: `/server/index.ts`
- API routes: `/server/routes.ts`
- Data storage interface: `/server/storage.ts`
- Vite middleware for development: `/server/vite.ts`

### Database Architecture

The application uses Drizzle ORM with a PostgreSQL database (via NeonDB):

- **Database Schema**: Defined in `/shared/schema.ts`
- **Database Migrations**: Managed with Drizzle Kit
- **Schema Validation**: Using Drizzle Zod integration

The schema currently includes a basic users table with id, username, and password fields.

## Key Components

### Frontend Components

1. **Layout Components**:
   - `Header`: Main navigation header with responsive design
   - `Footer`: Page footer with copyright and social links
   - `MobileMenu`: Responsive menu for mobile devices

2. **Page Components**:
   - `Home`: Main landing page
   - `NotFound`: 404 page

3. **Home Page Sections**:
   - `Hero`: Main hero section with call-to-action
   - `Features`: Feature highlights using cards
   - `About`: Information about the application
   - `CTA`: Call-to-action section

4. **UI Components**:
   Comprehensive set of UI components from shadcn/ui including buttons, cards, forms, etc.

### Backend Components

1. **API Routes**:
   - `/api/hello`: Simple hello world endpoint
   - `/api/health`: Health check endpoint

2. **Storage Interface**:
   - In-memory implementation of user storage
   - Extendable interface for future database implementations

## Data Flow

1. **Client-Server Communication**:
   - Frontend uses React Query to fetch data from API endpoints
   - API requests are made through the `apiRequest` utility function
   - Server responds with JSON data

2. **Data Persistence**:
   - User data is stored using the `IStorage` interface
   - Currently implemented with an in-memory storage solution
   - Ready to be extended with Drizzle ORM for PostgreSQL

3. **Authentication Flow** (to be implemented):
   - User schema is defined in `/shared/schema.ts`
   - Backend prepared for user storage and retrieval

## External Dependencies

### Frontend Dependencies
- **@radix-ui**: UI component primitives
- **@tanstack/react-query**: Data fetching and state management
- **class-variance-authority**: Component style variants
- **clsx**: Utility for conditional class names
- **wouter**: Lightweight routing
- **date-fns**: Date manipulation library

### Backend Dependencies
- **express**: Web server framework
- **drizzle-orm**: Database ORM
- **@neondatabase/serverless**: Serverless PostgreSQL client
- **connect-pg-simple**: PostgreSQL session store

## Deployment Strategy

The application is configured for deployment on Replit with:

1. **Build Process**:
   - `npm run build`: Builds both client and server
   - Client is built with Vite
   - Server is built with esbuild

2. **Production Start**:
   - `npm run start`: Starts the production server
   - Serves static assets from the built client

3. **Development Mode**:
   - `npm run dev`: Starts development server with hot reloading
   - Uses Vite middleware for client-side development

4. **Database Management**:
   - `npm run db:push`: Updates database schema using Drizzle Kit

## Getting Started

To start developing this application:

1. The database connection is configured using the `DATABASE_URL` environment variable
2. Run `npm run dev` to start the development server
3. Access the application at the provided port (default: 5000)
4. For database changes, update the schema in `/shared/schema.ts` and run `npm run db:push`

## Development Roadmap

The application has the basic structure in place, but still needs implementation of:

1. Complete user authentication system
2. PostgreSQL database integration using Drizzle ORM
3. Additional pages based on the router configuration
4. Backend API expansion for data operations