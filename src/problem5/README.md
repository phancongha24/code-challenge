# Problem 5: CRUD Server with Express & TypeScript

A RESTful API server built with Express.js and TypeScript that provides CRUD (Create, Read, Update, Delete) operations
for managing resources.

## Features

- **Full CRUD Operations**: Create, Read, Update, Delete resources
- **TypeScript**: Type-safe development with full TypeScript support
- **SQLite Database**: Persistent storage with SQLite
- **Express.js**: Fast, unopinionated web framework
- **Input Validation**: Request validation and error handling
- **Filtering & Pagination**: Advanced querying capabilities
- **Security**: Helmet.js for security headers
- **CORS**: Cross-origin resource sharing enabled

## Prerequisites

- Node.js
- npm package manager

## Installation

1. Navigate to the problem5 directory:

```bash
cd src/problem5 && npm install
```

## Configuration

The server uses the following default configuration:

- **Port**: 3000 (configurable via `PORT` environment variable)
- **Database**: SQLite file (`resources.db`)
- **Environment**: Development mode by default

## Running the Application

### Development Mode

```bash
npm run dev
```

This starts the server with hot-reloading using `ts-node-dev`.

### Production Mode

```bash
npm run build
npm start
```

This compiles TypeScript to JavaScript and runs the compiled version.

## API Endpoints

### Base URL

```
http://localhost:3000
```

### Resources

#### 1. Get All Resources

```http
GET /api/resources
```

**Query Parameters:**

- `category` (string, optional): Filter by category
- `status` (string, optional): Filter by status (`active` or `inactive`)
- `name` (string, optional): Filter by name (partial match)
- `limit` (number, optional): Limit number of results
- `offset` (number, optional): Offset for pagination

**Example:**

```bash
curl "http://localhost:3000/api/resources?category=electronics&status=active&limit=10"
```

#### 2. Get Resource by ID

```http
GET /api/resources/:id
```

**Example:**

```bash
curl "http://localhost:3000/api/resources/123e4567-e89b-12d3-a456-426614174000"
```

#### 3. Create Resource

```http
POST /api/resources
```

**Request Body:**

```json
{
  "name": "Example Resource",
  "description": "This is an example resource",
  "category": "electronics",
  "status": "active"
}
```

**Example:**

```bash
curl -X POST http://localhost:3000/api/resources \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Laptop",
    "description": "High-performance laptop",
    "category": "electronics",
    "status": "active"
  }'
```

#### 4. Update Resource

```http
PUT /api/resources/:id
```

**Request Body (all fields optional):**

```json
{
  "name": "Updated Resource Name",
  "description": "Updated description",
  "category": "updated-category",
  "status": "inactive"
}
```

**Example:**

```bash
curl -X PUT http://localhost:3000/api/resources/123e4567-e89b-12d3-a456-426614174000 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Laptop",
    "status": "inactive"
  }'
```

#### 5. Delete Resource

```http
DELETE /api/resources/:id
```

**Example:**

```bash
curl -X DELETE http://localhost:3000/api/resources/123e4567-e89b-12d3-a456-426614174000
```

## Response Format

All API responses follow this format:

### Success Response

```json
{
  "success": true,
  "data": {
    /* resource data */
  },
  "count": 1
  // for list endpoints
}
```

### Error Response

```json
{
  "success": false,
  "error": "Error message",
  "details": "Detailed error information"
}
```

## Resource Schema

```typescript
interface Resource {
    id: string;              // UUID
    name: string;            // Resource name
    description: string;     // Resource description
    category: string;        // Resource category
    status: 'active' | 'inactive';  // Resource status
    created_at: string;      // ISO timestamp
    updated_at: string;      // ISO timestamp
}
```

## Database

The application uses SQLite for data persistence. The database file (`resources.db`) is automatically created in the
project root when the server starts.

### Database Schema

```sql
CREATE TABLE resources
(
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    description TEXT NOT NULL,
    category    TEXT NOT NULL,
    status      TEXT NOT NULL CHECK (status IN ('active', 'inactive')),
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
);
```

## Development

### Project Structure

```
src/problem5/
├── src/
│   ├── types/
│   │   └── index.ts          # TypeScript interfaces
│   ├── database/
│   │   └── index.ts          # Database service
│   ├── routes/
│   │   └── resources.ts      # Resource routes
│   └── index.ts              # Main server file
├── package.json
├── tsconfig.json
└── README.md
```
