import { render, screen, fireEvent } from "@testing-library/react";
import AdminConfirm from "../AdminConfirm";

test("confirm and cancel fire callbacks", () => {
  const onConfirm = jest.fn();
  const onCancel = jest.fn();
  render(
    <AdminConfirm open title="Delete" message="Sure?" onConfirm={onConfirm} onCancel={onCancel} />
  );
  fireEvent.click(screen.getByText("Delete", { selector: "button" }));
  expect(onConfirm).toHaveBeenCalled();
  fireEvent.click(screen.getByText("Cancel"));
  expect(onCancel).toHaveBeenCalled();
});
