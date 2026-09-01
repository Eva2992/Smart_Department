import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ResourceUploadForm } from "./ResourceUploadForm.js";
import * as resourceApi from "../../api/resource.js";

vi.mock("../../api/resource.js", () => ({
  uploadResourceApi: vi.fn(),
}));

describe("ResourceUploadForm Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders form title, metadata inputs, and dropzone", () => {
    render(<ResourceUploadForm />);

    expect(screen.getByText("Upload Study Resource")).toBeInTheDocument();
    expect(screen.getByLabelText(/Resource Title \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Course Name \/ Code \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Resource Category \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Semester \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Year \*/i)).toBeInTheDocument();
    expect(screen.getByText(/Drag and drop your file here/i)).toBeInTheDocument();
  });

  it("shows error when submitting without selecting a file", async () => {
    const { container } = render(<ResourceUploadForm />);

    const form = container.querySelector("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(
        screen.getByText(/Please select a document or resource file to upload/i)
      ).toBeInTheDocument();
    });
  });

  it("rejects files with unsupported extensions", async () => {
    render(<ResourceUploadForm />);

    const invalidFile = new File(["dummy content"], "bad-script.sh", {
      type: "application/x-sh",
    });

    const dropzone = screen.getByText(/Drag and drop your file here/i);
    fireEvent.drop(dropzone, {
      dataTransfer: {
        files: [invalidFile],
      },
    });

    await waitFor(() => {
      expect(screen.getByText(/Invalid file format/i)).toBeInTheDocument();
    });
  });

  it("uploads resource successfully and calls onSuccess", async () => {
    const onSuccessMock = vi.fn();
    vi.mocked(resourceApi.uploadResourceApi).mockResolvedValue({
      id: "res-new-1",
      title: "Lecture 1",
      courseName: "CSE 404",
      semesterLabel: "4th Year 2nd Semester",
      year: 2026,
      type: "SLIDES",
      fileUrl: "/uploads/resources/lecture1.pdf",
      fileSizeBytes: 1024,
      uploaderId: "cr-1",
      downloadCount: 0,
      createdAt: "2026-08-31T00:00:00.000Z",
    });

    render(<ResourceUploadForm onSuccess={onSuccessMock} />);
    const user = userEvent.setup();

    const validFile = new File(["valid pdf content"], "lecture1.pdf", {
      type: "application/pdf",
    });

    const dropzone = screen.getByText(/Drag and drop your file here/i);
    fireEvent.drop(dropzone, {
      dataTransfer: {
        files: [validFile],
      },
    });

    const courseInput = screen.getByLabelText(/Course Name \/ Code \*/i);
    await user.type(courseInput, "CSE 404");

    const submitBtn = screen.getByRole("button", { name: /Publish Resource/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(resourceApi.uploadResourceApi).toHaveBeenCalledTimes(1);
      expect(screen.getByText("Study resource uploaded successfully!")).toBeInTheDocument();
    });
  });
});
