# SHZ ERP System

A comprehensive Enterprise Resource Planning (ERP) system built with modern web technologies. This system helps businesses manage inventory, sales, finance, tasks, and user permissions through an intuitive interface.

## Features

- **Dashboard**: Overview of key metrics and recent activities
- **Inventory Management**: Track stock, divided items, and inspection processes
- **Sales Management**: Customer management, order processing, and invoicing
- **Finance Module**: Accounts receivable/payable, cash management, and financial reporting
- **Task Management**: Kanban board with drag-and-drop functionality and calendar view
- **User Management**: Role-based access control with granular permissions
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 19, TypeScript
- **UI Components**: Shadcn UI, Radix UI, Tailwind CSS
- **State Management**: React Context, SWR for data fetching
- **Authentication**: NextAuth.js
- **Database**: Prisma ORM with your preferred database
- **Styling**: Tailwind CSS with custom theming

## Getting Started

### Prerequisites

- Node.js 18.17 or later
- pnpm (recommended) or npm
- Database (PostgreSQL recommended)

### Installation

#### Option 1: Standard Setup

1. Clone the repository:

```bash
git clone https://github.com/fajarprasetia/shzerp.git
cd shzerp
```

2. Install dependencies:

```bash
pnpm install
```

3. Set up environment variables:

Create a `.env.local` file in the root directory with the following variables:

```
DATABASE_URL="postgresql://username:password@localhost:5432/erp"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"
```

4. Run database migrations:

```bash
pnpm prisma migrate dev
```

5. Seed the database with initial data:

```bash
pnpm prisma db seed
```

6. Start the development server:

```bash
pnpm dev
```

#### Option 2: Docker Setup

1. Clone the repository:

```bash
git clone https://github.com/fajarprasetia/shzerp.git
cd shzerp
```

2. Start the application using Docker Compose:

```bash
docker-compose up -d
```

This will start:
- The Next.js application on port 3000
- PostgreSQL database on port 5432
- pgAdmin (database management tool) on port 5050

3. Run database migrations and seed data:

```bash
docker-compose exec app npx prisma migrate deploy
docker-compose exec app npx prisma db seed
```

4. Access the application at http://localhost:3000

5. Access pgAdmin at http://localhost:5050 (login with admin@example.com / admin)

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## Project Structure

```
├── app/                  # Next.js App Router
│   ├── (main)/           # Main application routes
│   │   ├── dashboard/    # Dashboard module
│   │   ├── inventory/    # Inventory management
│   │   ├── sales/        # Sales management
│   │   ├── finance/      # Finance module
│   │   ├── tasks/        # Task management
│   │   └── users/        # User management
│   ├── api/              # API routes
│   ├── auth/             # Authentication pages
│   ├── components/       # Server components
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utility functions
│   └── providers/        # Context providers
├── components/           # Client components
│   └── ui/               # Reusable UI components
├── prisma/               # Database schema and migrations
├── public/               # Static assets
└── types/                # TypeScript type definitions
```

## Key Features

### Inventory Management

- Stock tracking with barcode scanning
- Divided roll management
- Quality inspection process

### Sales Module

- Customer management with WhatsApp integration
- Order processing with inventory checks
- Invoice generation and payment tracking

### Finance Module

- Accounts receivable/payable
- Cash management
- General ledger and financial reporting

### Task Management

- Kanban board with drag-and-drop functionality
- Calendar view with task indicators
- Task assignment and priority management

### User Management

- Role-based access control
- Permission management
- User profiles

## Deployment

### Standard Deployment

The application can be deployed to any platform that supports Next.js applications, such as Vercel, Netlify, or a custom server.

For production deployment, build the application:

```bash
pnpm build
```

Then start the production server:

```bash
pnpm start
```

### Docker Deployment

For production deployment with Docker:

1. Build and start the containers:

```bash
docker-compose -f docker-compose.yml up -d --build
```

2. Run database migrations:

```bash
docker-compose exec app npx prisma migrate deploy
```

3. Seed the database (if needed):

```bash
docker-compose exec app npx prisma db seed
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- [Next.js](https://nextjs.org/)
- [React](https://reactjs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Shadcn UI](https://ui.shadcn.com/)
- [Radix UI](https://www.radix-ui.com/)
- [Prisma](https://www.prisma.io/)
- [NextAuth.js](https://next-auth.js.org/)

Fetch update by:
pnpm build
then:
systemctl restart erp.service
check is running 'active':
systemctl is-active erp.service