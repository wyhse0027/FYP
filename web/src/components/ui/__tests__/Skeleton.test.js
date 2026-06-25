import { render, screen } from "@testing-library/react";
import Skeleton from "../Skeleton";
import Spinner from "../Spinner";

test("Skeleton renders a shimmer block with passed className", () => {
  const { container } = render(<Skeleton className="h-4 w-20" />);
  const el = container.firstChild;
  expect(el).toHaveClass("skel", "h-4", "w-20");
});

test("Spinner exposes an accessible loading role", () => {
  render(<Spinner />);
  expect(screen.getByRole("status", { name: /loading/i })).toBeInTheDocument();
});
