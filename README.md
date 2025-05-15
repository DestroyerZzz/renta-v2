# OpenMind

A modern, responsive web application built with Next.js and Supabase that helps users organize and share their interests in a visually appealing dashboard format with separate "Like" and "Dislike" sections.

## Features

- **Authentication System**: Secure email/password login and registration
- **Interest Management**: Create, update, and delete personal interests
- **Two-Section Display**: Organize interests in "Like" and "Dislike" sections
- **Tag System**: Categorize interests with hashtags for easy filtering
- **Tag Suggestions**: Get suggestions for existing tags as you type
- **Public Profiles**: Share your interests with others via a personalized URL
- **Customizable Profile**: Add a username, avatar, and cover image
- **Responsive Design**: Optimized for both desktop and mobile devices
- **Real-time Updates**: Instant UI refreshes when data changes

## Tech Stack

- [![Next.js](https://img.shields.io/badge/-Next.js-000000?style=flat&logo=next.js)](https://nextjs.org/) Next.js 14
- [![React](https://img.shields.io/badge/-React-61DAFB?style=flat&logo=react&logoColor=black)](https://reactjs.org/) React 18
- [![TypeScript](https://img.shields.io/badge/-TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/) TypeScript
- [![Tailwind CSS](https://img.shields.io/badge/-Tailwind_CSS-38B2AC?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/) Tailwind CSS
- [![Supabase](https://img.shields.io/badge/-Supabase-3ECF8E?style=flat&logo=supabase&logoColor=white)](https://supabase.io/) Supabase (PostgreSQL, Authentication, Storage)
- [![Lucide Icons](https://img.shields.io/badge/-Lucide_Icons-5468FF?style=flat&logo=feather&logoColor=white)](https://lucide.dev/) Lucide Icons
- [![Vercel](https://img.shields.io/badge/-Vercel-000000?style=flat&logo=vercel&logoColor=white)](https://vercel.com/) Vercel (recommended deployment)

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm or yarn
- Supabase account

### Environment Setup

1. Clone this repository:

```bash
git clone https://github.com/ninja225/open-mind.git
cd open-mind
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
2. Run the SQL scripts located in the `sql-supabase` directory to configure your database tables:
   - `sql-table.sql` - Creates the primary tables (products, profiles)
   - `sql-storage.sql` - Sets up storage buckets for image uploads
   - `sql-public-profile.sql` - Configures public profile settings
   - Additional migration scripts for updating schemas

### Development

Start the development server:

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Usage

### Authentication

- Users can register with email/password through the `/signup` route
- Login is available at the `/login` route
- After authentication, users are redirected to their personal dashboard

### Dashboard

- The main dashboard (`/dashboard`) displays interests in two sections: "Like" and "Dislike"
- Each section has its own "Add" button to create new interests
- Interests can be edited or deleted as needed
- The tag filter at the top allows users to filter interests by hashtag
- Each interest card displays:
  - Title
  - Optional description
  - Optional image
  - Hashtag for categorization

### Profile Management

- User profiles can be customized at `/dashboard/profile`
- Users can update:
  - Their full name
  - Username (used for shareable URLs)
  - Profile avatar
  - Cover image

### Public Profiles

- Each user gets a public profile at `/profile/[username]` or `/profile/[userId]`
- The public profile displays the user's interests in the same "Like"/"Dislike" format
- Interests can be filtered by tag on the public profile
- Users can share their profile link with others by clicking the "Share" button

## Project Structure

```
├── public/             # Static files and assets
│   └── assets/         # Application assets
│       ├── like.png    # Icon for "Like" section
│       └── dislike.png # Icon for "Dislike" section
├── sql-supabase/       # SQL scripts for database setup
├── src/
│   ├── app/            # Next.js App Router pages
│   │   ├── dashboard/           # User dashboard
│   │   │   └── profile/         # User profile editing
│   │   ├── login/               # Login page
│   │   ├── profile/             # Public profiles
│   │   │   └── [userId]/        # Dynamic route for user profiles
│   │   └── signup/              # Signup page
│   ├── components/     # React components
│   │   ├── auth/       # Authentication forms
│   │   ├── layout/     # Layout components
│   │   ├── products/   # Interest-related components
│   │   ├── profile/    # Profile components
│   │   ├── suggestions/# Tag and title suggestion components
│   │   └── ui/         # Reusable UI components
│   ├── types/          # TypeScript type definitions
│   └── utils/          # Utility functions and Supabase clients
```

## Deployment

### Deploying on Vercel

The easiest way to deploy this application is using the [Vercel Platform](https://vercel.com/new):

1. Push your code to a Git repository (GitHub, GitLab, BitBucket)
2. Import the project to Vercel
3. Add your environment variables in the Vercel project settings
4. Deploy!

### Alternative Deployment Options

You can also deploy the application on any platform that supports Node.js:

1. Build the application:

```bash
npm run build
# or
yarn build
```

2. Start the server:

```bash
npm start
# or
yarn start
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Next.js](https://nextjs.org/)
- [React](https://reactjs.org/)
- [Supabase](https://supabase.io/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Lucide Icons](https://lucide.dev/)
