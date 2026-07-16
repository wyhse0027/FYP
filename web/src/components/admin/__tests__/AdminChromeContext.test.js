import { render, screen } from "@testing-library/react";
import {
  AdminChromeProvider,
  useAdminChrome,
  useAdminChromeState,
} from "../../../context/AdminChromeContext";

function Reader() {
  const { title } = useAdminChromeState();
  return <div data-testid="title">{title}</div>;
}
function Setter() {
  useAdminChrome({ title: "Products", actions: null, backTo: "/admin" });
  return null;
}

test("page sets chrome title and shell reads it", () => {
  render(
    <AdminChromeProvider>
      <Reader />
      <Setter />
    </AdminChromeProvider>
  );
  expect(screen.getByTestId("title").textContent).toBe("Products");
});
