# NoteFlow Frontend

React-based frontend for the NoteFlow application - a comprehensive note management web app.

## Tech Stack

- **Framework**: React 18+ with Vite
- **Styling**: Tailwind CSS (with dark mode support via `class` strategy)
- **Routing**: React Router v6+
- **State Management**: Zustand
- **Data Fetching**: TanStack React Query
- **HTTP Client**: Axios

## Project Structure

```
frontend/
├── src/
│   ├── api/
│   │   ├── axios.js           # Configured Axios instance with Sanctum support
│   │   └── authService.js     # Authentication API service methods
│   ├── components/
│   │   ├── ProtectedRoute.jsx  # Route guard for authenticated users
│   │   └── PublicRoute.jsx    # Route guard for unauthenticated users
│   ├── pages/
│   │   ├── Dashboard.jsx      # Main dashboard (placeholder)
│   │   ├── Login.jsx          # Login page with form validation
│   │   └── Register.jsx       # Registration page with form validation
│   ├── store/
│   │   └── useAuthStore.js    # Zustand store for authentication state
│   ├── App.jsx                # Main app with routing
│   ├── main.jsx               # Entry point
│   └── index.css              # Tailwind directives & custom styles
├── tailwind.config.js          # Tailwind configuration
├── postcss.config.js           # PostCSS configuration
├── vite.config.js              # Vite configuration with API proxy
└── package.json
```

## Setup & Development

### Prerequisites

- Node.js 18+
- Backend server running on `http://localhost:8000`

### Installation

```bash
# Install dependencies
npm install

# Start development server (runs on http://localhost:3000)
npm run dev
```

### Build

```bash
# Production build
npm run build

# Preview production build
npm run preview
```

## Configuration

### API Proxy

The Vite development server proxies `/api` and `/sanctum` requests to the Laravel backend at `http://localhost:8000`. This avoids CORS issues during local development.

Configure the proxy in `vite.config.js` if your backend runs on a different port.

### Tailwind Dark Mode

Dark mode is configured using the `class` strategy in `tailwind.config.js`. Apply the `dark` class to the `<html>` element to enable dark mode.

## Authentication Flow

### How It Works

1. **CSRF Protection**: Before any auth request, the app fetches a CSRF cookie from Laravel Sanctum (`/sanctum/csrf-cookie`).

2. **XSRF Token**: The Axios instance automatically extracts the XSRF-TOKEN from cookies and attaches it to request headers.

3. **State Management**: Authentication state is managed via Zustand store (`useAuthStore`).

4. **Route Protection**:
   - Unauthenticated users accessing `/` are redirected to `/login`
   - Authenticated users accessing `/login` or `/register` are redirected to `/`

### API Integration

```javascript
// Using the auth store in components
import useAuthStore from "./store/useAuthStore";

const MyComponent = () => {
  const login = useAuthStore((state) => state.login);
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);

  const handleLogin = async (credentials) => {
    const result = await login(credentials);
    if (result.success) {
      // Navigate to dashboard
    }
  };
};
```

## UI Features

### Responsive Design

- Mobile-first approach with Tailwind breakpoints (`sm:`, `md:`, `lg:`)
- Fully responsive auth forms that adapt to screen size
- Optimized touch targets for mobile devices

### Form Validation

- Client-side validation for password confirmation matching
- Server-side validation errors displayed under respective fields
- Real-time error clearing on field changes
- Loading states with spinners during API calls

### Accessibility

- Semantic HTML structure
- Proper label associations for form inputs
- Keyboard navigation support
- Focus ring visibility
- ARIA attributes where needed

## State Management

### useAuthStore

```javascript
{
  // State
  user: null,               // Current user object
  isAuthenticated: false,   // Authentication status
  isLoading: false,         // Loading state
  error: null,             // Error object with message & validation

  // Actions
  register: (credentials) => Promise<{ success, errors }>,
  login: (credentials) => Promise<{ success, errors }>,
  logout: () => Promise<void>,
  clearError: () => void,
}
```

## Next Steps

- [ ] Note CRUD UI (create, read, update, delete)
- [ ] Note grid/list view toggle
- [ ] Label management UI
- [ ] Search and filtering
- [ ] Note sharing UI
- [ ] PWA setup (service worker, offline support)
- [ ] Dark mode toggle implementation
