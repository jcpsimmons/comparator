import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { STORAGE_KEY } from "./constants";

describe("Priority Board", () => {
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    localStorage.clear();
    consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
    cleanup();
  });

  it("launches to the task board and switches between views", async () => {
    const user = userEvent.setup();

    render(<App />);

    expect(screen.getByRole("heading", { name: "Priority Board" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Backlog" })).toBeTruthy();
    expect(screen.getByText("Clarify project scope")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Matrix" }));
    expect(screen.getByRole("heading", { name: "Do Now" })).toBeTruthy();
    expect(screen.getByText("Urgent and important")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "List" }));
    expect(screen.getByRole("table")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Default sort" })).toBeTruthy();
  });

  it("creates a task with full fields, searches it, and persists state", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Add Task" }));
    const dialog = screen.getByRole("dialog", { name: "Add task" });
    const form = within(dialog);
    expect(dialog).toBeTruthy();

    await user.type(form.getByLabelText("Title"), "Ship test task");
    await user.type(form.getByLabelText(/^Description/), "Exercise creation, search, and persistence.");
    await user.selectOptions(form.getByLabelText("Status"), "inProgress");
    await user.click(form.getByLabelText("Urgent"));
    await user.click(form.getByLabelText("Important"));
    fireEvent.change(form.getByLabelText(/^Due date/), { target: { value: "2026-07-08" } });
    await user.type(form.getByLabelText(/^Tags/), "Ops, ops, Launch");
    await user.click(form.getByRole("button", { name: "Save" }));

    expect(screen.getByText("Ship test task")).toBeTruthy();

    await user.type(screen.getByRole("searchbox", { name: "Search tasks" }), "ship test");
    expect(screen.getByText("7 tasks · 1 visible")).toBeTruthy();
    expect(screen.getByText("Ship test task")).toBeTruthy();

    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as { tasks?: Array<{ title: string; tags: string[] }> };
      expect(saved.tasks?.some((task) => task.title === "Ship test task" && task.tags.join(",") === "Ops,Launch")).toBe(true);
    });
  });
});
