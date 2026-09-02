import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RoomSelector } from "../components/RoomSelector";
import * as scheduleApi from "../api/scheduleApi";

vi.mock("../api/scheduleApi", async () => {
  const actual = await vi.importActual<typeof scheduleApi>("../api/scheduleApi");
  return {
    ...actual,
    getRooms: vi.fn(),
  };
});

describe("RoomSelector Component", () => {
  const sampleRooms = [
    { id: "r-101", roomNumber: "R-101", type: "CLASSROOM" },
    { id: "r-201", roomNumber: "R-201", type: "COMPUTER_LAB" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render rooms from props and handle selection", async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();

    render(
      <RoomSelector
        value=""
        onChange={handleChange}
        rooms={sampleRooms}
      />
    );

    expect(screen.getByText("Select a room")).toBeInTheDocument();
    expect(screen.getByText("R-101 (CLASSROOM)")).toBeInTheDocument();
    expect(screen.getByText("R-201 (COMPUTER LAB)")).toBeInTheDocument();

    const select = screen.getByRole("combobox");
    await user.selectOptions(select, "r-101");

    expect(handleChange).toHaveBeenCalledWith("r-101");
  });

  it("should fetch rooms automatically if rooms prop is not provided", async () => {
    vi.mocked(scheduleApi.getRooms).mockResolvedValue(sampleRooms);

    render(
      <RoomSelector
        value=""
        onChange={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("R-101 (CLASSROOM)")).toBeInTheDocument();
    });
  });
});
