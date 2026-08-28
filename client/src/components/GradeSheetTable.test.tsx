import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { GradeSheetTable } from "./GradeSheetTable.js";

describe("GradeSheetTable Component", () => {
  const mockCourseMarks = [
    {
      courseCode: "CSE 401",
      courseTitle: "Distributed Systems",
      creditHours: 3.0,
      marks: 85,
      letterGrade: "A+",
      gradePoint: 4.0,
    },
    {
      courseCode: "CSE 402",
      courseTitle: "Compiler Design",
      creditHours: 3.0,
      marks: 77,
      letterGrade: "A",
      gradePoint: 3.75,
    },
    {
      courseCode: "CSE 408",
      courseTitle: "Project & Seminar",
      creditHours: 1.5,
      marks: 90,
      letterGrade: "A+",
      gradePoint: 4.0,
    },
  ];

  it("renders student information, course rows, and calculated total credits", () => {
    render(
      <GradeSheetTable
        studentName="Rahim Ahmed"
        universityId="2020101"
        courseMarks={mockCourseMarks}
        gpa={3.9}
        cgpa={3.85}
        semesterName="4th Year 1st Semester"
        batchName="52nd"
      />
    );

    expect(screen.getByText("Rahim Ahmed")).toBeInTheDocument();
    expect(screen.getByText("Roll: 2020101")).toBeInTheDocument();
    expect(screen.getByText(/4th Year 1st Semester/i)).toBeInTheDocument();

    // Verify course rows
    expect(screen.getByText("CSE 401")).toBeInTheDocument();
    expect(screen.getByText("Distributed Systems")).toBeInTheDocument();
    expect(screen.getByText("CSE 402")).toBeInTheDocument();
    expect(screen.getByText("Compiler Design")).toBeInTheDocument();

    // Verify GPA values
    expect(screen.getAllByText("3.90").length).toBeGreaterThan(0);
    expect(screen.getByText("3.85")).toBeInTheDocument();
    // Total credits: 3.0 + 3.0 + 1.5 = 7.5
    expect(screen.getByText("7.5")).toBeInTheDocument();
  });

  it("renders fail grade badge styling properly", () => {
    render(
      <GradeSheetTable
        universityId="2020102"
        courseMarks={[
          {
            courseCode: "CSE 101",
            courseTitle: "Structured Programming",
            creditHours: 3.0,
            marks: 35,
            letterGrade: "F",
            gradePoint: 0.0,
          },
        ]}
        gpa={0.0}
      />
    );

    expect(screen.getByText("CSE 101")).toBeInTheDocument();
    expect(screen.getByText("F")).toBeInTheDocument();
    expect(screen.getAllByText("0.00").length).toBeGreaterThan(0);
  });
});
