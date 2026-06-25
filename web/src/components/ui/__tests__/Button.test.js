import { render, screen, fireEvent } from "@testing-library/react";
import Button from "../Button";

test("primary button renders children and is clickable", () => {
  const onClick = jest.fn();
  render(<Button onClick={onClick}>Add to Cart</Button>);
  const btn = screen.getByRole("button", { name: /add to cart/i });
  expect(btn).toHaveClass("btn-lux");
  fireEvent.click(btn);
  expect(onClick).toHaveBeenCalledTimes(1);
});

test("loading button shows a spinner and is disabled", () => {
  render(<Button loading>Add to Cart</Button>);
  expect(screen.getByRole("status", { name: /loading/i })).toBeInTheDocument();
  expect(screen.getByRole("button")).toBeDisabled();
});

test("ghost variant does not use btn-lux", () => {
  render(<Button variant="ghost">View in AR</Button>);
  expect(screen.getByRole("button", { name: /view in ar/i })).not.toHaveClass("btn-lux");
});
