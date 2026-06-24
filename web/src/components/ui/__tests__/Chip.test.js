import { render, screen, fireEvent } from "@testing-library/react";
import Chip from "../Chip";

test("inactive chip has aria-pressed false and no gold marker", () => {
  render(<Chip onClick={() => {}}>Oud</Chip>);
  const chip = screen.getByRole("button", { name: /oud/i });
  expect(chip).toHaveAttribute("aria-pressed", "false");
  expect(chip.querySelector("[data-active-dot]")).toBeNull();
});

test("active chip persists a selected indicator", () => {
  render(<Chip active onClick={() => {}}>Oud</Chip>);
  const chip = screen.getByRole("button", { name: /oud/i });
  expect(chip).toHaveAttribute("aria-pressed", "true");
  expect(chip.className).toMatch(/luxury-gold/);
  expect(chip.querySelector("[data-active-dot]")).not.toBeNull();
});

test("chip fires onClick", () => {
  const onClick = jest.fn();
  render(<Chip onClick={onClick}>Oud</Chip>);
  fireEvent.click(screen.getByRole("button", { name: /oud/i }));
  expect(onClick).toHaveBeenCalledTimes(1);
});
