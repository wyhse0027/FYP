import { render, screen } from "@testing-library/react";
import AdminToast from "../AdminToast";

test("renders message with polite live region", () => {
  render(<AdminToast message="Saved" type="success" onClose={() => {}} />);
  const el = screen.getByText("Saved");
  expect(el).toBeInTheDocument();
  expect(el.closest("[aria-live]").getAttribute("aria-live")).toBe("polite");
});
