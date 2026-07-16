import { render, screen, fireEvent } from "@testing-library/react";
import AdminModal from "../AdminModal";

test("hidden when closed, shown when open, Escape closes", () => {
  const onClose = jest.fn();
  const { rerender } = render(
    <AdminModal open={false} title="X" onClose={onClose}><p>Body</p></AdminModal>
  );
  expect(screen.queryByText("Body")).toBeNull();
  rerender(<AdminModal open title="X" onClose={onClose}><p>Body</p></AdminModal>);
  expect(screen.getByText("Body")).toBeInTheDocument();
  fireEvent.keyDown(document, { key: "Escape" });
  expect(onClose).toHaveBeenCalled();
});
