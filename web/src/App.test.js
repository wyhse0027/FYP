import { render, screen } from "@testing-library/react";
import App from "./App";
import ProtectedRoute from "./components/ProtectedRoute";

const mockUseAuth = jest.fn();

jest.mock("./context/AuthContext", () => ({
  AuthProvider: ({ children }) => <div data-testid="auth-provider">{children}</div>,
  useAuth: () => mockUseAuth(),
}));

jest.mock("./lib/http", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  },
}));

jest.mock(
  "react-router-dom",
  () => ({
    Navigate: ({ to }) => <div data-testid="navigate" data-to={to} />,
    Routes: ({ children }) => <div data-testid="app-routes">{children}</div>,
    Route: ({ path }) => <div data-testid="app-route">{path || "index"}</div>,
    Link: ({ children, to }) => <a href={to}>{children}</a>,
    NavLink: ({ children, to }) => <a href={to}>{children}</a>,
    Outlet: () => <div data-testid="route-outlet" />,
    useLocation: () => ({ pathname: "/" }),
    useNavigate: () => jest.fn(),
    useParams: () => ({}),
    useSearchParams: () => [new URLSearchParams(), jest.fn()],
  }),
  { virtual: true }
);

beforeAll(() => {
  process.env.REACT_APP_API_BASE_URL = "http://127.0.0.1:8000/api";
});

beforeEach(() => {
  mockUseAuth.mockReturnValue({
    user: { is_staff: false },
    isAuthed: false,
    loadingUser: false,
  });
});

test("renders the application route shell", () => {
  render(<App />);

  expect(screen.getByTestId("auth-provider")).toBeInTheDocument();
  expect(screen.getByTestId("app-routes")).toBeInTheDocument();
  expect(screen.getAllByTestId("app-route").length).toBeGreaterThan(0);
});

test("protected routes wait while the user profile is loading", () => {
  mockUseAuth.mockReturnValue({
    user: null,
    isAuthed: true,
    loadingUser: true,
  });

  render(
    <ProtectedRoute adminOnly>
      <div>Admin content</div>
    </ProtectedRoute>
  );

  expect(screen.getByText(/loading/i)).toBeInTheDocument();
  expect(screen.queryByText("Admin content")).not.toBeInTheDocument();
  expect(screen.queryByTestId("navigate")).not.toBeInTheDocument();
});
