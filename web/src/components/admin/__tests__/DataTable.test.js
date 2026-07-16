import { render, screen } from "@testing-library/react";
import DataTable from "../DataTable";

const cols = [{ label: "ID" }, { label: "Name" }];

test("shows empty node when isEmpty", () => {
  render(<DataTable columns={cols} isEmpty empty={<div>Nothing here</div>} />);
  expect(screen.getByText("Nothing here")).toBeInTheDocument();
});

test("renders header labels and rows", () => {
  render(
    <DataTable columns={cols}>
      <tr><td>1</td><td>Amelia</td></tr>
    </DataTable>
  );
  expect(screen.getByText("ID")).toBeInTheDocument();
  expect(screen.getByText("Amelia")).toBeInTheDocument();
});
