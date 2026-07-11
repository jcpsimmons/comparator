import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import App from "../src/App";

test("renders the working board and first-load tasks without a browser backend", () => {
  const html = renderToStaticMarkup(<App />);

  expect(html).toContain("Priority Board");
  expect(html).toContain("Kanban board");
  expect(html).toContain("Clarify project scope");
  expect(html).toContain("Archive completed notes");
});
