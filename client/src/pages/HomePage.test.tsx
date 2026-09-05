import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HomePage } from "./HomePage.js";
import { AuthContext } from "../context/authContextDef.js";
import type { AuthContextType } from "../types/auth.js";

const mockUnauthContext: AuthContextType = {
  user: null,
  tokens: null,
  isLoading: false,
  isAuthenticated: false,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  changePassword: async () => ({ success: true, message: "" }),
  forgotPassword: async () => ({ success: true, message: "" }),
  resetPassword: async () => ({ success: true, message: "" }),
};

const mockAuthContext: AuthContextType = {
  user: {
    id: "user-1",
    name: "Dr. Faculty",
    email: "faculty@juniv.edu",
    role: "TEACHER",
    isVerified: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  tokens: { accessToken: "abc", refreshToken: "xyz" },
  isLoading: false,
  isAuthenticated: true,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  changePassword: async () => ({ success: true, message: "" }),
  forgotPassword: async () => ({ success: true, message: "" }),
  resetPassword: async () => ({ success: true, message: "" }),
};

describe("HomePage Component", () => {
  it("renders the hero section with system name, positioning, and four roles", () => {
    render(
      <MemoryRouter>
        <AuthContext.Provider value={mockUnauthContext}>
          <HomePage />
        </AuthContext.Provider>
      </MemoryRouter>
    );

    // Hero title & positioning
    expect(
      screen.getByRole("heading", { level: 1, name: /Smart Department/i })
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(/Department of Computer Science & Engineering/i)[0]
    ).toBeInTheDocument();
    expect(screen.getAllByText(/Jahangirnagar University/i)[0]).toBeInTheDocument();

    // Four roles mentioned in Hero
    expect(screen.getAllByText(/Student/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/CR/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/Teacher/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/Admin/i)[0]).toBeInTheDocument();

    // Primary & Secondary CTAs for unauthenticated user
    const loginCta = screen.getAllByRole("link", { name: /Sign In|Log In/i })[0];
    expect(loginCta).toBeInTheDocument();
    expect(loginCta).toHaveAttribute("href", "/login");

    const exploreCta = screen.getByRole("link", { name: /Learn More|Explore Department/i });
    expect(exploreCta).toBeInTheDocument();
    expect(exploreCta).toHaveAttribute("href", "#about");
  });

  it("renders contextual CTA when user is authenticated", () => {
    render(
      <MemoryRouter>
        <AuthContext.Provider value={mockAuthContext}>
          <HomePage />
        </AuthContext.Provider>
      </MemoryRouter>
    );

    const dashboardCtas = screen.getAllByRole("link", { name: /Go to Dashboard|Open Dashboard/i });
    expect(dashboardCtas[0]).toBeInTheDocument();
    expect(dashboardCtas[0]).toHaveAttribute("href", "/dashboard");
  });

  it("renders the About the Department section with accurate SRS facts", () => {
    render(
      <MemoryRouter>
        <AuthContext.Provider value={mockUnauthContext}>
          <HomePage />
        </AuthContext.Provider>
      </MemoryRouter>
    );

    // Founding year & previous name
    expect(screen.getAllByText(/1991/i)[0]).toBeInTheDocument();
    expect(screen.getByText(/Department of Electronics and Computer Science/i)).toBeInTheDocument();
    expect(
      screen.getAllByText(/Faculty of Mathematical and Physical Sciences/i)[0]
    ).toBeInTheDocument();

    // Chairman and faculty count
    expect(screen.getAllByText(/Prof\. Dr\. Md\. Golam Moazzam/i)[0]).toBeInTheDocument();
    expect(screen.getByText(/31 faculty members/i)).toBeInTheDocument();
    expect(screen.getByText(/55\+ undergraduate batches/i)).toBeInTheDocument();

    // Degree programs
    expect(screen.getByText(/B\.Sc\. \(Honours\)/i)).toBeInTheDocument();
    expect(screen.getByText(/^M\.Sc\.$/i)).toBeInTheDocument();
    expect(screen.getByText(/Professional M\.Sc\. \(PMSCS\)/i)).toBeInTheDocument();
    expect(screen.getByText(/M\.Phil\./i)).toBeInTheDocument();
    expect(screen.getByText(/Ph\.D\./i)).toBeInTheDocument();
  });

  it("renders the Why Smart Department feature grid with SRS modules", () => {
    render(
      <MemoryRouter>
        <AuthContext.Provider value={mockUnauthContext}>
          <HomePage />
        </AuthContext.Provider>
      </MemoryRouter>
    );

    expect(screen.getByText(/Conflict-free scheduling/i)).toBeInTheDocument();
    expect(screen.getByText(/Role-based dashboards/i)).toBeInTheDocument();
    expect(screen.getByText(/CT scheduling & marks tracking/i)).toBeInTheDocument();
    expect(screen.getByText(/Assignment management/i)).toBeInTheDocument();
    expect(screen.getByText(/Resource sharing/i)).toBeInTheDocument();
    expect(screen.getByText(/Semester result publishing/i)).toBeInTheDocument();
    expect(screen.getByText(/In-app notifications/i)).toBeInTheDocument();
  });

  it("renders the By the Numbers stat strip", () => {
    render(
      <MemoryRouter>
        <AuthContext.Provider value={mockUnauthContext}>
          <HomePage />
        </AuthContext.Provider>
      </MemoryRouter>
    );

    expect(
      screen.getByText(/4 active Honours batches \+ 1 active Masters batch/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/8 managed rooms\/labs/i)).toBeInTheDocument();
    expect(screen.getByText(/55\+ batches produced/i)).toBeInTheDocument();
  });

  it("renders all 8 managed physical facilities and allows category filtering", () => {
    render(
      <MemoryRouter>
        <AuthContext.Provider value={mockUnauthContext}>
          <HomePage />
        </AuthContext.Provider>
      </MemoryRouter>
    );

    // 8 Room labels
    expect(screen.getByText(/R-101/i)).toBeInTheDocument();
    expect(screen.getByText(/R-102/i)).toBeInTheDocument();
    expect(screen.getByText(/R-103/i)).toBeInTheDocument();
    expect(screen.getByText(/R-201/i)).toBeInTheDocument();
    expect(screen.getByText(/R-203/i)).toBeInTheDocument();
    expect(screen.getByText(/R-302/i)).toBeInTheDocument();
    expect(screen.getByText(/R-105/i)).toBeInTheDocument();
    expect(screen.getByText(/R-202/i)).toBeInTheDocument();

    // Filter by Computer Labs
    const labFilter = screen.getByRole("tab", { name: /Computer Labs/i });
    fireEvent.click(labFilter);

    expect(screen.getByText(/R-201/i)).toBeInTheDocument();
    expect(screen.getByText(/R-203/i)).toBeInTheDocument();
    expect(screen.getByText(/R-302/i)).toBeInTheDocument();
    expect(screen.queryByText(/R-101/i)).not.toBeInTheDocument();

    // Filter by Specialized Lab
    const circuitFilter = screen.getByRole("tab", { name: /Specialized Lab/i });
    fireEvent.click(circuitFilter);
    expect(screen.getByText(/R-105/i)).toBeInTheDocument();
    expect(screen.queryByText(/R-201/i)).not.toBeInTheDocument();

    // Switch back to All
    const allFilter = screen.getByRole("tab", { name: /All/i });
    fireEvent.click(allFilter);
    expect(screen.getByText(/R-101/i)).toBeInTheDocument();
    expect(screen.getByText(/R-105/i)).toBeInTheDocument();
  });

  it("renders the Built for Every Role section with 4 role cards", () => {
    render(
      <MemoryRouter>
        <AuthContext.Provider value={mockUnauthContext}>
          <HomePage />
        </AuthContext.Provider>
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: /^Student$/i })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /^Class Representative \(CR\)$/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^Teacher$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^Admin$/i })).toBeInTheDocument();
  });

  it("renders the footer with login/register and links to public Resource and Result pages", () => {
    render(
      <MemoryRouter>
        <AuthContext.Provider value={mockUnauthContext}>
          <HomePage />
        </AuthContext.Provider>
      </MemoryRouter>
    );

    const resourceLinks = screen.getAllByRole("link", { name: /Resource/i });
    expect(resourceLinks.some((l) => l.getAttribute("href") === "/resources")).toBe(true);

    const resultLinks = screen.getAllByRole("link", { name: /Result/i });
    expect(resultLinks.some((l) => l.getAttribute("href") === "/results")).toBe(true);
  });
});
