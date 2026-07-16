import { render, screen, fireEvent } from "@testing-library/react";
import Toolbar from "../Toolbar";

test("search calls onChange with input value", () => {
  const onChange = jest.fn();
  render(<Toolbar search={{ value: "", onChange, placeholder: "Search…" }} />);
  fireEvent.change(screen.getByPlaceholderText("Search…"), { target: { value: "abc" } });
  expect(onChange).toHaveBeenCalledWith("abc");
});
