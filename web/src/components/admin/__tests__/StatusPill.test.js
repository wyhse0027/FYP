import { render, screen } from "@testing-library/react";
import StatusPill, { bucketOf } from "../StatusPill";

test("maps statuses to buckets", () => {
  expect(bucketOf("TO_SHIP")).toBe("progress");
  expect(bucketOf("COMPLETED")).toBe("positive");
  expect(bucketOf("CANCELLED")).toBe("negative");
  expect(bucketOf("WHATEVER")).toBe("neutral");
});

test("renders humanized label", () => {
  render(<StatusPill status="TO_SHIP" />);
  expect(screen.getByText("TO SHIP")).toBeInTheDocument();
});
