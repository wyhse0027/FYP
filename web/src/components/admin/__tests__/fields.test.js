import { render, screen, fireEvent } from "@testing-library/react";
import { AdminField, AdminToggle } from "../fields";

test("AdminField renders label and marks required", () => {
  render(<AdminField label="Name" required><input /></AdminField>);
  expect(screen.getByText("Name")).toBeInTheDocument();
  expect(screen.getByText("*")).toBeInTheDocument();
});

test("AdminToggle flips on click", () => {
  const onChange = jest.fn();
  render(<AdminToggle checked={false} onChange={onChange} label="Open 24h" />);
  fireEvent.click(screen.getByRole("switch"));
  expect(onChange).toHaveBeenCalledWith(true);
});
