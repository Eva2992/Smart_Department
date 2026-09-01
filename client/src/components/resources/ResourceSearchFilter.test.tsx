import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ResourceSearchFilter } from "./ResourceSearchFilter.js";
import type { ResourceQuery } from "../../types/resource.js";

describe("ResourceSearchFilter Component", () => {
  it("renders search input, filter chips, and dropdowns", () => {
    const onChangeMock = vi.fn();
    render(<ResourceSearchFilter query={{}} onChange={onChangeMock} />);

    expect(
      screen.getByPlaceholderText(/Search by title, course name, or topic/i)
    ).toBeInTheDocument();
    expect(screen.getByText("Lecture Slides")).toBeInTheDocument();
    expect(screen.getByText("Class Notes")).toBeInTheDocument();
    expect(screen.getByText("Past Papers")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /Filter by year/i })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /Filter by semester/i })).toBeInTheDocument();
  });

  it("triggers onChange when user types in search box", () => {
    const onChangeMock = vi.fn();
    render(<ResourceSearchFilter query={{}} onChange={onChangeMock} />);

    const input = screen.getByPlaceholderText(/Search by title/i);
    fireEvent.change(input, { target: { value: "Algorithms" } });

    expect(onChangeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        search: "Algorithms",
        page: 1,
      })
    );
  });

  it("toggles resource type filter chip", () => {
    const onChangeMock = vi.fn();
    const initialQuery: ResourceQuery = {};
    render(<ResourceSearchFilter query={initialQuery} onChange={onChangeMock} />);

    const slidesChip = screen.getByText("Lecture Slides");
    fireEvent.click(slidesChip);

    expect(onChangeMock).toHaveBeenCalledWith({
      type: "SLIDES",
      page: 1,
    });
  });

  it("deselects resource type filter when clicked again", () => {
    const onChangeMock = vi.fn();
    const initialQuery: ResourceQuery = { type: "SLIDES" };
    render(<ResourceSearchFilter query={initialQuery} onChange={onChangeMock} />);

    const slidesChip = screen.getByText("Lecture Slides");
    fireEvent.click(slidesChip);

    expect(onChangeMock).toHaveBeenCalledWith({
      page: 1,
    });
  });

  it("changes year filter via dropdown", () => {
    const onChangeMock = vi.fn();
    render(<ResourceSearchFilter query={{}} onChange={onChangeMock} />);

    const yearSelect = screen.getByRole("combobox", { name: /Filter by year/i });
    fireEvent.change(yearSelect, { target: { value: "2025" } });

    expect(onChangeMock).toHaveBeenCalledWith({
      year: 2025,
      page: 1,
    });
  });

  it("shows reset button when active filters exist and clears them on click", () => {
    const onChangeMock = vi.fn();
    render(
      <ResourceSearchFilter query={{ search: "AI", type: "NOTES" }} onChange={onChangeMock} />
    );

    const resetBtn = screen.getByRole("button", { name: /Reset/i });
    expect(resetBtn).toBeInTheDocument();

    fireEvent.click(resetBtn);
    expect(onChangeMock).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
    });
  });
});
