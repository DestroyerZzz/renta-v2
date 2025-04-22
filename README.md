# Customer Product Dashboard

A modern, responsive web application built with Next.js and Supabase that allows companies to manage and display their products in a customizable dashboard format.

## Features

- **Authentication System**: Secure login and registration functionality
- **Product Management**: Create, read, update, and delete product records
- **Two-Section Display**: Organize products in left and right display sections
- **Tag Filtering**: Filter products by tags for convenient categorization
- **Public Profiles**: Share your product portfolio with others via a shareable public URL
- **Responsive Design**: Works on desktop and mobile devices
- **Real-time Updates**: Instant UI updates when data changes

## Tech Stack

- [![Next.js](https://img.shields.io/badge/-Next.js-000000?style=flat&logo=next.js)](https://nextjs.org/) Next.js 15
- [![React](https://img.shields.io/badge/-React-61DAFB?style=flat&logo=react&logoColor=black)](https://reactjs.org/) React 19
- [![TypeScript](https://img.shields.io/badge/-TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/) TypeScript
- [![Tailwind CSS](https://img.shields.io/badge/-Tailwind_CSS-38B2AC?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/) Tailwind CSS 4
- [![Supabase](https://img.shields.io/badge/-Supabase-3ECF8E?style=flat&logo=supabase&logoColor=white)](https://supabase.io/) Supabase (PostgreSQL, Authentication, Storage)
- [![Vercel](https://img.shields.io/badge/-Vercel-000000?style=flat&logo=vercel&logoColor=white)](https://vercel.com/) Vercel (recommended deployment)

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm or yarn
- Supabase account

### Environment Setup

1. Clone this repository:

```bash
git clone https://github.com/ninja225/product-management.git
cd product-management
```

2. Install dependencies:

```bash
npm install
# or
yarn install
```

3. Create a `.env.local` file in the project root with your Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Database Setup

1. Create a new Supabase project
2. Run the SQL scripts located in the `sql-supabase` directory to configure your tables and storage
3. Configure authentication providers in the Supabase dashboard

### Development

Start the development server with Turbopack:

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the result.

## Usage

### Authentication

- Users can register using email/password through the `/signup` route
- Login is available on the `/login` route
- After authentication, users are redirected to the dashboard

### Dashboard

- The main dashboard (`/dashboard`) displays products in a customizable grid
- Use the product form to add new products or edit existing ones
- Products can be filtered by tags or categories
- Profile information can be viewed and edited at `/dashboard/profile`

### Public Profiles

- Each user gets a public profile page at `/profile/[userId]`
- The public profile displays the user's products in a read-only format
- Users can share their profile URL with clients or stakeholders
- Products are displayed in the same left/right section layout as in the dashboard

## Project Structure

```
├── public/             # Static files
│   ├── file.svg        # SVG icons
│   ├── globe.svg
│   ├── logo.png        # App logo
│   ├── next.svg
│   ├── test-image.html
│   ├── vercel.svg
│   └── window.svg
├── sql-supabase/       # SQL scripts for database setup
│   ├── migration-add-title.sql    # Migration to add title field
│   ├── sql-public-profile.sql     # Public profile visibility settings
│   ├── sql-storage.sql            # Storage bucket configuration
│   └── sql-table.sql              # Main table definitions
├── src/
│   ├── app/            # Next.js App Router pages
│   │   ├── dashboard/           # User dashboard
│   │   │   └── profile/         # User profile editing
│   │   ├── login/               # Login page
│   │   ├── profile/             # Public profiles
│   │   │   └── [userId]/        # Dynamic route for user profiles
│   │   └── signup/              # Signup page
│   ├── components/     # React components
│   │   ├── auth/       # Authentication components
│   │   ├── layout/     # Layout components
│   │   ├── products/   # Product-related components
│   │   ├── profile/    # Profile components
│   │   └── ui/         # Reusable UI components
│   ├── types/          # TypeScript type definitions
│   │   └── database.ts # Database type definitions
│   ├── utils/          # Utilities and helper functions
│   │   ├── supabase-config.ts   # Supabase configuration
│   │   ├── supabase-server.ts   # Server-side Supabase client
│   │   └── supabase.ts          # Browser-side Supabase client
│   └── middleware.ts   # Next.js middleware for auth
├── eslint.config.mjs   # ESLint configuration
├── next.config.ts      # Next.js configuration
├── package.json        # Project dependencies
├── postcss.config.mjs  # PostCSS configuration
├── tsconfig.json       # TypeScript configuration
├── LICENSE             # MIT License file
└── README.md           # Project documentation
```

## Deployment

### Deploying on Vercel

The easiest way to deploy this application is using the [Vercel Platform](https://vercel.com/new).

1. Push your code to a Git repository (GitHub, GitLab, BitBucket)
2. Import the project to Vercel
3. Add your environment variables in the Vercel project settings
4. Deploy!

### Alternative Deployment Options

You can also deploy this Next.js application on any platform that supports Node.js:

1. Build the application:

```bash
npm run build
# or
yarn build
```

2. Start the server in production mode:

```bash
npm run start
# or
yarn start
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create a branch for your feature (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Next.js](https://nextjs.org/)
- [Supabase](https://supabase.io/)
- [Tailwind CSS](https://tailwindcss.com/)
- [React](https://reactjs.org/)
