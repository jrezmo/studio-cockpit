import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StemEngine } from "@/features/stems/components/StemEngine";

describe("StemEngine", () => {
  it("falls back for invalid sample rate", async () => {
    const user = userEvent.setup();
    render(<StemEngine />);

    const sampleRateInput = screen.getByLabelText("Sample Rate");
    await user.clear(sampleRateInput);
    await user.type(sampleRateInput, "abc");

    expect(screen.getAllByText(/_Rate_/).length).toBeGreaterThan(0);
  });
});
