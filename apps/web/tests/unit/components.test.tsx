import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Button } from "@/components/ui/Button";
import { ChipGroup, type ChipOption } from "@/components/ui/ChipGroup";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TextField } from "@/components/ui/TextField";

describe("Button", () => {
  it("defaults to type=button so it never submits forms by accident", () => {
    render(<Button>Next</Button>);
    expect(screen.getByRole("button", { name: "Next" })).toHaveAttribute("type", "button");
  });

  it("is busy and disabled while loading", async () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Save
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe("TextField", () => {
  it("connects label, hint and error to the input", () => {
    render(<TextField label="Weight" unit="kg" hint="Morning weight" error="Required" />);
    const input = screen.getByLabelText("Weight");
    expect(input).toHaveAccessibleDescription("Morning weight Required");
    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  it("is not marked invalid without an error", () => {
    render(<TextField label="Height" inputMode="decimal" />);
    const input = screen.getByLabelText("Height");
    expect(input).not.toHaveAttribute("aria-invalid");
    expect(input).toHaveAttribute("inputmode", "decimal");
  });
});

const OPTIONS: ChipOption[] = [
  { value: "road", label: "Road" },
  { value: "hills", label: "Hills" },
  { value: "beach", label: "Beach" },
];

function Harness({ multiple }: { multiple?: boolean }) {
  const [value, setValue] = useState<string[]>([]);
  return (
    <ChipGroup
      legend="Environments"
      options={OPTIONS}
      value={value}
      onChange={setValue}
      {...(multiple ? { multiple } : {})}
    />
  );
}

describe("ChipGroup", () => {
  it("uses radio semantics for single select", async () => {
    render(<Harness />);
    const group = screen.getByRole("group", { name: "Environments" });
    expect(group).toBeInTheDocument();
    await userEvent.click(screen.getByRole("radio", { name: "Road" }));
    await userEvent.click(screen.getByRole("radio", { name: "Hills" }));
    expect(screen.getByRole("radio", { name: "Road" })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: "Hills" })).toBeChecked();
  });

  it("uses checkbox semantics for multi select and toggles off", async () => {
    render(<Harness multiple />);
    const road = screen.getByRole("checkbox", { name: "Road" });
    const beach = screen.getByRole("checkbox", { name: "Beach" });
    await userEvent.click(road);
    await userEvent.click(beach);
    expect(road).toBeChecked();
    expect(beach).toBeChecked();
    await userEvent.click(road);
    expect(road).not.toBeChecked();
  });

  it("marks selection with more than colour: a check icon appears", async () => {
    const { container } = render(<Harness multiple />);
    expect(container.querySelectorAll("svg")).toHaveLength(0);
    await userEvent.click(screen.getByRole("checkbox", { name: "Hills" }));
    expect(container.querySelectorAll("svg")).toHaveLength(1);
  });
});

describe("StatusBadge", () => {
  it.each([
    ["unranked", "Unranked"],
    ["provisional", "Provisional"],
    ["verified", "Verified"],
  ] as const)("renders %s as text", (status, label) => {
    render(<StatusBadge status={status} />);
    expect(screen.getByText(label)).toHaveAttribute("data-status", status);
  });
});

describe("screen states (spec §50)", () => {
  it("announces loading once, hiding skeleton blocks", () => {
    const { container } = render(<LoadingState label="Loading Stats" />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading Stats");
    expect(container.querySelector("[aria-hidden='true']")).not.toBeNull();
  });

  it("renders empty and error states with headings", () => {
    render(
      <>
        <EmptyState title="No Quest yet" />
        <ErrorState title="Couldn't load" />
      </>,
    );
    expect(screen.getByRole("heading", { name: "No Quest yet" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't load");
  });
});
