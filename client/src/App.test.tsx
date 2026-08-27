import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.js";
import { App } from "./App.js";

describe("Frontend Client App Component", () => {
  it("renders Navbar and login page by default when unauthenticated", async () => {
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: /Welcome Back/i })).toBeInTheDocument();
    expect(screen.getByText(/CSE • Jahangirnagar University/i)).toBeInTheDocument();
  });
});
